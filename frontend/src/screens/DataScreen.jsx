import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions, Pressable, Modal, ImageBackground } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { LineChart } from 'react-native-chart-kit'
import { apiGet } from '../config/api'
import { useI18n } from '../i18n/I18nContext'

const W = Dimensions.get('window').width
const CHART_W = W - 32

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

/* BodyEntity 히스토리 파서 */
const readBodyDate = e => {
  const raw = e?.recordDate ?? e?.date ?? e?.measuredAt ?? e?.day ?? e?.createdDate ?? e?.created_at ?? e?.regDate
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

/* 선택일 칼로리 합산 */
function sumMeals(rec){
  const m = num(rec?.caloriesM)
  const l = num(rec?.caloriesL)
  const d = num(rec?.caloriesD)
  const s = [m,l,d].reduce((a,v)=> a + (Number.isFinite(v) ? v : 0), 0)
  return Number.isFinite(s) ? Math.round(s) : null
}

export default function DataScreen() {
  const { t } = useI18n()
  const todayISO = iso(new Date())

  // 상단 버튼 날짜
  const [baseISO, setBaseISO] = useState(todayISO)
  const [compISO, setCompISO] = useState(todayISO)

  // 데이터 상태
  const [wBase, setWBase] = useState(null)
  const [wComp, setWComp] = useState(null)
  const [kBase, setKBase] = useState(null)
  const [kComp, setKComp] = useState(null)

  const [loadingWBase, setLoadingWBase] = useState(true)
  const [loadingWComp, setLoadingWComp] = useState(true)
  const [loadingKBase, setLoadingKBase] = useState(true)
  const [loadingKComp, setLoadingKComp] = useState(true)

  // 모달 캘린더
  const [calOpen, setCalOpen] = useState(false)
  const [activeField, setActiveField] = useState(null) // 'base' | 'comp'
  const [tempDate, setTempDate] = useState(todayISO)

  async function fetchWeightFor(dateISO, setState, setLoading){
    try{
      setLoading(true)
      const history = await apiGet('/body/history')
      let w = Array.isArray(history) ? pickWeightAtOrBefore(history, dateISO) : null
      setState(Number.isFinite(+w) ? +w : null)
    }catch(e){
      setState(null)
    }finally{
      setLoading(false)
    }
  }
  async function fetchCalories(dateISO, setState, setLoading){
    try{
      setLoading(true)
      const rec = await apiGet(`/api/diet/get?date=${dateISO}`)
      let c = null
      if (rec) c = sumMeals(rec)
      if (!Number.isFinite(c)) {
        const fallback = rec?.totalCalories ?? rec?.calories ?? rec?.kcal
        if (Number.isFinite(+fallback)) c = Math.round(+fallback)
      }
      setState(Number.isFinite(c) ? c : null)
    }catch(e){
      setState(null)
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    if (baseISO) {
      fetchWeightFor(baseISO, setWBase, setLoadingWBase)
      fetchCalories(baseISO, setKBase, setLoadingKBase)
    }
  }, [baseISO])
  useEffect(() => {
    if (compISO) {
      fetchWeightFor(compISO, setWComp, setLoadingWComp)
      fetchCalories(compISO, setKComp, setLoadingKComp)
    }
  }, [compISO])

  const weightPair = sanitizePair(wBase, wComp)
  const kcalPair   = sanitizePair(kBase, kComp, { nonNegative: true })
  const wLabels = [pretty(baseISO), pretty(compISO)]
  const kLabels = wLabels

  const loadingWeight = loadingWBase || loadingWComp
  const loadingKcal   = loadingKBase || loadingKComp
  const weightUnavailable = (wBase==null && wComp==null)
  const kcalUnavailable   = (kBase==null && kComp==null)

  function openCalendar(which) {
    setActiveField(which)
    setTempDate(which === 'base' ? baseISO : compISO)
    setCalOpen(true)
  }
  function applyCalendar(){
    if (activeField === 'base') setBaseISO(tempDate)
    if (activeField === 'comp') setCompISO(tempDate)
    setCalOpen(false)
    setActiveField(null)
  }

  return (
    <ImageBackground
      source={require('../../assets/background/data.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
    
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>{t('HOME_DATA')}</Text>

      {/* 상단 버튼 */}
      <View style={s.pickersRow}>
        <Pressable style={s.pickerBtn} onPress={() => openCalendar('base')}>
          <Text style={s.pickerLabel}>기준일</Text>
          <Text style={s.pickerValue}>{pretty(baseISO)}</Text>
        </Pressable>

        <Text style={s.tilde}>~</Text>

        <Pressable style={s.pickerBtn} onPress={() => openCalendar('comp')}>
          <Text style={s.pickerLabel}>비교일</Text>
          <Text style={s.pickerValue}>{pretty(compISO)}</Text>
        </Pressable>
      </View>

      {/* 몸무게 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('WEIGHT')}</Text>
        {loadingWeight ? (
          <ActivityIndicator />
        ) : weightUnavailable ? (
          <Text style={s.tip}>{t('ALARM_NO_COMPARE_WEIGHTDATA')}</Text>
        ) : (
          <>
            <LineChart
              data={{ labels: wLabels, datasets: [{ data: weightPair }] }}
              width={CHART_W}
              height={200}
              yAxisSuffix="kg"
              chartConfig={chartConfigDark}
              fromZero
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}
              style={s.chart}  // overflow: 'hidden' 로 라인 클리핑
              propsForBackgroundLines={{
                strokeDasharray: '',      // 점선 → 실선
                stroke: '#E5E7EB',
              }}
            />
            <Delta
              leftLabel={pretty(baseISO)}
              rightLabel={pretty(compISO)}
              leftRaw={wBase ?? 0}
              rightRaw={wComp ?? 0}
              unit="kg"
            />
          </>
        )}
      </View>

      {/* 칼로리 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('CALORIES_FULL')}(Kcal)</Text>
        {loadingKcal ? (
          <ActivityIndicator />
        ) : kcalUnavailable ? (
          <Text style={s.tip}>{t('ALARM_NO_COMPARE_CALORIESDATA')}</Text>
        ) : (
          <>
            <LineChart
              data={{ labels: kLabels, datasets: [{ data: kcalPair }] }}
              width={CHART_W}
              height={200}
              yAxisSuffix={t('CALORIES')}
              chartConfig={chartConfigBlue}
              fromZero
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}
              style={s.chart}
              propsForBackgroundLines={{
                strokeDasharray: '',
                stroke: '#E5E7EB',
              }}
            />
            <Delta
              leftLabel={pretty(baseISO)}
              rightLabel={pretty(compISO)}
              leftRaw={kBase ?? 0}
              rightRaw={kComp ?? 0}
              unit={t('CALORIES')}
            />
          </>
        )}
      </View>

      {/* 날짜 선택 모달 */}
      <Modal visible={calOpen} transparent animationType="slide" onRequestClose={()=>setCalOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              {activeField === 'base' ? '기준일 선택' : '비교일 선택'}
            </Text>
            <Calendar
              onDayPress={(d) => setTempDate(d.dateString)}
              markedDates={{ [tempDate]: { selected: true, selectedColor: '#3B82F6' } }}
              theme={{ todayTextColor: '#10B981', arrowColor: '#111827' }}
              style={s.modalCalendar}
            />
            <View style={s.modalActions}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={()=>{ setCalOpen(false); setActiveField(null) }}>
                <Text style={[s.btnTxt, s.btnGhostTxt]}>취소</Text>
              </Pressable>
              <Pressable style={[s.btn, s.btnPrimary]} onPress={applyCalendar}>
                <Text style={[s.btnTxt, s.btnPrimaryTxt]}>적용</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </ImageBackground>
  )
}

function Delta({ leftLabel, rightLabel, leftRaw, rightRaw, unit }) {
  const l = Number.isFinite(+leftRaw)  ? +leftRaw  : 0
  const r = Number.isFinite(+rightRaw) ? +rightRaw : 0
  const diff = l - r
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

  pickersRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pickerLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  pickerValue: { marginTop: 2, fontSize: 18, fontWeight: '800', color: '#111827' },
  tilde: { alignSelf: 'center', marginHorizontal: 2, fontSize: 16, fontWeight: '700', color: '#9CA3AF' },

  card: { marginTop: 14, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },

  // ⬇️ 라인 삐져나옴 방지: overflow hidden
  chart: { borderRadius: 12, overflow: 'hidden' },

  delta: { marginTop: 8, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  tip: { fontSize: 12, color: '#6B7280', paddingHorizontal: 2, paddingVertical: 8 },

  /* 모달 */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 12, paddingHorizontal: 12, paddingBottom: 16
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', paddingHorizontal: 4, marginBottom: 6 },
  modalCalendar: { borderRadius: 12, overflow: 'hidden', elevation: 1, backgroundColor: '#fff' },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10
  },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  btnTxt: { fontWeight: '800' },
  btnGhost: { borderColor: '#E5E7EB', backgroundColor: '#fff' },
  btnGhostTxt: { color: '#374151' },
  btnPrimary: { borderColor: '#111827', backgroundColor: '#111827' },
  btnPrimaryTxt: { color: '#fff' },
})
