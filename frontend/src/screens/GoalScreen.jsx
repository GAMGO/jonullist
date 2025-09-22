import { useState, useEffect, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import { useI18n } from '../i18n/I18nContext'
import { useAuth } from '../context/AuthContext'
import { apiPost } from '../config/api' // 프로젝트 기본 헬퍼

/* ---------------- GET/POST 헬퍼 (fallback 포함) ---------------- */
async function apiGet(url) {
  try {
    const mod = await import('../config/api')
    if (typeof mod.apiGet === 'function') return mod.apiGet(url)
  } catch {}
  return apiPost(url, undefined, { method: 'GET' }) // 폴백
}
async function apiPostRaw(url, body) {
  try {
    const mod = await import('../config/api')
    if (typeof mod.apiPost === 'function') return mod.apiPost(url, body)
  } catch {}
  return apiPost(url, body)
}

/* ---------------- 상수 ---------------- */
const FONT = 'DungGeunMo'
const DRAFT_KEY = 'goal_draft'

/* ---------------- 화면 ---------------- */
export default function GoalScreen({ navigation }) {
  const { markGoalDone } = useAuth()
  const { t } = useI18n()

  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('F')
  const [targetWeight, setTargetWeight] = useState('')
  const [targetCalories, setTargetCalories] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  if (!fontsLoaded) return null

  /* --------- draft + 서버 프리필 --------- */
  useEffect(() => {
    ;(async () => {
      try {
        // 1) 로컬 draft
        const raw = await AsyncStorage.getItem(DRAFT_KEY)
        if (raw) {
          const d = JSON.parse(raw)
          if (d?.weight != null) setWeight(String(d.weight))
          if (d?.height != null) setHeight(String(d.height))
          if (d?.age != null) setAge(String(d.age))
          if (d?.gender != null) setGender(String(d.gender))
          if (d?.targetWeight != null) setTargetWeight(String(d.targetWeight))
          if (d?.targetCalories != null) setTargetCalories(String(d.targetCalories))
        }

        // 2) 서버 프리필 (GET /body)
        const res = await apiGet('/body')
        const p = res?.data || res
        if (p) {
          if (p.weight != null) setWeight(String(p.weight))
          if (p.height != null) setHeight(String(p.height))
          if (p.age != null) setAge(String(p.age))
          if (p.gender) setGender(String(p.gender))
          if (p.targetWeight != null) setTargetWeight(String(p.targetWeight))
          if (p.targetCalories != null) setTargetCalories(String(p.targetCalories))
        }
      } catch (e) {
        console.warn('GET /body failed:', e?.message || e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 변경 시 draft 저장
  useEffect(() => {
    const draft = {
      weight: toNum(weight),
      height: toNum(height),
      age: toNum(age),
      gender,
      targetWeight: toNum(targetWeight),
      targetCalories: toNum(targetCalories),
    }
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {})
  }, [weight, height, age, gender, targetWeight, targetCalories])

  /* --------- 저장 --------- */
  const submit = async () => {
    if (!weight || !height || !age || !gender || !targetWeight || !targetCalories) {
      Alert.alert(t('INPUT_REQUIRED'), t('REQUIRED_ALL'))
      return
    }
    const payload = buildUpdateAccountRequest({
      weight, height, age, gender, targetWeight, targetCalories,
    })

    setSaving(true)
    try {
      // 최초 설정/동시 업데이트: POST /body
      // console.log('POST /body payload =', payload) // 필요 시 확인
      await apiPostRaw('/body', payload)
      await AsyncStorage.removeItem(DRAFT_KEY)
      markGoalDone()
      Alert.alert(t('UPDATE_OK'), t('GO_HOME'))
      navigation.navigate('Home')
    } catch (e) {
      console.error('POST /body error:', e)
      Alert.alert(t('UPDATE_FAIL'), t('ERR_COMMON'))
    } finally {
      setSaving(false)
    }
  }

  const skip = () => {
    markGoalDone()
    navigation.navigate('Main')
  }

  const inputStyle = useMemo(() => ({
    fontFamily: FONT,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
  }), [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontFamily: FONT, fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111827' }}>
          {t('GOAL_SETUP')}
        </Text>

        <View style={{ gap: 10, flex: 1 }}>
          <Field label={t('WEIGHT')}>
            <TextInput value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder={t('WEIGHT')} style={inputStyle} />
          </Field>

          <Field label={t('HEIGHT')}>
            <TextInput value={height} onChangeText={setHeight} keyboardType="numeric" placeholder={t('HEIGHT')} style={inputStyle} />
          </Field>

          <Field label={t('AGE')}>
            <TextInput value={age} onChangeText={setAge} keyboardType="numeric" placeholder={t('AGE')} style={inputStyle} />
          </Field>

          <Field label={t('TARGET_WEIGHT')}>
            <TextInput value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" placeholder={t('TARGET_WEIGHT')} style={inputStyle} />
          </Field>

          <Field label={t('TARGET_CALORIES')}>
            <TextInput value={targetCalories} onChangeText={setTargetCalories} keyboardType="numeric" placeholder={t('TARGET_CALORIES')} style={inputStyle} />
          </Field>

          <Field label={t('GENDER')}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Choice onPress={() => setGender('F')} active={gender === 'F'} text={t('FEMALE')} />
              <Choice onPress={() => setGender('M')} active={gender === 'M'} text={t('MALE')} />
            </View>
          </Field>
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          style={{ backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ color: 'white', fontFamily: FONT }}>
            {saving ? `${t('PROCESSING')}...` : t('SAVE_AND_START')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={skip} style={{ alignItems: 'center', padding: 10 }}>
          <Text style={{ fontFamily: FONT }}>{t('SAVE_LATER')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

/* ---------------- 작은 컴포넌트 ---------------- */
function Field({ label, children }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: 'DungGeunMo', color: '#4b5563' }}>{label}</Text>
      {children}
    </View>
  )
}
function Choice({ onPress, active, text }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: active ? '#bfdbfe' : 'transparent',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: 'DungGeunMo' }}>{text}</Text>
    </TouchableOpacity>
  )
}

/* ---------------- 유틸 ---------------- */
function toNum(v) {
  const n = Number(String(v).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

/**
 * /body POST 로 전송할 UpdateAccountRequest (평탄 구조만!)
 * 서버가 인식하는 필드: ["gender","height","weight","targetWeight","newPassword","age","targetCalories","id"]
 * - 우리가 쓰는 건 weight, height, age, gender, targetWeight, targetCalories
 * - id/newPassword는 보내지 않음(필요 시 추가)
 */
function buildUpdateAccountRequest({ weight, height, age, gender, targetWeight, targetCalories }) {
  return {
    weight: toNum(weight),
    height: toNum(height),
    age: toNum(age),
    gender: String(gender || 'F'),
    targetWeight: toNum(targetWeight),
    targetCalories: toNum(targetCalories),
  }
}
