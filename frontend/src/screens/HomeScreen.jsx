import { useEffect, useState, useRef, useCallback } from 'react'
import { View, ImageBackground, Text, Pressable, Image, StyleSheet, Animated, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import AvatarByBMI from '../components/AvatarByBMI'
import { initCalorieData, setTargetCalories, getCalories } from '../utils/calorieStorage'
import { useFonts } from 'expo-font'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../config/api'
import { calcBMI, classifyBMI } from '../utils/bmi'
import { useI18n } from '../i18n/I18nContext'
import { Shadow } from 'react-native-shadow-2'

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
  const redAnim = useRef(new Animated.Value(0)).current

  const ratio = target > 0 ? current / target : 0

  const nextGreen = Math.max(0, Math.min(ratio, 1)) * width
  const nextRed = ratio > 1 ? Math.min(ratio - 1, 1) * width : 0

  useEffect(() => {
    Animated.timing(greenAnim, { toValue: nextGreen, duration: 600, useNativeDriver: false }).start()
    Animated.timing(redAnim, { toValue: nextRed, duration: 600, useNativeDriver: false }).start()
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
            Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]),
          { iterations: 4 }
        ),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: 260, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      ]),
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
            transform: [{ scale: pulseScale }],
          }}
        />
      )}

      <View
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 7, height: 5 },
          shadowOpacity: 0.4,
          shadowRadius: 2,
          elevation: 12,
        }}
      >
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

  // 식단 요약 state
  const [dietSummary, setDietSummary] = useState([])

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

  // 식단 요약 불러오기
  const loadDietSummary = useCallback(async () => {
    try {
    // 오늘 날짜 YYYY-MM-DD 로 포맷
    const today = new Date().toISOString().split("T")[0]

    const meals = await apiGet(`/api/diet/get?date=${today}`) // date 파라미터 추가
    console.log("📌 meals data:", meals)

    if (!meals || meals.length === 0) {
      setDietSummary([
        { mealType: "아침", kcal: 350 },
        { mealType: "점심", kcal: 600 },
        { mealType: "저녁", kcal: 450 },
      ])
      return
    }

    const summaryMap = meals.reduce((acc, meal) => {
      if (!meal.mealType) return acc
      acc[meal.mealType] = (acc[meal.mealType] || 0) + (meal.calories || 0)
      return acc
    }, {})

    const summaryArr = Object.entries(summaryMap).map(([mealType, kcal]) => ({
      mealType,
      kcal,
    }))
    setDietSummary(summaryArr)
  } catch (e) {
    console.log('diet summary load failed', e)
  }
}, [])

  const loadAll = useCallback(async () => {
    await loadLocal()
    await syncFromProfile()
    await loadDietSummary()
  }, [loadLocal, syncFromProfile, loadDietSummary])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        await loadAll()
        const c = await getCalories()
        setCurrent(c)

        if (route?.params?.addedCalories) {
          setCurrent(prev => prev + route.params.addedCalories)
          nav.setParams({ addedCalories: undefined })
        }

        if (route?.params?.removedCalories) {
          setCurrent(prev => Math.max(0, prev - route.params.removedCalories))
          nav.setParams({ removedCalories: undefined })
        }
      }
      run()
    }, [loadAll, route?.params?.addedCalories, route?.params?.removedCalories])
  )

  if (!fontsLoaded) return null

  const IconLabeled = ({ iconSrc, label, to }) => (
    <Pressable onPress={() => nav.navigate(to)} style={styles.iconWrapper}>
      <Image source={iconSrc} style={styles.iconImage} />
      <Text style={styles.labelText} numberOfLines={1} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  )

  return (
    <ImageBackground
      source={require('../../assets/background/home.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      {/* 상점 */}
      <Pressable
        onPress={() => nav.navigate('Store')}
        style={[styles.storeBadge, { top: insets.top + 8 }]}
        hitSlop={8}
      >
        <Text style={styles.storeBadgeEmoji}>💰</Text>
        <Text style={styles.storeBadgeText}>상점</Text>
      </Pressable>

      {/* 상단 두 박스 */}
      <View style={[styles.topContainer, { marginTop: insets.top + 56 }]}>
        <Pressable style={styles.cardPress} onPress={() => nav.navigate('DietLog')}>
          <Shadow
            distance={12}
            startColor={'#0003'}
            finalColor={'#0000'}
            offset={[4, 6]}
            radius={30}
             style={styles.cardShadow} 
          >
            <View style={styles.cardBox}>
              <Text style={styles.cardText} numberOfLines={1} allowFontScaling={false}>
                 {t('HOME_MEAL')}
              </Text>
              {/* 식단 요약 표시 */}
              {dietSummary.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  {dietSummary.map((item, idx) => (
                    <Text key={idx} style={styles.cardSubText}>
                      {item.mealType}: {item.kcal} kcal
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </Shadow>
        </Pressable>

        <Pressable style={styles.cardPress} onPress={() => nav.navigate('Data')}>
          <Shadow
            distance={12}
            startColor={'#0003'}
            finalColor={'#0000'}
            offset={[4, 6]}
            radius={30}
            style={styles.cardShadow} 
          >
            <View style={styles.cardBox}>
              <Text style={styles.cardText} numberOfLines={1} allowFontScaling={false}>
                {t('HOME_DATA')}
              </Text>
            </View>
          </Shadow>
        </Pressable>
      </View>

      {/* 본문 */}
      <View style={{ flex: 1 }}>
        {/* 게이지 */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 150 + 260,
            alignItems: 'center',
          }}
        >
          <CalorieGauge current={current} target={target} />
        </View>

        {/* 캐릭터 */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 150,
            alignItems: 'center',
          }}
        >
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
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 150,
            height: 260,
          }}
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
    gap: 12,
    alignItems: 'stretch',
  },
  cardPress: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
  },
  cardShadow: {
    width: '100%',            //  Shadow 자체도 부모 폭으로
},
  cardBox: {
    height: BOX_HEIGHT,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#333',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: BOX_PAD,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',  
    paddingTop: BOX_PAD,
    paddingBottom: 8,
    width: '100%',  
  },
  cardText: {
    fontSize: BOX_FONT,
    color: '#111827',
    fontFamily: FONT,
    includeFontPadding: false,
    textAlignVertical: 'top', // (Android에서 상단 고정)
  },
  // 식단 요약 텍스트
  cardSubText: {
    fontSize: 14,
    color: '#333',
    fontFamily: FONT,
    marginTop: 2,
  },

  /* Gauge */
  gaugeWrapper: {
    flexDirection: 'row',
    gap: 5,
  },
  gaugeContainer: {
    height: 20,
    borderWidth: 3,
    borderColor: '#111827',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
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
    bottom: 0,
  },
  gaugeTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeText: {
    color: 'grey',
    fontSize: 15,
    fontFamily: FONT,
    includeFontPadding: false,
  },
  goalText: {
    fontSize: 22,
    fontFamily: FONT,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 3,
  },

  /* Bottom labels */
  labelText: {
    fontSize: 18,
    marginTop: -8,
    fontFamily: FONT,
    color: 'tomato',
    includeFontPadding: false,
    textAlign: 'center',
  },

  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ICON_SIZE + 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 6,
  },

  iconImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    resizeMode: 'contain',
  },

  /* Store badge */
  storeBadge: {
    position: 'absolute',
    left: -20,
    right: 0,
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
    fontSize: 17,
  },
  storeBadgeText: {
    fontFamily: FONT,
    fontSize: 18,
    color: '#fff',
    includeFontPadding: false,
  },
})
