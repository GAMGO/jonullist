import { useEffect, useState, useRef, useCallback } from 'react'
import { View, ImageBackground, Text, Pressable, Image, StyleSheet, Animated, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import AvatarByBMI from '../components/AvatarByBMI'
import { initCalorieData, setTargetCalories } from '../utils/calorieStorage'
import { useFonts } from 'expo-font'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../config/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { calcBMI, classifyBMI } from '../utils/bmi'
import { useI18n } from '../i18n/I18nContext'

const ICON_SIZE = 72
const FONT = 'DungGeunMo'
const BOX_HEIGHT = Platform.select({ ios: 220, android: 170 })
const BOX_FONT = 18
const BOX_PAD = Platform.select({ ios: 20, android: 14 })

// 게이지바
function CalorieGauge({ current, target }) {
  const r = target > 0 ? current / target : 0
  const greenTo = Math.min(Math.max(r, 0), 1)
  const redTo = r > 1 ? Math.min(r - 1, 1) : 0
  const animatedGreen = useRef(new Animated.Value(0)).current
  const animatedRed = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (redTo > 0) {
    Animated.timing(animatedGreen, { toValue: 1, duration: 600, useNativeDriver: false }).start()
    Animated.timing(animatedRed, { toValue: redTo, duration: 600, useNativeDriver: false }).start()
  } else {
    Animated.timing(animatedGreen, { toValue: greenTo, duration: 600, useNativeDriver: false }).start()
    Animated.timing(animatedRed, { toValue: 0, duration: 600, useNativeDriver: false }).start()
  }
  }, [greenTo, redTo])

  const widthGreen = animatedGreen.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  const widthRed = animatedRed.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

  return (
    <View style={styles.gaugeWrapper}>
      {/* EXP 텍스트 (게이지 왼쪽) */}
      <Text style={styles.goalText}>GOAL.</Text>

      {/* 게이지바 */}
      <View style={styles.gaugeContainer}>
        <Animated.View style={[styles.gaugeFill, { width: widthGreen, backgroundColor: 'rgba(34,197,94,0.8)' }]} />
        <Animated.View style={[styles.gaugeFill, { right: 0, width: widthRed, backgroundColor: 'rgba(239,68,68,0.8)' }]} />
        <View style={styles.gaugeTextWrap}>
          <Text style={styles.gaugeText} allowFontScaling={false}>
            {current}/{target} kcal
          </Text>
        </View>
      </View>
    </View>
  )
}

// 캐릭터 아바타
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
  }, [category])

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
      {isEvolving ? (
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
          <AvatarByBMI category={displayCat} size={size} />
        </Animated.View>
      ) : (
        <AvatarByBMI category={displayCat} size={size} />
      )}
    </View>
  )
}

function dayKey(d = new Date()) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  return t.toISOString().slice(0, 10)
}

// 홈 화면
export default function HomeScreen({route}) {
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

  // 화면이 다시 포커스될 때 실행
  useFocusEffect(
    useCallback(() => { 
      loadAll();

      if (route.parms?.addedCalories) {
        setCurrent(prev => prev + route.parms.addedCalories)
      }
    }, [loadAll, route.parms?.addedCalories])
  )

  // 폰트 로드 안되면 화면 렌더링 X
  if (!fontsLoaded) return null

  const IconLabeled = ({ iconSrc, label, to }) => (
    <Pressable onPress={() => nav.navigate(to)} style={{ alignItems: 'center', width: ICON_SIZE + 8 }}>
      <Image source={iconSrc} style={{ width: ICON_SIZE, height: ICON_SIZE, resizeMode: 'contain' }} />
      <Text style={styles.labelText} numberOfLines={1} allowFontScaling={false}>{label}</Text>
    </Pressable>
  )

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
      <View style={[styles.topContainer, { marginTop: insets.top + 20 }]}>
        <Pressable style={styles.box} onPress={() => nav.navigate('DietLog')}>
          <Text style={styles.boxText} allowFontScaling={false}>{t('HOME_MEAL')}</Text>
        </Pressable>
        <Pressable style={styles.box} onPress={() => nav.navigate('Data')}>
          <Text style={styles.boxText} allowFontScaling={false}>{t('HOME_DATA')}</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {/* 게이지바: 캐릭터 머리 위 중앙 배치 */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 150 + 260, alignItems: 'center' }}>
          <CalorieGauge current={current} target={target} />
        </View>

        {/* 캐릭터 */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 150, alignItems: 'center' }}>
          <EvolvingAvatar category={category} size={260} />
        </View>

        {/* 이스터에그 터치 */}
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
            <IconLabeled iconSrc={require('../../assets/icons/quest.png')} label={t('BURNING')} to="Burning" />
            <IconLabeled iconSrc={require('../../assets/icons/quest.png')} label={t('RANKING')} to="Ranking" />
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
    borderWidth: 4,
    borderColor: '#333',
    padding: BOX_PAD,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10
  },
  boxText: {
    fontSize: BOX_FONT,
    height: BOX_HEIGHT,
    color: '#111827',
    fontFamily: FONT,
    includeFontPadding: false
  },
  gaugeWrapper: {
    flexDirection: 'row', // EXP 왼쪽 + 게이지 오른쪽
    gap: 5
  },
  gaugeContainer: {
    width: '52%',
    height: 20,
    borderWidth: 3,
    borderColor: '#111827',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8
  },
  gaugeFill: {
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
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 2, height: 1 },
    textShadowRadius: 2
  },
  labelText: {
    fontSize: 18,
    marginTop: -8,
    fontFamily: FONT,
    color: 'tomato',
    includeFontPadding: false,
    textAlign: 'center'
  }
})