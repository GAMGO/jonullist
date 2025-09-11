import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Dimensions } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { LineChart } from 'react-native-chart-kit'
import { apiGet } from '../config/api'

const W = Dimensions.get('window').width
const num = v => (Number.isFinite(+v) ? +v : NaN)
const iso = d => (d instanceof Date ? d.toISOString().slice(0,10) : String(d ?? '').slice(0,10))
const pretty = dISO => {
  if (!dISO) return ''
  const [,m,d] = dISO.split('-')
  return `${m}.${d}`
}

/* 차트 데이터 보정 */
function sanitizePair(a, b, { nonNegative = false } = {}) {
  let x0 = num(a), x1 = num(b)
  if (!Number.isFinite(x0) &&  Number.isFinite(x1)) x0 = x1
  if (!Number.isFinite(x1) &&  Number.isFinite(x0)) x1 = x0
  if (!Number.isFinite(x0) && !Number.isFinite(x1)) x0 = x1 = 0
  if (x0 === x1) {
    const pad = Math.max(1, Math.abs(x0) * 0.01)
    x0 -= pad; x1 += pad
  }
  if (nonNegative) { x0 = Math.max(0, x0); x1 = Math.max(0, x1) }
  return [x0, x1]
}

export default function DataScreen() {
  const todayISO = iso(new Date())
  const [selected, setSelected] = useState(todayISO)

  // 값
  const [wToday, setWToday] = useState(null)
  const [wSel,   setWSel]   = useState(null)
  const [kToday, setKToday] = useState(null)
  const [kSel,   setKSel]   = useState(null)

  // 로딩
  const [loadingWToday, setLoadingWToday] = useState(true)
  const [loadingWSel,   setLoadingWSel]   = useState(true)
  const [loadingKToday, setLoadingKToday] = useState(true)
  const [loadingKSel,   setLoadingKSel]   = useState(true)

  /* 오늘 몸무게: GET /body -> CustomersProfileDTO 안의 weight */
  async function fetchWeightToday() {
    try {
      setLoadingWToday(true)
      const res = await apiGet('/body')
      const w = res?.weight ?? res?.currentWeight ?? res?.body?.weight ?? res?.profile?.weight
      setWToday(Number.isFinite(+w) ? +w : null)
    } catch (e) {
      console.warn('GET /body 실패', e)
      Alert.alert('알림', '현재 몸무게 조회 실패')
      setWToday(null)
    } finally {
      setLoadingWToday(false)
    }
  }

  /* BodyEntity 히스토리 파서: recordDate, weight 사용 */
  const readBodyDate = e => {
    const raw =
      e?.recordDate ??        // ★ 백엔드 스키마
      e?.date ??
      e?.measuredAt ??
      e?.day ??
      e?.createdDate ??
      e?.created_at ??
      e?.regDate
    if (!raw) return null
    const s = String(raw)
    return s.length >= 10 ? s.slice(0,10) : null
  }
  const readBodyWeight = e => num(e?.weight ?? e?.kg ?? e?.bodyWeight ?? e?.value)

  function pickWeightAtOrBefore(history = [], dateISO) {
    const target = new Date(dateISO + 'T23:59:59')
    let best = null
    for (const it of history) {
      const dISO = readBodyDate(it)
      const w    = readBodyWeight(it)
      if (!dISO || !Number.isFinite(w)) continue
      const d = new Date(dISO + 'T00:00:00')
      if (d <= target) {
        if (!best || d > best.date) best = { date: d, weight: w }
      }
    }
    return best?.weight
  }

  /* 선택일 몸무게: GET /body/history -> List<BodyEntity> */
  async function fetchWeightSelected(dateISO){
    try{
      setLoadingWSel(true)
      const history = await apiGet('/body/history')
      let w = Array.isArray(history) ? pickWeightAtOrBefore(history, dateISO) : null
      if (w == null && dateISO === todayISO) w = wToday ?? null
      setWSel(Number.isFinite(+w) ? +w : null)
    }catch(e){
      console.warn('GET /body/history 실패', e)
      setWSel(null)
    }finally{
      setLoadingWSel(false)
    }
  }

  /* 선택일/오늘 칼로리: GET /api/diet/get?date=YYYY-MM-DD
     RecordEntity 에서 caloriesM/L/D 합산  */
  function sumMeals(rec){
    const m = num(rec?.caloriesM)
    const l = num(rec?.caloriesL)
    const d = num(rec?.caloriesD)
    const s = [m,l,d].reduce((a,v)=> a + (Number.isFinite(v) ? v : 0), 0)
    return Number.isFinite(s) ? Math.round(s) : null
  }
  async function fetchCalories(dateISO, setState, setLoading){
    try{
      setLoading(true)
      const rec = await apiGet(`/api/diet/get?date=${dateISO}`)
      let c = null

      // 1) 우선 M/L/D 합산
      if (rec) c = sumMeals(rec)

      // 2) 혹시 백엔드에서 totalCalories/kcal 같은 필드를 내려줄 때도 수용
      if (!Number.isFinite(c)) {
        const fallback = rec?.totalCalories ?? rec?.calories ?? rec?.kcal
        if (Number.isFinite(+fallback)) c = Math.round(+fallback)
      }

      setState(Number.isFinite(c) ? c : null)
    }catch(e){
      console.warn('GET /api/diet/get 실패', e)
      setState(null)
    }finally{
      setLoading(false)
    }
  }

  // 최초 로드: 오늘값
  useEffect(() => {
    fetchWeightToday()
    fetchCalories(todayISO, setKToday, setLoadingKToday)
  }, [])

  // 선택일 변경 시
  useEffect(() => {
    fetchWeightSelected(selected)
    fetchCalories(selected, setKSel, setLoadingKSel)
  }, [selected, wToday])

  const markedDates = useMemo(() => ({
    [selected]: { selected: true, selectedColor: '#3B82F6' },
    [todayISO]: selected === todayISO ? {} : { marked: true, dotColor: '#10B981' }
  }), [selected, todayISO])

  /* 왼쪽=선택일, 오른쪽=오늘 로 통일 */
  const weightPair = sanitizePair(wSel, wToday)
  const kcalPair   = sanitizePair(kSel, kToday, { nonNegative: true })
  const wLabels = [pretty(selected), pretty(todayISO)]
  const kLabels = [pretty(selected), pretty(todayISO)]

  const weightUnavailable = (wSel == null && wToday == null)
  const kcalUnavailable   = (kSel == null && kToday == null)

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>한눈에</Text>

      <Calendar
        onDayPress={(d) => setSelected(d.dateString)}
        markedDates={markedDates}
        theme={{ todayTextColor: '#10B981', selectedDayBackgroundColor: '#3B82F6', arrowColor: '#111827' }}
        style={s.calendar}
      />

      {/* 몸무게 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>몸무게 (kg)</Text>
        {(loadingWToday || loadingWSel) ? (
          <ActivityIndicator />
        ) : weightUnavailable ? (
          <Text style={s.tip}>선택한 날짜와 오늘의 몸무게 데이터가 없습니다.</Text>
        ) : (
          <>
            <LineChart
              data={{ labels: wLabels, datasets: [{ data: weightPair }] }}
              width={W - 32}
              height={200}
              yAxisSuffix="kg"
              chartConfig={chartConfigDark}
              bezier
              fromZero
              withInnerLines
              withOuterLines={false}
              style={s.chart}
            />
            <Delta
              leftLabel="선택일"
              rightLabel="오늘"
              leftRaw={wSel ?? 0}
              rightRaw={wToday ?? 0}
              unit="kg"
            />
          </>
        )}
      </View>

      {/* 칼로리 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>칼로리 (kcal)</Text>
        {(loadingKToday || loadingKSel) ? (
          <ActivityIndicator />
        ) : kcalUnavailable ? (
          <Text style={s.tip}>선택한 날짜와 오늘의 칼로리 데이터가 없습니다.</Text>
        ) : (
          <>
            <LineChart
              data={{ labels: kLabels, datasets: [{ data: kcalPair }] }}
              width={W - 32}
              height={200}
              yAxisSuffix="kcal"
              chartConfig={chartConfigBlue}
              bezier
              fromZero
              withInnerLines
              withOuterLines={false}
              style={s.chart}
            />
            <Delta
              leftLabel="선택일"
              rightLabel="오늘"
              leftRaw={kSel ?? 0}
              rightRaw={kToday ?? 0}
              unit="kcal"
            />
          </>
        )}
      </View>
    </ScrollView>
  )
}

function Delta({ leftLabel, rightLabel, leftRaw, rightRaw, unit }) {
  const l = Number.isFinite(+leftRaw)  ? +leftRaw  : 0
  const r = Number.isFinite(+rightRaw) ? +rightRaw : 0
  const diff = l - r                      // 선택일 − 오늘
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const abs  = Math.abs(diff)
  const color = diff > 0 ? '#DC2626' : diff < 0 ? '#16A34A' : '#6B7280'
  return (
    <Text style={[s.delta, { color }]}>
      Δ {leftLabel} − {rightLabel} : {sign}{abs} {unit}
    </Text>
  )
}

/* 차트 색감 */
const chartConfigDark = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#111827' },
}
const chartConfigBlue = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
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
  tip: { fontSize: 12, color: '#6B7280', paddingHorizontal: 2, paddingVertical: 8 },
})
