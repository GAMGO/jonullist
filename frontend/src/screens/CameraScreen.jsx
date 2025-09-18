import React, { useRef, useState, useLayoutEffect, useEffect } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Animated, ScrollView, Pressable, Easing } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as ImageManipulator from "expo-image-manipulator"
import { LinearGradient } from "expo-linear-gradient"
import { analyzeFoodImage } from "../api/gemini"
import { API_BASE_DEBUG } from "../config/api"
import { addCalories } from "../utils/calorieStorage"
import { useNavigation, useRoute } from "@react-navigation/native" // 🔥 useRoute 추가
import { useAuth } from '../context/AuthContext' // 🔥 추가

const BOX_RADIUS = 12      // 모서리 둥글기
const SCAN_THICK = 90      // 스캔 라인 두께(px)

export default function CameraScreen() {
  const cameraRef = useRef(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [shotUri, setShotUri] = useState(null)
  const [food, setFood] = useState(null)
  const [error, setError] = useState(null)
  const insets = useSafeAreaInsets()
  const scale = useRef(new Animated.Value(1)).current
  const nav = useNavigation()
  const route = useRoute() // 🔥 추가
  const { token } = useAuth() // 🔥 추가
  const mealType = route.params?.type || 'lunch' // 🔥 추가
  
  const [zoom, setZoom] = useState(0)
  const [focusPt, setFocusPt] = useState(null)

  const inResultMode = !!shotUri
  const isSuccess = inResultMode && !busy && !!food

  const sweep = useRef(new Animated.Value(0)).current
  const borderGlow = useRef(new Animated.Value(0)).current
  const [thumbHeight, setThumbHeight] = useState(400)

  useLayoutEffect(() => {
    nav.setOptions({
      headerShown: true,
      headerTintColor: "#fff",
      headerBackTitleVisible: false,
      headerBackTitle: "",
      headerTransparent: true,
      headerStyle: { backgroundColor: "transparent" },
    })
  }, [nav])

  const pressIn = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start()
  const pressOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start()
  const clamp01 = (v) => Math.max(0, Math.min(1, v))

  const handleTapToFocus = (e) => {
    const { locationX: x, locationY: y } = e.nativeEvent
    setFocusPt({ x, y })
    setTimeout(() => setFocusPt(null), 900)
  }

  // 🔥 엔드포인트 수정 및 header 및  body 에 들어가는 요청 데이터 수정 및 수정
  async function saveFoodStat({ dish, calories }) {
    try {
      // 🔥 토큰 확인
      if (!token) {
        console.error("❌ 토큰이 없습니다! 로그인이 필요합니다.")
        alert("로그인이 필요합니다. 다시 로그인해주세요.")
        return
      }
      
      
      const url = typeof API_BASE_DEBUG === "string" && API_BASE_DEBUG ? `${API_BASE_DEBUG}/api/diet/save` : `/api/diet/save`
      
      const requestData = {
        date: new Date().toISOString().split('T')[0],
        type: mealType,
        food: dish, 
        calories: calories, 
        timestamp: Date.now()
      }
      
      
      const response = await fetch(url, { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": token 
        }, 
        body: JSON.stringify(requestData) 
      })
      
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API 오류:", errorText)
        throw new Error(`API 오류: ${response.status}`)
      }
      
      const result = await response.text()
      
      await addCalories(calories)
      nav.goBack()
    } catch (e) {
      console.warn("saveFoodStat error:", e)
      alert("식단 저장에 실패했습니다. 다시 시도해주세요.")
    }
  }

  useEffect(() => {
    if (inResultMode && busy) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(sweep, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ])
      ).start()

      Animated.loop(
        Animated.sequence([
          Animated.timing(borderGlow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(borderGlow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ])
      ).start()
    } else {
      sweep.stopAnimation(() => sweep.setValue(0))
      borderGlow.stopAnimation(() => borderGlow.setValue(0))
    }
  }, [busy, inResultMode])

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerWrap} edges={["top", "bottom"]}>
        <Text style={styles.permTitle}>카메라 권한이 필요합니다</Text>
        <Text style={styles.permSub}>음식 사진을 찍어 칼로리를 추정하려면 카메라 접근을 허용해 주세요.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>권한 허용</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const takeAndAnalyze = async () => {
    try {
      if (!cameraRef.current || busy) return
      setBusy(true)
      setFood(null)
      setError(null)
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: true })
      const manipulated = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 1280 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG })
      setShotUri(manipulated.uri)
      const result = await analyzeFoodImage(manipulated.uri)
      const foodObject = result || {}
      const finalCalories = foodObject?.output?.calories || 0
      foodObject.calories = finalCalories
      if (!foodObject.dish) foodObject.dish = "알 수 없는 음식"
      setFood(foodObject)
    } catch (e) {
      if (e?.message?.includes?.("429") || e?.message?.includes?.("quota")) {
        setError("⚠️ 오늘 사용 가능한 분석 요청 횟수를 모두 소진했습니다.")
      } else {
        console.error("takeAndAnalyze 오류:", e)
        setError("분석 중 문제가 발생했어요.")
      }
    } finally {
      setBusy(false)
    }
  }

  const resetShot = () => {
    setShotUri(null)
    setFood(null)
    setError(null)
  }

  const borderColor = isSuccess ? "#49ff9b" : borderGlow.interpolate({ inputRange: [0, 1], outputRange: ["rgba(255,255,255,0.35)", "#49ff9b"] })
  const borderWidth = isSuccess ? 3 : borderGlow.interpolate({ inputRange: [0, 1], outputRange: [2, 3.5] })
  const sweepTranslateY = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, thumbHeight - SCAN_THICK)] })

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {!inResultMode ? (
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" zoom={zoom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleTapToFocus} />
          <SafeAreaView edges={["top"]} style={styles.topOverlay} pointerEvents="none">
            <Text style={styles.topHint}>음식이 중앙에 오도록 맞춰주세요</Text>
          </SafeAreaView>
          <View style={styles.guideWrap} pointerEvents="none">
            <View style={styles.guideBox} />
          </View>
          {focusPt && <View pointerEvents="none" style={[styles.focusRing, { left: focusPt.x - 30, top: focusPt.y - 30 }]} />}
          <SafeAreaView edges={["bottom"]} style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.roundBtn} onPress={() => setZoom((z) => clamp01(z - 0.1))}>
                <Text style={styles.roundBtnText}>-</Text>
              </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale }] }}>
                <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={takeAndAnalyze} disabled={busy} activeOpacity={0.8} style={[styles.shutter, busy && { backgroundColor: "rgba(255,255,255,0.5)" }]}>
                  {busy ? <ActivityIndicator /> : <View style={styles.shutterInner} />}
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={styles.roundBtn} onPress={() => setZoom((z) => clamp01(z + 0.1))}>
                <Text style={styles.roundBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <SafeAreaView edges={["top", "bottom"]} style={[styles.resultWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView contentContainerStyle={styles.resultContent}>
            {shotUri && (
              <Animated.View
                style={[
                  styles.thumbWrap,
                  {
                    borderRadius: BOX_RADIUS,
                    borderColor,
                    borderWidth,
                  },
                ]}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height || 400
                  setThumbHeight(h)
                }}
              >
                <Image source={{ uri: shotUri }} style={styles.thumb} resizeMode="cover" />

                {busy && (
                  <>
                    <Animated.View
                      style={[
                        styles.sweepGrad,
                        {
                          left: 0,
                          right: 0,
                          transform: [{ translateY: sweepTranslateY }],
                          borderRadius: BOX_RADIUS,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={["transparent", "rgba(73,255,155,0.35)", "rgba(73,255,155,0.9)", "rgba(73,255,155,0.35)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ flex: 1 }}
                      />
                    </Animated.View>
                    <View style={styles.scanningBadge}>
                      <ActivityIndicator size="small" />
                      <Text style={styles.scanningText}>분석 중…</Text>
                    </View>
                  </>
                )}
              </Animated.View>
            )}

            {!busy && food && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>분석 결과</Text>
                <Text style={styles.foodRow}>
                  <Text style={styles.foodStrong}>{food.dish}</Text>
                </Text>
                <View style={styles.chipsRow}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>🔥 {food.calories} kcal</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={resetShot} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>다시 찍기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => saveFoodStat({ dish: food.dish, calories: food.calories })} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!busy && !food && error && (
              <View style={styles.errBox}>
                <Text style={styles.errText}>{error}</Text>
                <View style={{ height: 12 }} />
                <TouchableOpacity onPress={resetShot} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>다시 찍기</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#0b0b0b" },
  permTitle: { fontSize: 20, color: "#fff", marginBottom: 12 },
  permSub: { fontSize: 14, color: "#ccc", textAlign: "center", marginBottom: 20 },
  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", paddingTop: 8, paddingBottom: 8, zIndex: 10 },
  topHint: { color: "#fff", fontSize: 12, opacity: 0.8, marginTop: 80 },
  guideWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  guideBox: { width: 300, height: 300, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderRadius: 16 },
  bottomBar: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 40 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#222", justifyContent: "center", alignItems: "center" },
  roundBtnText: { color: "#fff", fontSize: 22, lineHeight: 22 },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#000" },

  resultWrap: { flex: 1, backgroundColor: "#000" },
  resultContent: { padding: 16, paddingTop: 56 },

  thumbWrap: {
    width: "100%",
    height: 400,
    borderRadius: BOX_RADIUS,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    backgroundColor: "transparent",
  },
  thumb: { width: "100%", height: "100%" },

  sweepGrad: { position: "absolute", height: SCAN_THICK, overflow: "hidden" },

  scanningBadge: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanningText: { color: "#E7FFE7", fontSize: 13 },

  card: { backgroundColor: "#0f0f0f", borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 18, color: "#fff", marginBottom: 8 },
  foodRow: { fontSize: 16, color: "#fff", marginBottom: 8 },
  foodStrong: { color: "#fff" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: "#171717", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6, marginBottom: 6 },
  chipText: { color: "#fff", fontSize: 14 },
  cardActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#2a2a2a" },
  secondaryBtnText: { color: "#fff" },
  primaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#4CAF50" },
  primaryBtnText: { color: "#fff" },

  errBox: { backgroundColor: "#331111", padding: 12, borderRadius: 8, marginTop: 10 },
  errText: { color: "#ff8888" },

  focusRing: { position: "absolute", width: 60, height: 60, borderRadius: 8, borderWidth: 2, borderColor: "#fff", backgroundColor: "transparent" },
})
