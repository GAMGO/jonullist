// screens/RecoveryScreens.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useI18n } from '../i18n/I18nContext';
import { useFonts } from 'expo-font';
import { apiPost } from '../config/api';

const FONT = 'DungGeunMo';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const onlyDigits = (s = '') => s.replace(/\D+/g, '').slice(0, 6);

const API = {
  sendCode: '/api/recover/send-code', // ✅ 이메일로 복구코드 발송
  verifyEmail: '/api/email/verify',   // ✅ 6자리 코드 검증 → recoveryToken 리턴(백엔드에서 purpose=RECOVERY 처리)
  reset: '/api/recover/reset',        // ✅ recoveryToken + 새 비번으로 재설정
  findId: '/api/recover/find-id',     // (이름/월/일/성별) → { id, questions? } 하지만 지금은 메일 인증으로 진행
};

/* ---------- 공용 드롭다운 ---------- */
function Dropdown({ value, onChange, options, labelRenderer }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.selectBox, pressed && { opacity: 0.85 }]}
      >
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.selectText}>
          {selected ? labelRenderer(selected) : '—'}
        </Text>
        <Text style={styles.selectArrow}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.modalCard}>
          <ScrollView bounces={false} style={{ maxHeight: 320 }}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.optionRow, active && styles.optionRowActive, pressed && { opacity: 0.9 }]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {labelRenderer(opt)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/* ======================
 * 1) 이메일 입력 → 코드 발송
 * ====================== */
function StartScreen({ t, loginId, setLoginId, onCodeSent, goFind }) {
  const [loading, setLoading] = useState(false);

  const sendCode = async (email) => {
    try {
      setLoading(true);
      // 서버: { id, purpose: 'RECOVERY' } 로 코드 메일 발송
      const res = await apiPost(API.sendCode, { id: email.trim(), purpose: 'RECOVERY' });
      if (!res) throw new Error();
      onCodeSent(); // 상위에서 타이머 시작 및 화면 전환
    } catch (e) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ID') || '해당 이메일을 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!loginId) {
      Alert.alert(t('ALERT_WARNING'), t('INPUT_REQUIRED'));
      return;
    }
    await sendCode(loginId);
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_RECOVERY') || '비밀번호 복구'}</Text>
      <Text style={styles.label}>{t('ENTER_EMAIL') || '이메일 입력'}</Text>
      <TextInput
        style={styles.input}
        value={loginId}
        onChangeText={setLoginId}
        placeholder={t('PLACEHOLDER_EMAIL') || 'you@example.com'}
        placeholderTextColor="rgba(0,0,0,0.35)"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable onPress={handleStart} style={styles.primaryBtn} disabled={loading}>
        <Text style={styles.primaryBtnText}>
          {loading ? (t('PROCESSING') || '처리 중...') : (t('SEND_VERIFICATION_CODE') || '인증코드 보내기')}
        </Text>
      </Pressable>

      {/* 아이디 모르면 이름/월/일/성별로 찾기 */}
      <Pressable onPress={goFind} style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_FIND_ID') || '아이디 찾기'}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * 2) 아이디 찾기 → 찾은 이메일로 코드 발송
 * ====================== */
function FindIdScreen({ t, setLoginId, onFoundAndSent, goBack }) {
  const [name, setName] = useState('');
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [gender, setGender] = useState('F');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert(t('ALERT_WARNING'), t('INPUT_REQUIRED_NAME') || '이름을 입력하세요.');
      return;
    }
    try {
      setLoading(true);
      const mm = String(birthMonth).padStart(2, '0');
      const dd = String(birthDay).padStart(2, '0');
      const res = await apiPost(API.findId, { name: name.trim(), birth: `${mm}-${dd}`, gender });
      const foundId = res?.data?.id;
      if (!foundId) throw new Error('NO_ID');

      // 아이디(=이메일) 저장
      setLoginId(foundId);

      // 찾은 이메일로 코드 발송
      await apiPost(API.sendCode, { id: foundId, purpose: 'RECOVERY' });

      onFoundAndSent(); // 상위에서 타이머 시작 + 화면 전환
    } catch (e) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ID') || '일치하는 사용자 정보가 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_FIND_ID') || '아이디 찾기'}</Text>

      <Text style={styles.label}>{t('LABEL_NAME') || '이름'}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t('PLACEHOLDER_NAME') || '이름'}
        placeholderTextColor="rgba(0,0,0,0.35)"
      />

      <Text style={[styles.label, { marginTop: 8 }]}>{t('LABEL_BIRTH_MONTH') || '월'}</Text>
      <Dropdown
        value={birthMonth}
        onChange={setBirthMonth}
        options={MONTHS.map((m) => ({ value: m }))}
        labelRenderer={(opt) => String(opt.value)}
      />

      <Text style={[styles.label, { marginTop: 8 }]}>{t('LABEL_BIRTH_DAY') || '일'}</Text>
      <Dropdown
        value={birthDay}
        onChange={setBirthDay}
        options={DAYS.map((d) => ({ value: d }))}
        labelRenderer={(opt) => String(opt.value)}
      />

      <Text style={[styles.label, { marginTop: 8 }]}>{t('LABEL_GENDER') || '성별'}</Text>
      <Dropdown
        value={gender}
        onChange={setGender}
        options={[{ value: 'F' }, { value: 'M' }]}
        labelRenderer={(opt) => (opt.value === 'F' ? (t('GENDER_FEMALE') || '여') : (t('GENDER_MALE') || '남'))}
      />

      <Pressable onPress={submit} style={[styles.primaryBtn, { marginTop: 10 }]} disabled={loading}>
        <Text style={styles.primaryBtnText}>{loading ? (t('PROCESSING') || '처리 중...') : (t('BTN_NEXT') || '다음')}</Text>
      </Pressable>

      <Pressable onPress={goBack} style={[styles.primaryBtn, { backgroundColor: '#6B7280' }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_BACK') || '뒤로'}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * 3) 코드 검증 → recoveryToken 획득
 * ====================== */
function VerifyCodeScreen({ t, leftSec, startTimer, setRecoveryToken, goReset, loginId }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const verify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('FORMAT_ERROR'), t('VERIFICATION_CODE_PH') || '인증코드는 6자리 숫자입니다.');
      return;
    }
    try {
      setVerifying(true);
      // 서버: { token } → { success, recoveryToken? }
      const res = await apiPost(API.verifyEmail, { token: code, purpose: 'RECOVERY' });
      if (res?.data?.recoveryToken) {
        setRecoveryToken(res.data.recoveryToken);
        goReset();
      } else if (res?.success) {
        // 일부 서버는 success만 주는 경우 → 별도 교환 엔드포인트 필요시 여기에 추가
        Alert.alert(t('VERIFICATION_DONE') || '인증 완료', t('VERIFICATION_DONE_ALERT') || '다음 단계로 진행합니다.');
        goReset();
      } else {
        Alert.alert(t('VERIFICATION_FAIL') || '인증 실패', res?.message ?? (t('VERIFICATION_FAIL_MSG') || '인증코드를 확인해 주세요.'));
      }
    } catch (e) {
      Alert.alert(t('SERVER_ERROR') || '서버 오류', e?.message ?? (t('TRY_AGAIN') || '다시 시도해 주세요.'));
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      if (leftSec > 0) return;
      setResending(true);
      await apiPost(API.sendCode, { id: loginId.trim(), purpose: 'RECOVERY' });
      startTimer(300);
    } catch {
      Alert.alert(t('SERVER_ERROR') || '서버 오류', t('TRY_AGAIN') || '다시 시도해 주세요.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_VERIFY_EMAIL') || '이메일 인증'}</Text>
      <Text style={[styles.label, { color: '#16a34a', marginBottom: 8 }]}>
        {t('VERIFICATION_SENT_MSG') || '인증코드를 이메일로 보냈습니다.'}
      </Text>
      <Text style={[styles.label, { color: '#6b7280', marginBottom: 10 }]}>
        {leftSec > 0 ? (t('RESEND_WAIT', { time: mmss(leftSec) }) || `재전송 대기: ${mmss(leftSec)}`) : (t('RESEND_HINT') || '재전송이 가능합니다.')}
      </Text>

      <TextInput
        value={code}
        onChangeText={(text) => setCode(onlyDigits(text))}
        placeholder={t('VERIFICATION_CODE') || '인증코드 6자리'}
        keyboardType="number-pad"
        maxLength={6}
        style={{ ...styles.input, textAlign: 'center', letterSpacing: 6, fontSize: 20 }}
      />

      <Pressable onPress={verify} style={[styles.primaryBtn, { marginTop: 10 }]} disabled={verifying || code.length !== 6}>
        <Text style={styles.primaryBtnText}>
          {verifying ? (t('CONFIRMING') || '확인 중...') : (t('CONFIRM') || '확인')}
        </Text>
      </Pressable>

      <TouchableOpacity onPress={resend} disabled={leftSec > 0 || resending} style={{ marginTop: 8, alignSelf: 'center' }}>
        <Text style={{ fontFamily: FONT, color: leftSec > 0 ? '#9ca3af' : '#2563eb' }}>
          {resending ? (t('PROCESSING') || '처리 중...') : (t('RESEND_CODE') || '인증코드 재전송')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ======================
 * 4) 비밀번호 재설정
 * ====================== */
function ResetScreen({ t, recoveryToken, goStart }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (!recoveryToken) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_RESET_FAIL') || '변경 실패');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_MISMATCH') || '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_MIN_LENGTH') || '8자리 이상 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      await apiPost(API.reset, { recoveryToken, newPassword });
      Alert.alert(t('ALERT_SUCCESS'), t('ALERT_PW_RESET_SUCCESS') || '비밀번호가 변경되었습니다.');
      goStart();
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_RESET_FAIL') || '변경 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_RESET_PW') || '비밀번호 재설정'}</Text>
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
      <Pressable onPress={handleReset} style={styles.primaryBtn} disabled={saving}>
        <Text style={styles.primaryBtnText}>{saving ? (t('PROCESSING') || '처리 중...') : (t('BTN_RESET_PW') || '변경')}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * Root
 * ====================== */
export default function RecoveryScreens({ route }) {
  const { t } = useI18n();
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });

  const initial = route?.params?.initial || 'start';
  const prefillEmail = route?.params?.email || '';

  const [currentScreen, setCurrentScreen] = useState(initial);
  const [loginId, setLoginId] = useState(prefillEmail);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [leftSec, setLeftSec] = useState(0);
  const tickRef = useRef(null);

  useEffect(() => {
    if (leftSec <= 0 && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [leftSec]);

  const startTimer = (sec = 300) => {
    setLeftSec(sec);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setLeftSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  };

  const goStart = () => setCurrentScreen('start');
  const goFind = () => setCurrentScreen('findId');
  const goVerify = () => setCurrentScreen('verify');
  const goReset = () => setCurrentScreen('reset');

  // 시작/찾기에서 코드 발송 후 공통 처리
  const onCodeSent = () => {
    startTimer(300);
    goVerify();
  };

  if (!fontsLoaded) return <ActivityIndicator size="large" color="#0000ff" />;

  const render = () => {
    switch (currentScreen) {
      case 'start':
        return (
          <StartScreen
            t={t}
            loginId={loginId}
            setLoginId={setLoginId}
            onCodeSent={onCodeSent}
            goFind={goFind}
          />
        );
      case 'findId':
        return (
          <FindIdScreen
            t={t}
            setLoginId={setLoginId}
            onFoundAndSent={onCodeSent}
            goBack={goStart}
          />
        );
      case 'verify':
        return (
          <VerifyCodeScreen
            t={t}
            leftSec={leftSec}
            startTimer={startTimer}
            setRecoveryToken={setRecoveryToken}
            goReset={goReset}
            loginId={loginId}
          />
        );
      case 'reset':
        return <ResetScreen t={t} recoveryToken={recoveryToken} goStart={goStart} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.appContainer}>{render()}</ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    position: 'absolute',
    left: 20,
    right: 20,
    top: '25%',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 6,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  optionRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginVertical: 4 },
  optionRowActive: { backgroundColor: 'rgba(59,130,246,0.08)' },
  optionText: { fontFamily: FONT, fontSize: 16, color: '#111827' },
  optionTextActive: { color: '#1D4ED8' },
});
