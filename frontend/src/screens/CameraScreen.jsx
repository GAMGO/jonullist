import React, { useRef, useState, useLayoutEffect } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Animated, ScrollView, Platform, Pressable } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as ImageManipulator from "expo-image-manipulator"
import { analyzeFoodImage } from "../api/gemini"
import { API_BASE_DEBUG } from "../config/api"
import { addCalories } from "../utils/calorieStorage"
import { useNavigation } from "@react-navigation/native"

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
  const [zoom, setZoom] = useState(0)
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 })
  const [focusPt, setFocusPt] = useState(null)

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

  const incZoom = (step = 0.1) => setZoom((z) => clamp01(z + step))
  const decZoom = (step = 0.1) => setZoom((z) => clamp01(z - step))

  async function saveFoodStat({ dish, calories }) {
    try {
      const url = typeof API_BASE_DEBUG === "string" && API_BASE_DEBUG ? `${API_BASE_DEBUG}/api/food/track` : `/api/food/track`
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foodName: dish, calories }) })
      await addCalories(calories)
      nav.replace("Home")
    } catch (e) {
      console.warn("saveFoodStat error:", e)
    }
  }

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
      const finalCalories = foodObject.output?.calories || 0
      foodObject.calories = finalCalories
      if (!foodObject.dish) foodObject.dish = "알 수 없는 음식"
      setFood(foodObject)
    } catch (e) {
      if (e?.message?.includes("429") || e?.message?.includes("quota")) {
        setError("⚠️ 오늘 사용 가능한 분석 요청 횟수를 모두 소진했습니다. \n내일 다시 시도하시거나, 요금제를 업그레이드 해주세요.")
      } else {
        console.error("takeAndAnalyze 오류:", e)
        setError("분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.")
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

  const inResultMode = !!shotUri

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {!inResultMode ? (
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          zoom={zoom}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout
            setViewSize({ w: width, h: height })
          }}
        >
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
              <TouchableOpacity style={styles.roundBtn} onPress={() => decZoom(0.1)}>
                <Text style={styles.roundBtnText}>-</Text>
              </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale }] }}>
                <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} onPress={takeAndAnalyze} disabled={busy} activeOpacity={0.8} style={[styles.shutter, busy && { backgroundColor: "rgba(255,255,255,0.5)" }]}>
                  {busy ? <ActivityIndicator /> : <View style={styles.shutterInner} />}
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={styles.roundBtn} onPress={() => incZoom(0.1)}>
                <Text style={styles.roundBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <SafeAreaView edges={["top", "bottom"]} style={[styles.resultWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView contentContainerStyle={styles.resultContent}>
            {shotUri && <Image source={{ uri: shotUri }} style={styles.thumb} resizeMode="cover" />}
            {!busy && food && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>분석 결과</Text>
                <Text style={styles.foodRow}>
                  <Text style={styles.foodStrong}>{food.dish || "알 수 없는 음식"}</Text>
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
  guideBox: { width: 300, height: 300, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderRadius: 16 },
  bottomBar: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 40 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#222", justifyContent: "center", alignItems: "center" },
  roundBtnText: { color: "#fff", fontSize: 22, lineHeight: 22 },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#000" },
  resultWrap: { flex: 1, backgroundColor: "#000" },
  resultContent: { padding: 16, paddingTop: 56 },
  thumb: { width: "100%", height: 400, borderRadius: 10, marginBottom: 12 },
  card: { backgroundColor: "#111", borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 18, color: "#fff", marginBottom: 8 },
  foodRow: { fontSize: 16, color: "#fff", marginBottom: 8 },
  foodStrong: { color: "#fff" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: "#222", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6, marginBottom: 6 },
  chipText: { color: "#fff", fontSize: 14 },
  cardActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#333" },
  secondaryBtnText: { color: "#fff" },
  primaryBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#4CAF50" },
  primaryBtnText: { color: "#fff" },
  errBox: { backgroundColor: "#331111", padding: 12, borderRadius: 8, marginTop: 10 },
  errText: { color: "#ff8888" },
  focusRing: { position: "absolute", width: 60, height: 60, borderRadius: 8, borderWidth: 2, borderColor: "#fff", backgroundColor: "transparent" },
})
