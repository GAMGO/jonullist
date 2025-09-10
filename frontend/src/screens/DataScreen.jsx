// DataScreen.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { apiGet } from '../config/api' // 프로젝트에 이미 있는 헬퍼 사용 (JWT 등 포함 가정)

export default function DataScreen() {
  const todayISO = new Date().toISOString().slice(0, 10)
  const [selected, setSelected] = useState(todayISO)

  const [loadingBody, setLoadingBody] = useState(true)
  const [loadingCalToday, setLoadingCalToday] = useState(true)
  const [loadingCalSelected, setLoadingCalSelected] = useState(true)

  const [currentWeight, setCurrentWeight] = useState(null)
  const [todayCalories, setTodayCalories] = useState(null)
  const [selectedCalories, setSelectedCalories] = useState(null)

  // ---- API helpers ----
  async function fetchCurrentBody() {
    try {
      setLoadingBody(true)
      // /body (GoalController#getCustomerInfo)
      const res = await apiGet('/body')
      // 백엔드 DTO 필드명이 무엇이든 안전하게 캡처
      const w =
        res?.weight ??
        res?.currentWeight ??
        res?.body?.weight ??
        res?.profile?.weight ??
        null
      setCurrentWeight(Number.isFinite(+w) ? +w : null)
    } catch (e) {
      console.warn('GET /body 실패', e)
      Alert.alert('알림', '현재 몸무게 조회에 실패했어요.')
    } finally {
      setLoadingBody(false)
    }
  }

  async function fetchCalories(dateISO, setState, setLoading) {
    try {
      setLoading(true)
      // /api/diet/get?date=YYYY-MM-DD
      const rec = await apiGet(`/api/diet/get?date=${dateISO}`)
      // RecordEntity가 어떤 모양이든 안전하게 합산/추출
      // 1) totalCalories 필드가 있으면 사용
      let c =
        rec?.totalCalories ??
        rec?.calories ??
        rec?.kcal ??
        null

      // 2) 만약 식사 항목 배열 형태라면 합산 (morning/lunch/dinner 등)
      if (c == null) {
        const arr =
          rec?.items ??
          rec?.records ??
          rec?.dietList ??
          rec?.diets ??
          null
        if (Array.isArray(arr)) {
          c = arr.reduce((sum, it) => {
            const v = it?.calories ?? it?.kcal ?? 0
            return sum + (Number.isFinite(+v) ? +v : 0)
          }, 0)
        }
      }

      setState(Number.isFinite(+c) ? Math.round(+c) : 0)
    } catch (e) {
      console.warn('GET /api/diet/get 실패', e)
      // 기록 없으면 0으로 본다
      setState(0)
    } finally {
      setLoading(false)
    }
  }

  // ---- effects ----
  useEffect(() => {
    fetchCurrentBody()
  }, [])

  useEffect(() => {
    fetchCalories(todayISO, setTodayCalories, setLoadingCalToday)
  }, [todayISO])

  useEffect(() => {
    fetchCalories(selected, setSelectedCalories, setLoadingCalSelected)
  }, [selected])

  const markedDates = useMemo(() => ({
    [selected]: { selected: true, selectedColor: '#3B82F6' },
    [todayISO]: selected === todayISO ? {} : { marked: true, dotColor: '#10B981' }
  }), [selected, todayISO])

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>👀 한눈에</Text>

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

      {/* 비교 카드들 */}
      <View style={s.cards}>
        {/* 현재 몸무게 */}
        <Card label="몸무게(현재)">
          {loadingBody ? (
            <ActivityIndicator />
          ) : (
            <BigValue value={fmtNumber(currentWeight)} suffix=" kg" />
          )}
          <Hint>※ /body에서 최신 몸무게만 조회</Hint>
        </Card>

        {/* 칼로리: 오늘 vs 선택일 */}
        <Card label="칼로리 비교 (오늘 ↔ 선택일)">
          <Row>
            <Cell title="오늘">
              {loadingCalToday ? <ActivityIndicator /> : <BigValue value={fmtNumber(todayCalories)} suffix=" kcal" />}
            </Cell>
            <VLine />
            <Cell title="선택일">
              {loadingCalSelected ? <ActivityIndicator /> : <BigValue value={fmtNumber(selectedCalories)} suffix=" kcal" />}
            </Cell>
          </Row>

          {/* 차이(Δ) 표시 */}
          {!loadingCalToday && !loadingCalSelected && (
            <Delta
              left={todayCalories ?? 0}
              right={selectedCalories ?? 0}
              leftLabel="오늘"
              rightLabel="선택일"
            />
          )}
        </Card>
      </View>

      <Text style={s.tip}>캘린더에서 날짜를 탭하면 선택일 칼로리가 갱신돼.</Text>
      <Text style={s.tip}>몸무게는 현재값만 보여줘. (히스토리 필요하면 /body에 날짜별 조회 엔드포인트 추가 추천)</Text>
    </ScrollView>
  )
}

// ====== 작은 컴포넌트들 ======
function Card({ label, children }) {
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{label}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  )
}
function Row({ children }) {
  return <View style={s.row}>{children}</View>
}
function Cell({ title, children }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellTitle}>{title}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  )
}
function VLine() {
  return <View style={s.vline} />
}
function BigValue({ value, suffix }) {
  return (
    <Text style={s.bigValue}>
      {value}
      <Text style={s.suffix}>{suffix ?? ''}</Text>
    </Text>
  )
}
function Hint({ children }) {
  return <Text style={s.hint}>{children}</Text>
}
function Delta({ left, right, leftLabel = 'A', rightLabel = 'B' }) {
  const diff = (right ?? 0) - (left ?? 0)
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const abs = Math.abs(diff)
  const color = diff > 0 ? '#DC2626' : diff < 0 ? '#16A34A' : '#6B7280'
  return (
    <Text style={[s.delta, { color }]}>
      Δ {rightLabel} − {leftLabel} : {sign}{abs} kcal
    </Text>
  )
}
function fmtNumber(n) {
  if (!Number.isFinite(+n)) return '-'
  return String(+n)
}

// ====== styles ======
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '800', padding: 16, color: '#111827' },
  calendar: { marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', elevation: 1, backgroundColor: '#fff' },
  cards: { paddingHorizontal: 12, marginTop: 12, gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 14, elevation: 1, borderWidth: 1, borderColor: '#E5E7EB' },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  cellTitle: { fontSize: 12, color: '#6B7280' },
  bigValue: { fontSize: 28, fontWeight: '800', color: '#111827' },
  suffix: { fontSize: 16, color: '#6B7280' },
  vline: { width: 1, height: '100%', backgroundColor: '#E5E7EB' },
  hint: { marginTop: 6, fontSize: 11, color: '#6B7280' },
  delta: { marginTop: 10, fontSize: 13, fontWeight: '700' },
  tip: { fontSize: 12, color: '#6B7280', paddingHorizontal: 16, marginTop: 8 },
})
