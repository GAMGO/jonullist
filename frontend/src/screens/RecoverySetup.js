import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ImageBackground, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { apiPost, apiPut } from '../config/api' // ← PUT 추가

const FONT = 'DungGeunMo'
const BG = require('../../assets/background/home.png')

// 백엔드 enum 코드와 라벨 매핑(프론트 표시용)
const QUESTIONS = [
  { code: 'PET_NAME', label: '어릴 적 반려동물 이름' },
  { code: 'BIRTH_CITY', label: '출생 도시' },
  { code: 'FAVORITE_TEACHER', label: '가장 기억에 남는 선생님 성함' },
  { code: 'FAVORITE_FOOD', label: '가장 좋아하는 음식' },
  { code: 'FIRST_SCHOOL', label: '처음 다닌 학교 이름' },
  { code: 'MOTHER_MAIDEN', label: '어머니 결혼 전 성' },
  { code: 'FAVORITE_COLOR', label: '가장 좋아하는 색' },
  { code: 'BEST_FRIEND', label: '가장 친한 친구 이름' },
]
const LABEL = Object.fromEntries(QUESTIONS.map(q => [q.code, q.label]))

// ✔︎ 백엔드 컨트롤러에 맞춘 엔드포인트
const API = {
  set:   '/api/profile/security-questions', // PUT
  start: '/api/recover/start',              // POST
  verify:'/api/recover/verify',             // POST
  reset: '/api/recover/reset',              // POST
}

function Tile({ children, onPress, active = false, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        active && styles.tileActive,
        disabled && styles.tileDisabled,
        pressed && !disabled && { transform: [{ translateY: 1 }] },
      ]}
    >
      <Text style={styles.tileText}>{children}</Text>
    </Pressable>
  )
}

