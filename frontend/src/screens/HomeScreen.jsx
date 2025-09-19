import { useEffect, useState, useRef, useCallback } from 'react'
import { View, ImageBackground, Text, Pressable, Image, StyleSheet, Animated, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import AvatarByBMI from '../components/AvatarByBMI'
import { initCalorieData, setTargetCalories } from '../utils/calorieStorage'
import { useFonts } from 'expo-font'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../config/api'
import { calcBMI, classifyBMI } from '../utils/bmi'
import { useI18n } from '../i18n/I18nContext'

/* ===== UI CONST ===== */
const ICON_SIZE = 72
const FONT = 'DungGeunMo'
const BOX_HEIGHT = Platform.select({ ios: 220, android: 170 })
const BOX_FONT = 18
const BOX_PAD = Platform.select({ ios: 20, android: 14 })

/* ===== Gauge (left green / right red) ===== */
function CalorieGauge({ current, target }) {
  const [width, setWidth] = useState(0)
  const greenAnim = useRef(new Animated.Value(0)).current
  const redAnim   = useRef(new Animated.Value(0)).current

  const ratio = target > 0 ? current / target : 0

  const nextGreen = Math.max(0, Math.min(ratio, 1)) * width
  const nextRed   = ratio > 1 ? Math.min(ratio - 1, 1) * width : 0

  useEffect(() => {
    Animated.timing(greenAnim, { toValue: nextGreen, duration: 600, useNativeDriver: false }).start()
    Animated.timing(redAnim,   { toValue: nextRed,   duration: 600, useNativeDriver: false }).start()
  }, [nextGreen, nextRed])

  return (
    <View style={styles.gaugeWrapper}>
      <Text style={styles.goalText}>GOAL.</Text>

    <View style={styles.gaugeShadowWrapper}>
      <View
        style={styles.gaugeContainer}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {/* Green: left -> right */}
        <Animated.View
          style={[
            styles.gaugeFillBase,
            {
              left: 0,
              width: greenAnim,
              backgroundColor: 'rgba(34,197,94,0.8)',
            },
          ]}
        />

        {/* Red: right -> left */}
        <Animated.View
          style={[
            styles.gaugeFillBase,
            {
              right: 0,
              width: redAnim,
              backgroundColor: 'rgba(239,68,68,0.8)',
            },
          ]}
        />

        <View style={styles.gaugeTextWrap}>
          <Text style={styles.gaugeText} allowFontScaling={false}>
            {current}/{target} kcal
          </Text>
        </View>
      </View>
      </View>
    </View>
  )
}

/* ===== Avatar ===== */
function EvolvingAvatar({ category, size }) {
  const [displayCat, setDisplayCat] = useState(category)
  const [isEvolving, setIsEvolving] = useState(false)
  const fade = useRef(new Animated.Value(1)).current
  const scale = useRef(new Animated.Value(1)).current
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (category === displayCat) return
    setIsEvolving(true)
    fade.setValue(1)
    scale.setValue(1)
    pulse.setValue(0)

    Animated.parallel([
      Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.sequence([
        Animated.loop(
          Animated.sequence([
            Animated.timing(fade, { toValue: 0.25, duration: 150, useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true })
          ]),
          { iterations: 4 }
        ),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: 260, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true })
        ])
      ])
    ]).start(() => {
      setDisplayCat(category)
      fade.setValue(1)
      scale.setValue(1)
      pulse.setValue(0)
      setIsEvolving(false)
    })
  }, [category, displayCat, fade, scale, pulse])

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] })
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0.3, 0] })

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {isEvolving && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: (size * 0.92) / 2,
            backgroundColor: '#7dd3fc',
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }]
          }}
        />
      )}

      <View style={{
        shadowColor: '#000',
        shadowOffset: { width: 7, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
        elevation: 12,
      }}>
        {isEvolving ? (
          <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
            <AvatarByBMI category={displayCat} size={size} />
          </Animated.View>
        ) : (
          <AvatarByBMI category={displayCat} size={size} />
        )}
      </View>
    </View>
  )
}

function dayKey(d = new Date()) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  return t.toISOString().slice(0, 10)
}

