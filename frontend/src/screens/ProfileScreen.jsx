import React, { useEffect, useState, useCallback } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ImageBackground,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { ORIGIN } from '../config/api'
import { useFonts } from 'expo-font'
import { useNavigation } from '@react-navigation/native'
import { useI18n } from '../i18n/I18nContext'

const FONT = 'DungGeunMo'

if (Text.defaultProps == null) Text.defaultProps = {}
if (TextInput.defaultProps == null) TextInput.defaultProps = {}
Text.defaultProps.allowFontScaling = false
Text.defaultProps.maxFontSizeMultiplier = 1
TextInput.defaultProps.allowFontScaling = false
TextInput.defaultProps.maxFontSizeMultiplier = 1

export default function ProfileScreen() {
  const { t } = useI18n()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  if (fontsLoaded) {
    if (!Text.defaultProps.style) Text.defaultProps.style = { fontFamily: FONT, includeFontPadding: true }
    if (!TextInput.defaultProps.style) TextInput.defaultProps.style = { fontFamily: FONT }
  }

  const insets = useSafeAreaInsets()
  const auth = useAuth()
  const userId = auth?.user?.id || null
  const nav = useNavigation()

  const [current, setCurrent] = useState({ id: '', weight: '', height: '', age: '', gender: '' })
  const [editingAccount, setEditingAccount] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  // 'editAccount' | 'recoverySetup'
  const [modalAction, setModalAction] = useState(null)

  const [form, setForm] = useState({
    weight: '',
    height: '',
    age: '',
    gender: '',
    targetWeight: '',
    targetCalories: '',
    newId: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [loading, setLoading] = useState(true)
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [errAccount, setErrAccount] = useState('')
  const [errProfile, setErrProfile] = useState('')
  const [okAccount, setOkAccount] = useState('')
  const [okProfile, setOkProfile] = useState('')
  const [getEndpoint, setGetEndpoint] = useState(null)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForVerification, setPasswordForVerification] = useState('')
  const [passwordModalError, setPasswordModalError] = useState('')

  // 보안 질문 설정 여부
  const [hasSecurityQuestions, setHasSecurityQuestions] = useState(false)

  const getAuth = useCallback(async () => {
    const ctxType = auth?.tokenType || auth?.token_type || 'Bearer'
    try {
      const s = await SecureStore.getItemAsync('accessToken')
      if (s) {
        const m = String(s).match(/^(Bearer|Basic|Token)\s+(.+)$/i)
        return { token: m ? m[2] : s, type: m ? m[1] : 'Bearer' }
      }
    } catch {}
    const keys = ['token', 'authToken', '@auth/token']
    for (const k of keys) {
      const v = await AsyncStorage.getItem(k)
      if (v) {
        const m = String(v).match(/^(Bearer|Basic|Token)\s+(.+)$/i)
        return { token: m ? m[2] : v, type: m ? m[1] : 'Bearer' }
      }
    }
    return { token: null, type: ctxType }
  }, [auth])

  const logoutToWelcome = useCallback(async () => {
    try { await AsyncStorage.multiRemove(['token','authToken','accessToken','@auth/token','@profile/prefill']) } catch {}
    try { await auth?.logout?.() } catch {}
  }, [auth])

  const fetchFirstOK = useCallback(
    async (method, paths, body) => {
      const { token, type } = await getAuth()
      let lastErr
      for (const p of paths) {
        try {
          const res = await fetch(`${ORIGIN}${p}`, {
            method,
            headers: {
              Accept: 'application/json',
              ...(body ? { 'Content-Type': 'application/json' } : {}),
              ...(token ? { Authorization: `${type} ${token}` } : {}),
            },
            credentials: 'include',
            ...(body ? { body: JSON.stringify(body) } : {}),
          })
          if (res.ok) {
            const ttxt = await res.text()
            try { return { data: JSON.parse(ttxt), used: p } } catch { return { data: null, used: p } }
          }
          if (res.status === 401 || res.status === 403) {
            const ttxt = await res.text()
            throw new Error(ttxt || '401')
          }
          lastErr = new Error(await res.text())
        } catch (e) {
          lastErr = e
        }
      }
      throw lastErr || new Error(t('REQUEST_FAILED'))
    },
    [getAuth, t]
  )

  const applyToState = useCallback((obj) => {
    const email = obj?.id ?? obj?.email ?? ''
    const weight = obj?.weight ?? ''
    const height = obj?.height ?? ''
    const age = obj?.age ?? ''
    const gender = obj?.gender ?? ''
    const targetWeight = obj?.targetWeight ?? ''
    const targetCalories = obj?.targetCalories ?? ''
    setCurrent({ id: email, weight, height, age, gender })
    setForm({
      weight: weight === '' ? '' : String(weight),
      height: height === '' ? '' : String(height),
      age: age === '' ? '' : String(age),
      gender: gender ?? '',
      targetWeight: targetWeight === '' ? '' : String(targetWeight),
      targetCalories: targetCalories === '' ? '' : String(targetCalories),
      newId: email ?? '',
      newPassword: '',
      confirmPassword: '',
    })
  }, [])

  const load = useCallback(async () => {
    setErrAccount(''); setErrProfile(''); setOkAccount(''); setOkProfile('')
    let showedPrefill = false
    try {
      const raw = await AsyncStorage.getItem('@profile/prefill')
      if (raw) {
        const prefill = JSON.parse(raw)
        if (!prefill?.id || !userId || String(prefill.id) === String(userId)) {
          applyToState(prefill)
          setLoading(false)
          showedPrefill = true
        } else {
          await AsyncStorage.removeItem('@profile/prefill')
        }
      }
    } catch {}

    try {
      const { data, used } = await fetchFirstOK('GET', ['/api/profile', '/api/profile/'])
      setGetEndpoint(used || '/api/profile')

      if (data) {
        applyToState(data)

        // 보안 질문 설정 여부 조회
        try {
          const res = await fetch(`${ORIGIN}/api/recover/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data?.id || userId }),
          })
          if (res.ok) {
            setHasSecurityQuestions(true)
          } else if (res.status === 400) {
            const error = await res.json().catch(() => ({}))
            if (error?.message === t('SECURITY_QNA_NOT_SET')) {
              setHasSecurityQuestions(false)
            } else {
              setHasSecurityQuestions(false)
            }
          } else {
            setHasSecurityQuestions(false)
          }
        } catch {
          setHasSecurityQuestions(false)
        }
      }

      setLoading(false)
      try { await AsyncStorage.removeItem('@profile/prefill') } catch {}
    } catch (e) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('forbidden') || msg.includes('401') || msg.includes('403')) {
        await logoutToWelcome()
        return
      }
      if (!showedPrefill) {
        setErrProfile(t('UPDATE_FAIL'))
        setLoading(false)
      }
    }
  }, [applyToState, fetchFirstOK, logoutToWelcome, userId, t])

  useEffect(() => { load() }, [load])

  // 돌아왔을 때 상태 갱신(복구 설정 후)
  useEffect(() => {
    const unsub = nav.addListener?.('focus', () => load())
    return unsub
  }, [nav, load])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // 비밀번호 확인 후 액션 진행
  const verifyPasswordAndProceed = async () => {
    setPasswordModalError('')
    const pwd = passwordForVerification
    try {
      const res = await fetch(`${ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, password: pwd }),
      })
      const resData = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(resData?.message || t('LOGIN_FAIL'))

      setShowPasswordModal(false)
      setPasswordForVerification('')

      if (modalAction === 'editAccount') {
        setEditingAccount(true)
      } else if (modalAction === 'recoverySetup') {
        nav.navigate('RecoverySetup', {
          initial: 'setQuestions',
          email: current.id || '',
        })
      }
      setModalAction(null)
      setErrAccount('')
      setOkAccount('')
    } catch (e) {
      setPasswordModalError(e?.message || t('VERIFY_FAIL'))
    }
  }

  const saveAccount = async () => {
    setSavingAccount(true)
    setErrAccount('')
    setOkAccount('')
    try {
      const nextId = (form.newId || current.id || '').trim()
      if (!nextId || !/^\S+@\S+\.\S+$/.test(nextId)) throw new Error(t('EMAIL_INVALID'))

      const changingPw = !!form.newPassword || !!form.confirmPassword
      if (changingPw) {
        if ((form.newPassword || '').length < 8) throw new Error(t('PW_TOO_SHORT'))
        if (form.newPassword !== form.confirmPassword) throw new Error(t('PW_MISMATCH'))
      }

      const payload = { id: nextId, ...(changingPw ? { newPassword: form.newPassword } : {}) }
      const candidates = [getEndpoint, '/api/profile', '/api/profile/'].filter(Boolean)
      await fetchFirstOK('PUT', candidates, payload)

      setOkAccount(t('UPDATE_OK'))
      setEditingAccount(false)
      setCurrent(c => ({ ...c, id: nextId }))
      setForm(f => ({ ...f, newPassword: '', confirmPassword: '' }))
      await AsyncStorage.removeItem('@profile/prefill')
      await load()
    } catch (e) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('forbidden') || msg.includes('401') || msg.includes('403')) {
        await logoutToWelcome()
        return
      }
      setErrAccount(e?.message || t('UPDATE_FAIL'))
    } finally {
      setSavingAccount(false)
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setErrProfile('')
    setOkProfile('')
    try {
      const numOk = v => v === '' || !Number.isNaN(Number(v))
      if (!numOk(form.weight) || !numOk(form.height) || !numOk(form.age) || !numOk(form.targetWeight) || !numOk(form.targetCalories)) {
        throw new Error(t('NUMERIC_ONLY'))
      }
      const payload = {
        id: (current.id || '').trim(),
        ...(form.weight !== '' ? { weight: Number(form.weight) } : {}),
        ...(form.height !== '' ? { height: Number(form.height) } : {}),
        ...(form.age !== '' ? { age: Number(form.age) } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.targetWeight !== '' ? { targetWeight: Number(form.targetWeight) } : {}),
        ...(form.targetCalories !== '' ? { targetCalories: Number(form.targetCalories) } : {}),
      }
      const candidates = [getEndpoint, '/api/profile', '/api/profile/'].filter(Boolean)
      await fetchFirstOK('PUT', candidates, payload)
      setOkProfile(t('UPDATE_OK'))
      setEditingProfile(false)
      await AsyncStorage.removeItem('@profile/prefill')
      await load()
    } catch (e) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('forbidden') || msg.includes('401') || msg.includes('403')) {
        await logoutToWelcome()
        return
      }
      setErrProfile(e?.message || t('UPDATE_FAIL'))
    } finally {
      setSavingProfile(false)
    }
  }

  if (!fontsLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator />
      </View>
    )
  }

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
        <Text style={[styles.screenTitle, { top: insets.top + 8 }]}>{t('PROFILE_TITLE')}</Text>
        <View style={[styles.center, { paddingTop: insets.top + 96 }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#fff', fontFamily: FONT, fontSize: 14, lineHeight: 18, includeFontPadding: true }}>{t('LOADING')}</Text>
        </View>
      </ImageBackground>
    )
  }

  // 비밀번호 확인 모달
  if (showPasswordModal) {
    return (
      <View style={[styles.center, styles.modalOverlay]}>
        <View style={[styles.card, { width: '80%' }]}>
          <Text style={styles.cardTitle}>{t('PASSWORD')} {t('CONFIRM')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('ENTER_PW')}
            secureTextEntry
            value={passwordForVerification}
            onChangeText={setPasswordForVerification}
          />
          {!!passwordModalError && <Text style={styles.error}>{passwordModalError}</Text>}
          <View style={styles.row}>
            <Pressable onPress={() => setShowPasswordModal(false)} style={styles.ghostBtn} >
              <Text style={styles.ghostBtnText}>{t('CANCEL')}</Text>
            </Pressable>
            <Pressable onPress={verifyPasswordAndProceed} style={styles.primaryBtn} >
              <Text style={styles.primaryBtnText}>{t('CONFIRM')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
        <Text style={[styles.screenTitle, { top: insets.top + 8 }]}>{t('PROFILE_TITLE')}</Text>
        <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 108, paddingBottom: insets.bottom + 24 }]}>
          {/* 계정 정보 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('ACCOUNT_INFO')}</Text>
            {!editingAccount ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('CURRENT_EMAIL')}</Text>
                  <Text style={styles.value}>{current.id ? String(current.id) : '-'}</Text>
                </View>
                {!!errAccount && <Text style={styles.error}>{errAccount}</Text>}
                {!!okAccount && <Text style={styles.ok}>{okAccount}</Text>}

                {/* ← 보안질문 버튼은 별도 카드로 분리. 여기선 항상 "수정"만 */}
                <Pressable
                  onPress={() => { setModalAction('editAccount'); setShowPasswordModal(true) }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{t('EDIT')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('EMAIL')}</Text>
                <TextInput value={form.newId} onChangeText={v => update('newId', v)} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
                <Text style={styles.label}>{t('PASSWORD')}</Text>
                <TextInput value={form.newPassword} onChangeText={v => update('newPassword', v)} secureTextEntry style={styles.input} />
                <Text style={styles.label}>{t('PASSWORD_CONFIRM')}</Text>
                <TextInput value={form.confirmPassword} onChangeText={v => update('confirmPassword', v)} secureTextEntry style={styles.input} />
                {!!errAccount && <Text style={styles.error}>{errAccount}</Text>}
                {!!okAccount && <Text style={styles.ok}>{okAccount}</Text>}
                <View style={styles.row}>
                  <Pressable onPress={saveAccount} disabled={savingAccount} style={[styles.primaryBtn, savingAccount && { opacity: 0.6 }]}>
                    {savingAccount ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>{t('CONFIRM')}</Text>}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingAccount(false)
                      setForm(f => ({ ...f, newId: current.id || '', newPassword: '', confirmPassword: '' }))
                    }}
                    style={styles.ghostBtn}
                  >
                    <Text style={styles.ghostBtnText}>{t('CANCEL')}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* ✅ 보안 질문(계정 복구) 전용 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('RECOVERY_QUESTIONS') || '보안 질문(계정 복구)'}</Text>

            <View style={styles.rowBetween}>
              <Text style={styles.label}>{t('STATUS') || '상태'}</Text>
              <View style={[styles.badge, hasSecurityQuestions ? styles.badgeOk : styles.badgeWarn]}>
                <Text style={[styles.badgeText, hasSecurityQuestions ? styles.badgeTextOk : styles.badgeTextWarn]}>
                  {hasSecurityQuestions ? (t('SET') || '설정됨') : (t('NOT_SET') || '미설정')}
                </Text>
              </View>
            </View>

            <Text style={[styles.text, { marginBottom: 12, opacity: 0.8 }]}>
              {hasSecurityQuestions
                ? (t('RECOVERY_HINT_SET') || '분실 시 이메일 없이도 본인 확인이 가능합니다.')
                : (t('RECOVERY_HINT_NOT_SET') || '분실 대비를 위해 지금 설정해 두세요.')}
            </Text>

            <View style={styles.row}>
              <Pressable
                onPress={() => { setModalAction('recoverySetup'); setShowPasswordModal(true) }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  {hasSecurityQuestions ? (t('CHANGE') || '변경/재설정') : (t('RECOVERY_SETUP') || '설정하기')}
                </Text>
              </Pressable>
              <Pressable onPress={load} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>{t('REFRESH') || '새로고침'}</Text>
              </Pressable>
            </View>
          </View>

          {/* 프로필 정보 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('PROFILE_INFO')}</Text>
            {!editingProfile ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('WEIGHT')}</Text>
                  <Text style={styles.value}>{current.weight ? `${current.weight}kg` : '-'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('HEIGHT')}</Text>
                  <Text style={styles.value}>{current.height ? `${current.height}cm` : '-'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('AGE')}</Text>
                  <Text style={styles.value}>{current.age ? `${current.age}` : '-'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('GENDER')}</Text>
                  <Text style={styles.value}>{current.gender ? `${t(current.gender)}` : '-'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('TARGET_WEIGHT')}</Text>
                  <Text style={styles.value}>{form.targetWeight ? `${form.targetWeight}kg` : '-'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{t('TARGET_CALORIES')}</Text>
                  <Text style={styles.value}>{form.targetCalories ? `${form.targetCalories}kcal` : '-'}</Text>
                </View>
                {!!errProfile && <Text style={styles.error}>{errProfile}</Text>}
                {!!okProfile && <Text style={styles.ok}>{okProfile}</Text>}
                <Pressable onPress={() => setEditingProfile(true)} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>{t('EDIT')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('WEIGHT')}</Text>
                <TextInput value={form.weight} onChangeText={v => update('weight', v)} keyboardType="numeric" style={styles.input} />
                <Text style={styles.label}>{t('HEIGHT')}</Text>
                <TextInput value={form.height} onChangeText={v => update('height', v)} keyboardType="numeric" style={styles.input} />
                <Text style={styles.label}>{t('AGE')}</Text>
                <TextInput value={form.age} onChangeText={v => update('age', v)} keyboardType="numeric" style={styles.input} />
                <Text style={styles.label}>{t('GENDER')}</Text>
                <View style={styles.rowBetween}>
                  <View style={styles.segmentWrap}>
                    <Pressable
                      onPress={() => update('gender', 'M')}
                      style={[styles.segmentBtn, form.gender === 'M' && styles.segmentBtnActive]}
                    >
                      <Text style={[styles.segmentText, form.gender === 'M' && styles.segmentTextActive]}>{t('남성')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => update('gender', 'F')}
                      style={[styles.segmentBtn, form.gender === 'F' && styles.segmentBtnActive]}
                    >
                      <Text style={[styles.segmentText, form.gender === 'F' && styles.segmentTextActive]}>{t('여성')}</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.label}>{t('TARGET_WEIGHT')}</Text>
                <TextInput value={form.targetWeight} onChangeText={v => update('targetWeight', v)} keyboardType="numeric" style={styles.input} />
                <Text style={styles.label}>{t('TARGET_CALORIES')}</Text>
                <TextInput value={form.targetCalories} onChangeText={v => update('targetCalories', v)} keyboardType="numeric" style={styles.input} />
                {!!errProfile && <Text style={styles.error}>{errProfile}</Text>}
                {!!okProfile && <Text style={styles.ok}>{okProfile}</Text>}
                <View style={styles.row}>
                  <Pressable onPress={saveProfile} disabled={savingProfile} style={[styles.primaryBtn, savingProfile && { opacity: 0.6 }]}>
                    {savingProfile ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>{t('CONFIRM')}</Text>}
                  </Pressable>
                  <Pressable onPress={() => { setEditingProfile(false); load(); }} style={styles.ghostBtn}>
                    <Text style={styles.ghostBtnText}>{t('CANCEL')}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  appContainer: { flex: 1 },
  screenTitle: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 28,
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#fff',
    zIndex: 10,
  },
  container: { flexGrow: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#111827',
  },
  text: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#111827',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    fontFamily: FONT,
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: true,
  },
  error: {
    fontFamily: FONT,
    color: 'red',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    textAlign: 'center',
  },
  ok: {
    fontFamily: FONT,
    color: 'green',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    textAlign: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  value: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#111827',
    fontWeight: 'normal',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  row2: { flexDirection: 'row', gap: 12 },
  segmentWrap: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  segmentBtnActive: { backgroundColor: '#111827', borderColor: '#111827' },
  segmentText: { color: '#111827', fontFamily: FONT, fontWeight: 'normal', fontSize: 16, lineHeight: 20, includeFontPadding: true },
  segmentTextActive: { color: '#fff', fontFamily: FONT, fontWeight: 'normal', fontSize: 16, lineHeight: 20, includeFontPadding: true },
  primaryBtn: { flex: 1, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontFamily: FONT, fontWeight: 'normal', fontSize: 16, lineHeight: 20, includeFontPadding: true },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  ghostBtnText: { color: '#111827', fontFamily: FONT, fontWeight: 'normal', fontSize: 16, lineHeight: 20, includeFontPadding: true },
  buttonContainer: {
    marginTop: 20,
  },
  modalOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    zIndex: 999,
  },

  // badges for recovery status
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.4)' },     // green
  badgeWarn: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)' },   // red
  badgeText: { fontFamily: FONT, fontSize: 13, includeFontPadding: true },
  badgeTextOk: { color: '#10B981' },
  badgeTextWarn: { color: '#EF4444' },
})