export default function RecoveryScreen() {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  const [mode, setMode] = useState('start') // start | verify | reset | setup | done
  const [busy, setBusy] = useState(false)

  // 설정 모드 상태
  const [setupSel, setSetupSel] = useState([])     // 선택한 코드 3개
  const [setupAns, setSetupAns] = useState({})     // {code: answer}
  const [setupCfm, setSetupCfm] = useState({})     // {code: confirm}

  // 복구 플로우 상태
  const [loginId, setLoginId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [serverQuestions, setServerQuestions] = useState([]) // 서버가 고른 2개 코드
  const [verifyMap, setVerifyMap] = useState({})             // {code: answer}
  const [recoveryToken, setRecoveryToken] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')

  const canSetupContinue = useMemo(() => {
    if (setupSel.length !== 3) return false
    for (const code of setupSel) {
      const a = (setupAns[code] || '').trim()
      const c = (setupCfm[code] || '').trim()
      if (!a || !c || a !== c) return false
    }
    return true
  }, [setupSel, setupAns, setupCfm])

  if (!fontsLoaded) return null

  const selectSetup = code => {
    setSetupSel(prev => {
      if (prev.includes(code)) return prev.filter(c => c !== code)
      if (prev.length >= 3) return prev
      return [...prev, code]
    })
  }

  // [PUT] 보안 질문 3개 저장/수정
  const handleSetQuestions = async () => {
    if (!canSetupContinue) return
    const answers = setupSel.map(code => ({
      code,
      answer: String(setupAns[code] || '').trim(),
      confirm: String(setupCfm[code] || '').trim(),
    }))
    try {
      setBusy(true)
      await apiPut(API.set, { answers }) // ← PUT 호출
      Alert.alert('완료', '복구 질문이 저장되었습니다.')
      setMode('start')
    } catch (e) {
      Alert.alert('오류', '저장에 실패했어요. 잠시 후 다시 시도해주세요')
    } finally {
      setBusy(false)
    }
  }

  // [POST] 복구 시작: ID → 질문 2개
  const handleStart = async () => {
    const id = loginId.trim()
    if (!id) {
      Alert.alert('확인', '아이디(이메일)를 입력해주세요.')
      return
    }
    try {
      setBusy(true)
      const res = await apiPost(API.start, { id })
      const qs = Array.isArray(res?.questions) ? res.questions : []
      setChallengeId(res?.id || id)
      setServerQuestions(qs)
      setVerifyMap(Object.fromEntries(qs.map(code => [code, ''])))
      setMode('verify')
    } catch (e) {
      Alert.alert('오류', '계정을 찾을 수 없거나 시작에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  // [POST] 2개 답 검증 → recoveryToken
  const handleVerify = async () => {
    const id = challengeId || loginId
    const filled = Object.entries(verifyMap)
      .map(([code, answer]) => ({ code, answer: String(answer || '').trim() }))
      .filter(x => x.answer)
    if (filled.length !== 2) {
      Alert.alert('확인', '두 질문 모두 답변해주세요.')
      return
    }
    try {
      setBusy(true)
      const res = await apiPost(API.verify, { id, answers: filled })
      const token = res?.recoveryToken
      if (!token) throw new Error('no token')
      setRecoveryToken(token)
      setMode('reset')
    } catch (e) {
      Alert.alert('오류', '답변이 일치하지 않아요.')
    } finally {
      setBusy(false)
    }
  }

  // [POST] 토큰으로 비밀번호 재설정
  const handleReset = async () => {
    const pw = newPw.trim()
    const pw2 = newPw2.trim()
    if (pw.length < 8 || pw.length > 64) {
      Alert.alert('확인', '비밀번호는 8~64자로 해주세요.')
      return
    }
    if (pw !== pw2) {
      Alert.alert('확인', '비밀번호가 서로 달라.')
      return
    }
    try {
      setBusy(true)
      await apiPost(API.reset, { recoveryToken, newPassword: pw })
      setMode('done')
    } catch (e) {
      Alert.alert('오류', '비밀번호 재설정에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  const Header = ({ title }) => (
    <Text style={[styles.screenTitle, { top: insets.top + 8 }]}>{title}</Text>
  )

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }}>
          {mode === 'setup' && (
            <View style={styles.container}>
              <Header title="RECOVERY · SETUP" />
              <Text style={styles.desc}>질문 3개를 선택하고 답을 입력해주세요.</Text>
              <View style={styles.grid}>
                {QUESTIONS.map(q => {
                  const active = setupSel.includes(q.code)
                  return (
                    <Tile
                      key={q.code}
                      active={active}
                      disabled={!active && setupSel.length >= 3}
                      onPress={() => selectSetup(q.code)}
                    >
                      {q.label}
                    </Tile>
                  )
                })}
              </View>
              {setupSel.map(code => (
                <View key={code} style={styles.fieldBlock}>
                  <Text style={styles.label}>Q: {LABEL[code]}</Text>
                  <TextInput
                    placeholder="답변"
                    placeholderTextColor="#888"
                    value={setupAns[code] || ''}
                    onChangeText={t => setSetupAns(s => ({ ...s, [code]: t }))}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="답변 확인"
                    placeholderTextColor="#888"
                    value={setupCfm[code] || ''}
                    onChangeText={t => setSetupCfm(s => ({ ...s, [code]: t }))}
                    style={styles.input}
                  />
                </View>
              ))}
              <Pressable disabled={!canSetupContinue || busy} onPress={handleSetQuestions} style={[styles.primaryBtn, (!canSetupContinue || busy) && styles.btnDisabled]}>
                <Text style={styles.primaryText}>{busy ? '저장 중…' : '저장하기'}</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => setMode('start')} style={styles.linkBtn}>
                <Text style={styles.linkText}>비밀번호 찾기 하러가기</Text>
              </Pressable>
            </View>
          )}

          {mode === 'start' && (
            <View style={styles.container}>
              <Header title="RECOVERY" />
              <Text style={styles.desc}>가입 아이디(이메일)를 입력해주세요.</Text>
              <TextInput
                placeholder="example@domain.com"
                placeholderTextColor="#888"
                autoCapitalize="none"
                keyboardType="email-address"
                value={loginId}
                onChangeText={setLoginId}
                style={styles.input}
              />
              <Pressable disabled={busy} onPress={handleStart} style={[styles.primaryBtn, busy && styles.btnDisabled]}>
                <Text style={styles.primaryText}>{busy ? '확인 중…' : '질문 받기'}</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => setMode('setup')} style={styles.linkBtn}>
                <Text style={styles.linkText}>복구 질문 먼저 설정하기</Text>
              </Pressable>
            </View>
          )}

          {mode === 'verify' && (
            <View style={styles.container}>
              <Header title="VERIFY" />
              <Text style={styles.desc}>아래 두 가지 질문에 답해주세요.</Text>
              {serverQuestions.map(code => (
                <View key={code} style={styles.fieldBlock}>
                  <Text style={styles.label}>Q: {LABEL[code] || code}</Text>
                  <TextInput
                    placeholder="답변"
                    placeholderTextColor="#888"
                    value={verifyMap[code] || ''}
                    onChangeText={t => setVerifyMap(m => ({ ...m, [code]: t }))}
                    style={styles.input}
                  />
                </View>
              ))}
              <Pressable disabled={busy} onPress={handleVerify} style={[styles.primaryBtn, busy && styles.btnDisabled]}>
                <Text style={styles.primaryText}>{busy ? '검증 중…' : '검증하기'}</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => setMode('start')} style={styles.linkBtn}>
                <Text style={styles.linkText}>아이디 다시 입력</Text>
              </Pressable>
            </View>
          )}

          {mode === 'reset' && (
            <View style={styles.container}>
              <Header title="RESET" />
              <Text style={styles.desc}>새 비밀번호를 입력해주세요. (8~64자)</Text>
              <TextInput
                secureTextEntry
                placeholder="새 비밀번호"
                placeholderTextColor="#888"
                value={newPw}
                onChangeText={setNewPw}
                style={styles.input}
              />
              <TextInput
                secureTextEntry
                placeholder="새 비밀번호 확인"
                placeholderTextColor="#888"
                value={newPw2}
                onChangeText={setNewPw2}
                style={styles.input}
              />
              <Pressable disabled={busy} onPress={handleReset} style={[styles.primaryBtn, busy && styles.btnDisabled]}>
                <Text style={styles.primaryText}>{busy ? '변경 중…' : '비밀번호 변경'}</Text>
              </Pressable>
            </View>
          )}

          {mode === 'done' && (
            <View style={styles.container}>
              <Header title="DONE" />
              <Text style={styles.desc}>비밀번호가 변경되었어요! 새 비밀번호로 로그인해주세요.</Text>
              <Pressable onPress={() => setMode('start')} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>로그인 화면으로</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  screenTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#000',
    fontSize: 26,
    textShadowColor: 'rgba(255,255,255,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
    fontFamily: FONT,
    fontWeight: 'normal',
  },
  container: { paddingHorizontal: 20 },
  desc: { color: '#111', fontFamily: FONT, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, justifyContent: 'center' },
  tile: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#111' },
  tileActive: { backgroundColor: '#d7ffd9', borderColor: '#0a8a20' },
  tileDisabled: { opacity: 0.4 },
  tileText: { fontFamily: FONT, fontSize: 14, color: '#111' },
  fieldBlock: { marginTop: 12 },
  label: { fontFamily: FONT, fontSize: 15, color: '#000', marginBottom: 6 },
  input: { fontFamily: FONT, fontSize: 16, color: '#000', backgroundColor: '#fff', borderWidth: 2, borderColor: '#111', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  primaryBtn: { marginTop: 16, backgroundColor: '#111', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontFamily: FONT, fontSize: 16, color: '#fff' },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkText: { fontFamily: FONT, fontSize: 14, color: '#0a6' },
  btnDisabled: { opacity: 0.5 },
})
