import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Modal,
  TouchableOpacity,
} from 'react-native'
import { useI18n } from '../i18n/I18nContext'
import { useFonts } from 'expo-font'
import { ORIGIN } from '../config/api'

const FONT = 'DungGeunMo'

// 서버 enum(RecoveryQuestionCode)와 코드값을 반드시 맞춰주세요.
const QUESTIONS = [
  { code: 'FAVORITE_FOOD', label: '가장 좋아하는 음식은?' },
  { code: 'FIRST_SCHOOL',  label: '다닌 첫 학교 이름은?' },
  { code: 'BIRTH_CITY',    label: '태어난 도시는?' },
  { code: 'NICKNAME',      label: '어릴 때 별명은?' },
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)

async function apiPost(path, body) {
  const res = await fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  let json = null
  try { json = await res.json() } catch {}
  if (!res.ok) {
    const err = json?.message || `HTTP ${res.status}`
    throw new Error(err)
  }
  return json ?? {}
}

async function apiPut(path, body) {
  const res = await fetch(`${ORIGIN}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `HTTP ${res.status}`)
  }
  return true
}

/* -------------------- 공용 드롭다운 -------------------- */
function Dropdown({ value, onChange, options, labelRenderer }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.selectBox}>
        <Text style={styles.selectText}>
          {selected ? labelRenderer(selected) : '—'}
        </Text>
        <Text style={styles.selectArrow}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.modalCard}>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map(opt => {
              const active = opt.value === value
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => { onChange(opt.value); setOpen(false) }}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {labelRenderer(opt)}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}

/* =========================================================
 * A) 보안질문 설정 화면 (프로필에서 진입)
 * ========================================================= */
function SetQuestionsScreen({ t }) {
  const [name, setName] = useState('')
  const [birthMonth, setBirthMonth] = useState(1)
  const [birthDay, setBirthDay] = useState(1)

  const [qna, setQna] = useState([
    { code: QUESTIONS[0].code, answer: '' },
    { code: QUESTIONS[1].code, answer: '' },
  ])

  const usedCodes = useMemo(() => new Set(qna.map(x => x.code)), [qna])

  const getAvailable = (idx) =>
    QUESTIONS
      .filter(q => q.code === qna[idx].code || !usedCodes.has(q.code))
      .map(q => ({ value: q.code, label: q.label }))

  const setCodeAt = (idx, code) =>
    setQna(prev => { const next = [...prev]; next[idx] = { ...next[idx], code }; return next })

  const setAnswerAt = (idx, text) =>
    setQna(prev => { const next = [...prev]; next[idx] = { ...next[idx], answer: text }; return next })

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('ALERT_WARNING') || '알림', t('INPUT_REQUIRED_NAME') || '이름을 입력하세요.')
      return
    }
    const codes = qna.map(x => x.code)
    if (new Set(codes).size !== qna.length) {
      Alert.alert(t('ERR') || '오류', t('ALERT_DUPLICATE_QUESTIONS') || '같은 질문을 중복 선택할 수 없습니다.')
      return
    }
    const answers = qna
      .map(({ code, answer }) => {
        const a = (answer || '').trim()
        if (!a) return null
        return { code, answer: a, confirm: a } // ✅ 백엔드 DTO: answer/confirm 모두 필요
      })
      .filter(Boolean)
    if (answers.length !== qna.length) {
      Alert.alert(t('ERR') || '오류', t('ALERT_ANSWER_ALL_QUESTIONS') || '모든 답을 입력하세요.')
      return
    }

    const mm = String(birthMonth).padStart(2, '0')
    const dd = String(birthDay).padStart(2, '0')

    try {
      await apiPut('/api/profile/security-questions', {
        name: name.trim(),
        birth: `${mm}-${dd}`, // 백엔드에서 MM-DD로 받도록 구현되어 있음
        answers,
      })
      Alert.alert(t('SUCCESS') || '성공', t('ALERT_QUESTIONS_SAVE_SUCCESS') || '저장되었습니다.')
    } catch (e) {
      Alert.alert(t('ERR') || '오류', t('ALERT_SAVE_QUESTIONS_FAIL') || '저장 실패')
    }
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('RECOVERY_SETUP') || '보안질문 설정'}</Text>

      <Text style={styles.label}>{t('NAME') || '이름'}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t('PLACEHOLDER_NAME') || '이름'}
        placeholderTextColor="rgba(0,0,0,0.35)"
      />

      <Text style={[styles.label, { marginTop: 8 }]}>{t('LABEL_BIRTH_MONTH') || '생월'}</Text>
      <Dropdown
        value={birthMonth}
        onChange={setBirthMonth}
        options={MONTHS.map(m => ({ value: m }))}
        labelRenderer={(opt) => String(opt.value)}
      />

      <Text style={[styles.label, { marginTop: 8 }]}>{t('LABEL_BIRTH_DAY') || '생일'}</Text>
      <Dropdown
        value={birthDay}
        onChange={setBirthDay}
        options={DAYS.map(d => ({ value: d }))}
        labelRenderer={(opt) => String(opt.value)}
      />

      {qna.map((row, idx) => {
        const opts = getAvailable(idx)
        return (
          <View key={`q-${idx}`} style={{ marginTop: 12 }}>
            <Text style={styles.label}>{t('SELECT_QUESTION') || '질문 선택'}</Text>
            <Dropdown
              value={row.code}
              onChange={(val) => setCodeAt(idx, val)}
              options={opts}
              labelRenderer={(o) => QUESTIONS.find(q => q.code === o.value)?.label || o.label}
            />
            <Text style={[styles.label, { marginTop: 8 }]}>{t('RECOVERY_ANSWER') || '답 입력'}</Text>
            <TextInput
              style={styles.input}
              value={row.answer}
              onChangeText={(text) => setAnswerAt(idx, text)}
              placeholder={t('RECOVERY_ANSWER') || '답 입력'}
              placeholderTextColor="rgba(0,0,0,0.35)"
            />
          </View>
        )
      })}

      <Pressable onPress={handleSave} style={[styles.primaryBtn, { marginTop: 12 }]}>
        <Text style={styles.primaryBtnText}>{t('SAVE') || '저장'}</Text>
      </Pressable>
    </View>
  )
}

/* =========================================================
 * B) 이메일 인증 → 비번 재설정 (로그인에서 진입)
 * ========================================================= */
function EmailStartScreen({ t, email, setEmail, goVerify, startTimer }) {
  const [loading, setLoading] = useState(false)

  const sendCode = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert(t('ALERT_WARNING') || '알림', t('EMAIL_INVALID') || '올바른 이메일을 입력하세요.')
      return
    }
    try {
      setLoading(true)
      await apiPost('/api/recover/send-code', { id: email.trim(), purpose: 'RECOVERY' })
      startTimer(300)
      goVerify()
    } catch (e) {
      Alert.alert(t('ERR') || '오류', e?.message || (t('INVALID_ID') || '해당 이메일을 찾을 수 없습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('PW_RECOVERY') || '비밀번호 찾기'}</Text>
      <Text style={styles.label}>{t('EMAIL') || '이메일'}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={t('PLACEHOLDER_EMAIL') || 'you@example.com'}
        placeholderTextColor="rgba(0,0,0,0.35)"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable onPress={sendCode} disabled={loading} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{loading ? '...' : (t('SEND_CODE') || '인증코드 보내기')}</Text>
      </Pressable>
    </View>
  )
}

function VerifyCodeScreen({ t, email, leftSec, setLeftSec, startTimer, setRecoveryToken, goReset }) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert(t('FORMAT_ERROR') || '형식 오류', t('VERIFICATION_CODE_PH') || '인증코드는 6자리 숫자입니다.')
      return
    }
    try {
      setVerifying(true)
      // ✅ 백엔드: id(이메일) + token + purpose 필요
      const res = await apiPost('/api/recover/verify-email', { id: email.trim(), token: code, purpose: 'RECOVERY' })
      const ok = !!res?.success
      const rtk = res?.recoveryToken
      if (ok && rtk) {
        setRecoveryToken(rtk)
        goReset()
      } else {
        Alert.alert(t('VERIFICATION_FAIL') || '인증 실패', t('VERIFICATION_FAIL_MSG') || '인증코드를 확인해 주세요.')
      }
    } catch (e) {
      Alert.alert(t('SERVER_ERROR') || '서버 오류', e?.message || (t('TRY_AGAIN') || '다시 시도해 주세요.'))
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    if (leftSec > 0) return
    try {
      setResending(true)
      await apiPost('/api/recover/send-code', { id: email.trim(), purpose: 'RECOVERY' })
      startTimer(300)
    } catch (e) {
      Alert.alert(t('ERR') || '오류', e?.message || (t('TRY_AGAIN') || '다시 시도해 주세요.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('ENTER_CODE') || '인증코드 입력'}</Text>
      <Text style={styles.label}>{t('VERIFICATION_CODE') || '인증코드'}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="6 digits"
        placeholderTextColor="rgba(0,0,0,0.35)"
        maxLength={6}
      />

      <Pressable onPress={verify} disabled={verifying} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{verifying ? '...' : (t('CONFIRM') || '확인')}</Text>
      </Pressable>

      <TouchableOpacity onPress={resend} disabled={leftSec > 0 || resending} style={{ marginTop: 8, alignSelf: 'center' }}>
        <Text style={{ fontFamily: FONT, color: leftSec > 0 ? '#9ca3af' : '#2563eb' }}>
          {resending ? (t('PROCESSING') || '처리 중...') : (t('RESEND_CODE') || '인증코드 재전송')}
          {leftSec > 0 ? ` (${mmss(leftSec)})` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function ResetScreen({ t, recoveryToken, goStart }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReset = async () => {
    if (!recoveryToken) {
      Alert.alert(t('ALERT_ERROR') || '오류', t('ALERT_PW_RESET_FAIL') || '변경 실패')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('ERR') || '오류', t('ERR_WRONG_PW') || '비밀번호가 일치하지 않습니다.')
      return
    }
    if ((newPassword || '').length < 8) {
      Alert.alert(t('ERR') || '오류', t('PW_MIN_8') || '8자리 이상 입력하세요.')
      return
    }
    try {
      setSaving(true)
      await apiPost('/api/recover/reset', { recoveryToken, newPassword })
      Alert.alert(t('SUCCESS') || '성공', t('PW_RESET_SUCCESS') || '비밀번호가 변경되었습니다.')
      goStart()
    } catch (e) {
      Alert.alert(t('ERR') || '오류', e?.message || (t('PW_RESET_FAIL') || '변경 실패'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('RECOVERY_RESET') || '비밀번호 재설정'}</Text>

      <Text style={styles.label}>{t('LABEL_NEW_PW') || '새 비밀번호'}</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder={t('PLACEHOLDER_NEW_PW') || '8자리 이상'}
        placeholderTextColor="rgba(0,0,0,0.35)"
        secureTextEntry
      />

      <Text style={styles.label}>{t('LABEL_CONFIRM_PW') || '비밀번호 확인'}</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('PLACEHOLDER_CONFIRM_PW') || '다시 입력'}
        placeholderTextColor="rgba(0,0,0,0.35)"
        secureTextEntry
      />

      <Pressable onPress={handleReset} disabled={saving} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{saving ? '...' : (t('BTN_RESET_PW') || '변경')}</Text>
      </Pressable>
    </View>
  )
}

/* =========================================================
 * Root (라우팅 분기)
 *   - 'RecoverySetup' 라우트 또는 initial:'setQuestions' → 보안질문 설정
 *   - 그 외(예: initial:'email') → 이메일 인증 플로우
 * ========================================================= */
export default function RecoveryScreens({ route }) {
  const { t } = useI18n()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })

  // 어떤 라우트에서 왔는지에 따라 기본 화면 결정
  const routeName = route?.name
  const paramInitial = route?.params?.initial
  const fromProfile = routeName === 'RecoverySetup' || paramInitial === 'setQuestions'
  const initial = fromProfile ? 'setQuestions' : 'email'

  const [screen, setScreen] = useState(initial)
  const [email, setEmail] = useState(route?.params?.email || '')
  const [recoveryToken, setRecoveryToken] = useState('')

  const [leftSec, setLeftSec] = useState(0)
  const tickRef = useRef(null)

  useEffect(() => {
    if (leftSec <= 0 && tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [leftSec])

  const startTimer = (sec = 300) => {
    setLeftSec(sec)
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      setLeftSec((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
  }

  const goStart = () => setScreen('email')
  const goVerify = () => setScreen('verify')
  const goReset = () => setScreen('reset')

  // 네비 파라미터가 뒤늦게 들어와도 반영
  useEffect(() => {
    if (route?.params?.initial === 'setQuestions') setScreen('setQuestions')
  }, [route?.params?.initial])

  if (!fontsLoaded) return null

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.appContainer}>
        {screen === 'setQuestions' && <SetQuestionsScreen t={t} />}

        {screen === 'email' && (
          <EmailStartScreen
            t={t}
            email={email}
            setEmail={setEmail}
            goVerify={goVerify}
            startTimer={startTimer}
          />
        )}

        {screen === 'verify' && (
          <VerifyCodeScreen
            t={t}
            email={email}
            leftSec={leftSec}
            setLeftSec={setLeftSec}
            startTimer={startTimer}
            setRecoveryToken={setRecoveryToken}
            goReset={goReset}
          />
        )}

        {screen === 'reset' && (
          <ResetScreen
            t={t}
            recoveryToken={recoveryToken}
            goStart={goStart}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/* -------------------- 스타일 -------------------- */
const styles = StyleSheet.create({
  appContainer: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  screenContainer: { marginBottom: 20 },
  title: { fontFamily: FONT, fontSize: 26, textAlign: 'center', marginBottom: 18 },
  label: { fontFamily: FONT, fontSize: 16, marginBottom: 6, color: '#111827' },
  input: {
    height: 42,
    borderColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    fontFamily: FONT,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'center',
  },
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: { color: '#fff', fontFamily: FONT, fontSize: 16 },

  // dropdown
  selectBox: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { fontFamily: FONT, fontSize: 16, color: '#111827', flexShrink: 1 },
  selectArrow: { fontFamily: FONT, fontSize: 16, color: '#111827', marginLeft: 8 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: {
    position: 'absolute', left: 20, right: 20, top: '25%',
    borderRadius: 12, backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 6,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  optionRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginVertical: 4 },
  optionRowActive: { backgroundColor: 'rgba(59,130,246,0.08)' },
  optionText: { fontFamily: FONT, fontSize: 16, color: '#111827' },
  optionTextActive: { color: '#1D4ED8' },
})
