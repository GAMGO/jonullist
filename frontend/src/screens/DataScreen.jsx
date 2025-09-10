import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Dimensions } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { LineChart } from 'react-native-chart-kit'
import { apiGet } from '../config/api'

const W = Dimensions.get('window').width
const num = v => (Number.isFinite(+v) ? +v : 0)
const iso = d => (d instanceof Date ? d.toISOString().slice(0,10) : String(d ?? '').slice(0,10))
const pretty = dISO => {
  if (!dISO) return ''
  const [y,m,d] = dISO.split('-')
  return `${m}.${d}`
}

/** 차트 Infinity 방지:
 * - 데이터 없거나 1개 → 복제
 * - 두 값이 같으면 양쪽에 살짝 패딩
 */
function sanitizePair(a, b) {
  let x = [num(a), num(b)]
  if (x.length < 2) x = [x[0] ?? 0, x[0] ?? 0]
  if (x[0] === x[1]) {
    const pad = Math.max(1, Math.abs(x[0]) * 0.01)
    x = [x[0] - pad, x[1] + pad]
  }
  return x
}

export default function DataScreen() {
  const todayISO = iso(new Date())
  const [selected, setSelected] = useState(todayISO)

  // 몸무게/칼로리 (오늘, 선택일)
  const [wToday, setWToday] = useState(null)
  const [wSel, setWSel] = useState(null)
  const [kToday, setKToday] = useState(null)
  const [kSel, setKSel] = useState(null)

  // 로딩
  const [loadingWToday, setLoadingWToday] = useState(true)
  const [loadingWSel, setLoadingWSel] = useState(true)
  const [loadingKToday, setLoadingKToday] = useState(true)
  const [loadingKSel, setLoadingKSel] = useState(true)

  // ─── API: 현재 몸무게 (/body) ───
  async function fetchWeightToday() {
    try {
      setLoadingWToday(true)
      const res = await apiGet('/body') // CustomersProfileDTO
      const w = res?.weight ?? res?.currentWeight ?? res?.body?.weight ?? res?.profile?.weight
      setWToday(Number.isFinite(+w) ? +w : 0)
    } catch (e) {
      console.warn('GET /body 실패', e)
      Alert.alert('알림', '현재 몸무게 조회 실패')
      setWToday(0)
    } finally {
      setLoadingWToday(false)
    }
  }

  // ─── API: 선택일 몸무게 (히스토리에서 선택일≤가장 최근) /body/history ───
  function readBodyDate(e){
    const raw = e?.date ?? e?.measuredAt ?? e?.day ?? e?.createdDate ?? e?.created_at ?? e?.regDate
    if (!raw) return null
    const s = String(raw)
    return s.length >= 10 ? s.slice(0,10) : null
  }
  function readBodyWeight(e){
    return num(e?.weight ?? e?.kg ?? e?.bodyWeight ?? e?.value)
  }
  function pickWeightAtOrBefore(history = [], dateISO) {
    const target = new Date(dateISO + 'T23:59:59')
    let best = null
    for (const it of history) {
      const d = readBodyDate(it)
      const w = readBodyWeight(it)
      if (!d || !Number.isFinite(w)) continue
      const dd = new Date(d + 'T00:00:00')
      if (dd <= target) {
        if (!best || dd > best.date) best = { date: dd, weight: w }
      }
    }
    return best?.weight ?? 0
  }
  async function fetchWeightSelected(dateISO){
    try{
      setLoadingWSel(true)
      const history = await apiGet('/body/history') // List<BodyEntity>
      const w = Array.isArray(history) ? pickWeightAtOrBefore(history, dateISO) : 0
      setWSel(w)
    }catch(e){
      console.warn('GET /body/history 실패', e)
      setWSel(0)
    }finally{
      setLoadingWSel(false)
    }
  }

  // ─── API: 칼로리 (/api/diet/get?date=YYYY-MM-DD) ───
  async function fetchCalories(dateISO, setState, setLoading){
    try{
      setLoading(true)
      const rec = await apiGet(`/api/diet/get?date=${dateISO}`) // RecordEntity
      let c = rec?.totalCalories ?? rec?.calories ?? rec?.kcal
      if (c == null) {
        const arr = rec?.items ?? rec?.records ?? rec?.dietList ?? rec?.diets
        if (Array.isArray(arr)) {
          c = arr.reduce((s, it) => s + num(it?.calories ?? it?.kcal), 0)
        }
      }
      setState(Number.isFinite(+c) ? Math.round(+c) : 0)
    }catch(e){
      console.warn('GET /api/diet/get 실패', e)
      setState(0)
    }finally{
      setLoading(false)
    }
  }

  // 최초 로드: 오늘값들
  useEffect(() => {
    fetchWeightToday()
    fetchCalories(todayISO, setKToday, setLoadingKToday)
  }, [])

  // 선택일 바뀔 때: 선택일 몸무게/칼로리
  useEffect(() => {
    fetchWeightSelected(selected)
    fetchCalories(selected, setKSel, setLoadingKSel)
  }, [selected])

  const markedDates = useMemo(() => ({
    [selected]: { selected: true, selectedColor: '#3B82F6' },
    [todayISO]: selected === todayISO ? {} : { marked: true, dotColor: '#10B981' }
  }), [selected, todayISO])

  // 차트 데이터(2점: 오늘 vs 선택일) – Infinity 방지 보정
  const weightPair = sanitizePair(wToday ?? 0, wSel ?? 0)
  const kcalPair   = sanitizePair(kToday ?? 0, kSel ?? 0)

  const wLabels = [pretty(todayISO), pretty(selected)]
  const kLabels = [pretty(todayISO), pretty(selected)]

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>한눈에</Text>

      {/* 캘린더 */}
      <Calendar
        onDayPress={(d) => setSelected(d.dateString)}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#10B981',
          selectedDayBackgroundColor: '#3B82F6',
          arrowColor: '#111827',
        }}
        style={s.calendar}
      />

      {/* 몸무게 비교 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>몸무게 (kg)</Text>
        {(loadingWToday || loadingWSel) ? (
          <ActivityIndicator />
        ) : (
          <>
            <LineChart
              data={{ labels: wLabels, datasets: [{ data: weightPair }] }}
              width={W - 32}
              height={200}
              yAxisSuffix="kg"
              chartConfig={chartConfigDark}
              bezier
              withInnerLines
              withOuterLines={false}
              style={s.chart}
            />
            <Delta
              leftLabel="오늘"
              rightLabel="선택일"
              leftRaw={wToday ?? 0}
              rightRaw={wSel ?? 0}
              unit="kg"
            />
          </>
        )}
      </View>

      {/* 칼로리 비교 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>칼로리 (kcal)</Text>
        {(loadingKToday || loadingKSel) ? (
          <ActivityIndicator />
        ) : (
          <>
            <LineChart
              data={{ labels: kLabels, datasets: [{ data: kcalPair }] }}
              width={W - 32}
              height={200}
              yAxisSuffix="kcal"
              chartConfig={chartConfigBlue}
              bezier
              withInnerLines
              withOuterLines={false}
              style={s.chart}
            />
            <Delta
              leftLabel="오늘"
              rightLabel="선택일"
              leftRaw={kToday ?? 0}
              rightRaw={kSel ?? 0}
              unit="kcal"
            />
          </>
        )}
      </View>
    </ScrollView>
  )
}

/** Δ 라벨 */
function Delta({ leftLabel, rightLabel, leftRaw, rightRaw, unit }) {
  const diff = num(rightRaw) - num(leftRaw)
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const abs  = Math.abs(diff)
  const color = diff > 0 ? '#DC2626' : diff < 0 ? '#16A34A' : '#6B7280'
  return (
    <Text style={[s.delta, { color }]}>
      Δ {rightLabel} − {leftLabel} : {sign}{abs} {unit}
    </Text>
  )
}

/** 차트 색감 (몸무게: 다크 그레이 라인) */
const chartConfigDark = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,           // #111827
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,   // #6B7280
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#111827' },
}

/** 차트 색감 (칼로리: 블루 라인) */
const chartConfigBlue = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,         // #3B82F6
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#3B82F6' },
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '800', padding: 16, color: '#111827' },
  calendar: { marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', elevation: 1, backgroundColor: '#fff' },
  card: { marginTop: 14, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  chart: { borderRadius: 12 },
  delta: { marginTop: 8, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  tip: { fontSize: 12, color: '#6B7280', paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
})