/* ===== Home ===== */
export default function HomeScreen({ route }) {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const { user } = useAuth()
  const { t } = useI18n()
  const [category, setCategory] = useState('normal')
  const [target, setTarget] = useState(1200)
  const [current, setCurrent] = useState(0)
  const [eggCount, setEggCount] = useState(0)
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })

  const loadLocal = useCallback(async () => {
    const { target, current } = await initCalorieData(user?.id)
    setTarget(target)
    setCurrent(current)
  }, [user?.id])

  const syncFromProfile = useCallback(async () => {
    try {
      const prof = await apiGet('/api/profile')
      const tcal = prof?.targetCalories
      if (typeof tcal === 'number' && tcal > 0) {
        await setTargetCalories(tcal, user?.id)
        setTarget(tcal)
      }
      const w = prof?.weight
      const h = prof?.height
      if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
        const bmi = calcBMI(w, h)
        const cat = classifyBMI(bmi)
        setCategory(cat)
      }
    } catch {}
  }, [user?.id])

  const loadAll = useCallback(async () => {
    await loadLocal()
    await syncFromProfile()
  }, [loadLocal, syncFromProfile])

  useEffect(() => { loadAll() }, [loadAll])

  useFocusEffect(
    useCallback(() => {
      loadAll()
      if (route?.params?.addedCalories) {
        setCurrent(prev => prev + route.params.addedCalories)
      }
    }, [loadAll, route?.params?.addedCalories])
  )

  if (!fontsLoaded) return null

  const IconLabeled = ({ iconSrc, label, to }) => (
    <Pressable onPress={() => nav.navigate(to)}  style={styles.iconWrapper}>
      <Image source={iconSrc} style={styles.iconImage} />
      <Text style={styles.labelText} numberOfLines={1} allowFontScaling={false}>{label}</Text>
    </Pressable>
  )

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
      {/* 상단: 상점 배지 */}
      <Pressable
        onPress={() => nav.navigate('Store')}
        style={[
          styles.storeBadge,
          { top: insets.top + 8 }
        ]}
        hitSlop={8}
      >
        <Text style={styles.storeBadgeEmoji}>💰</Text>
        <Text style={styles.storeBadgeText}>상점</Text>
      </Pressable>

      <View style={[styles.topContainer, { marginTop: insets.top + 56 }]}>
        <Pressable style={styles.box} onPress={() => nav.navigate('DietLog')}>
          <Text style={styles.boxText} allowFontScaling={false}>{t('HOME_MEAL')}</Text>
        </Pressable>
        <Pressable style={styles.box} onPress={() => nav.navigate('Data')}>
          <Text style={styles.boxText} allowFontScaling={false}>{t('HOME_DATA')}</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {/* 게이지 */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 150 + 260, alignItems: 'center' }}>
          <CalorieGauge current={current} target={target} />
        </View>

        {/* 캐릭터 */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 150, alignItems: 'center' }}>
          <EvolvingAvatar category={category} size={260} />
        </View>

        {/* 이스터에그 */}
        <Pressable
          onPress={() => {
            setEggCount(c => {
              const n = c + 1
              if (n >= 5) {
                nav.navigate('HealthyCatch')
                return 0
              }
              return n
            })
          }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 150, height: 260 }}
        />

        {/* 하단 네비 */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
            <IconLabeled iconSrc={require('../../assets/icons/profile.png')} label={t('PROFILE')} to="Profile" />
            <IconLabeled iconSrc={require('../../assets/icons/quest.png')}   label={t('BURNING')} to="Burning" />
            <IconLabeled iconSrc={require('../../assets/icons/quest.png')}   label={t('RANKING')} to="Ranking" />
            <IconLabeled iconSrc={require('../../assets/icons/setting.png')} label={t('SETTINGS')} to="Settings" />
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  topContainer: {
    flexDirection: 'row',
    paddingHorizontal: 11,
    gap: 12
  },
  box: {
    flex: 1,
    height: BOX_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#333',
    padding: BOX_PAD,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    // ios
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    // Android
    elevation: 10
  },
  boxText: {
    fontSize: BOX_FONT,
    height: BOX_HEIGHT,
    color: '#111827',
    fontFamily: FONT,
    includeFontPadding: false
  },

  /* Gauge */
  gaugeWrapper: {
    flexDirection: 'row',
    gap: 5
  },
  gaugeContainer: {
    height: 20,
    borderWidth: 3,
    borderColor: '#111827',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden'
  },
  gaugeShadowWrapper: {
    width: '50%',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 8,
  },
  gaugeFillBase: {
    position: 'absolute',
    top: 0,
    bottom: 0
  },
  gaugeTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gaugeText: {
    color: 'grey',
    fontSize: 15,
    fontFamily: FONT,
    includeFontPadding: false
  },
  goalText: {
    fontSize: 22,
    fontFamily: FONT,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 3
  },

  /* Bottom labels */
  labelText: {
    fontSize: 18,
    marginTop: -8,
    fontFamily: FONT,
    color: 'tomato',
    includeFontPadding: false,
    textAlign: 'center'
  },

  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ICON_SIZE +4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 6
  },

  iconImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    resizeMode: 'contain'
  },

  /* Store badge */
  storeBadge: {
    position: 'absolute',
    left: -20, right: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 36,
    marginHorizontal: 'auto',
    width: 110,
    backgroundColor: 'rgba(17,24,39,0.8)',
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
    elevation: 8,
  },
  storeBadgeEmoji: {
    fontSize: 17
  },
  storeBadgeText: {
    fontFamily: FONT,
    fontSize: 18,
    color: '#fff',
    includeFontPadding: false
  }
})
