import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { useI18n } from '../i18n/I18nContext';
import { useFonts } from 'expo-font';
import { apiPost, apiPut } from '../config/api';

const FONT = 'DungGeunMo';

const QUESTIONS = [
  { code: 'PET_NAME', labelKey: 'QUESTION_PET_NAME' },
  { code: 'BIRTHPLACE', labelKey: 'QUESTION_BIRTHPLACE' },
  { code: 'MOTHER_NAME', labelKey: 'QUESTION_MOTHER_NAME' },
  { code: 'FAVORITE_TEACHER', labelKey: 'QUESTION_FAVORITE_TEACHER' },
  { code: 'FAVORITE_FOOD', labelKey: 'QUESTION_FAVORITE_FOOD' },
  { code: 'FIRST_SCHOOL', labelKey: 'QUESTION_FIRST_SCHOOL' },
  { code: 'FAVORITE_COLOR', labelKey: 'QUESTION_FAVORITE_COLOR' },
  { code: 'BEST_FRIEND', labelKey: 'QUESTION_BEST_FRIEND' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const API = {
  set: '/api/profile/security-questions',
  start: '/api/recover/start',
  verify: '/api/recover/verify',
  reset: '/api/recover/reset',
  findId: '/api/recover/find-id',
};

function Dropdown({ value, onChange, options, labelRenderer }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.selectBox, pressed && { opacity: 0.85 }]}>
        <Text style={styles.selectText}>{selected ? labelRenderer(selected) : '—'}</Text>
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
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{labelRenderer(opt)}</Text>
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
 * 1) 이메일로 복구 시작
 * ====================== */
function StartScreen({ t, loginId, setLoginId, setQuestionsToAnswer, setCurrentScreen }) {
  const handleStart = async () => {
    if (!loginId) {
      Alert.alert(t('ALERT_WARNING'), t('INPUT_REQUIRED'));
      return;
    }
    try {
      const res = await apiPost(API.start, { id: loginId.trim() });
      const picked = res?.data?.questions || [];
      if (!picked.length) {
        Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ID'));
        return;
      }
      setQuestionsToAnswer(picked);
      setCurrentScreen('verify');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ID'));
    }
  };
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_RECOVERY') || t('RECOVERY_TITLE') || '비밀번호 복구'}</Text>
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
      <Pressable onPress={handleStart} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{t('BTN_RECOVER_START') || '질문 받기'}</Text>
      </Pressable>

      {/* 아이디 찾기 이동 */}
      <Pressable onPress={() => setCurrentScreen('findId')} style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_FIND_ID') || '아이디 찾기'}</Text>
      </Pressable>

      {/* 질문 등록 화면 이동(내 계정에서 설정) */}
      <Pressable onPress={() => setCurrentScreen('setQuestions')} style={[styles.primaryBtn, { backgroundColor: '#6B7280' }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_SET_QUESTIONS') || '보안질문 설정'}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * 2) 아이디 찾기 (이름/월/일/성별)
 * ====================== */
function FindIdScreen({ t, setQuestionsToAnswer, setCurrentScreen }) {
  const [name, setName] = useState('');
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [gender, setGender] = useState('F'); // 백엔드 enum/문자와 맞추기

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert(t('ALERT_WARNING'), t('INPUT_REQUIRED_NAME') || '이름을 입력하세요.');
      return;
    }
    try {
      const mm = String(birthMonth).padStart(2, '0');
      const dd = String(birthDay).padStart(2, '0');
      // 백엔드 FindIdRequest: { name, birth, gender }
      // birth 포맷은 서버 정의에 맞게. (여기선 "MM-DD" 사용, YYYY-MM-DD면 `${yyyy}-${mm}-${dd}`로 변경)
      const res = await apiPost(API.findId, { name: name.trim(), birth: `${mm}-${dd}`, gender });
      // 컨트롤러는 new FindIdResponse(questions) 반환 → { questions: [...] }
      const qs = res?.data?.questions || res?.data || [];
      if (!qs.length) {
        Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ID') || '일치하는 사용자 정보가 없습니다.');
        return;
      }
      setQuestionsToAnswer(qs);
      setCurrentScreen('verify'); // 바로 질문 검증으로
    } catch {
      Alert.alert(t('ALERT_ERROR'), '일치하는 사용자 정보가 없습니다.');
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

      <Pressable onPress={submit} style={[styles.primaryBtn, { marginTop: 10 }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_NEXT') || '다음'}</Text>
      </Pressable>

      <Pressable onPress={() => setCurrentScreen('start')} style={[styles.primaryBtn, { backgroundColor: '#6B7280' }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_BACK') || '뒤로'}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * 3) 질문 검증 → 토큰 발급
 * ====================== */
function VerifyScreen({ t, loginId, questionsToAnswer, answers, setAnswers, setCurrentScreen, setRecoveryToken }) {
  const handleVerify = async () => {
    if (Object.keys(answers).length !== questionsToAnswer.length) {
      Alert.alert(t('ALERT_WARNING'), t('ALERT_ANSWER_ALL_QUESTIONS'));
      return;
    }
    try {
      const answersArray = questionsToAnswer.map((code) => ({ code, answer: answers[code] }));
      const res = await apiPost(API.verify, { id: loginId, answers: answersArray });
      const token = res?.data?.recoveryToken;
      if (!token) {
        Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ANSWER'));
        return;
      }
      setRecoveryToken(token);
      setCurrentScreen('reset');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ANSWER'));
    }
  };
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_VERIFY_ANSWERS') || '질문 답변'}</Text>
      {questionsToAnswer.map((code) => (
        <View key={code} style={styles.questionBlock}>
          <Text style={styles.label}>{t(QUESTIONS.find((q) => q.code === code)?.labelKey || 'TEXT_QUESTION_NOT_FOUND')}</Text>
          <TextInput
            style={styles.input}
            onChangeText={(text) => setAnswers({ ...answers, [code]: text })}
            value={answers[code] || ''}
            placeholder={t('PLACEHOLDER_ANSWER') || '정답 입력'}
            placeholderTextColor="rgba(0,0,0,0.35)"
          />
        </View>
      ))}
      <Pressable onPress={handleVerify} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{t('BTN_VERIFY_ANSWERS') || '확인'}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * 4) 토큰으로 비밀번호 재설정
 * ====================== */
function ResetScreen({ t, recoveryToken, setCurrentScreen }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_MISMATCH') || '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_MIN_LENGTH') || '8자리 이상 입력하세요.');
      return;
    }
    try {
      await apiPost(API.reset, { recoveryToken, newPassword });
      Alert.alert(t('ALERT_SUCCESS'), t('ALERT_PW_RESET_SUCCESS') || '비밀번호가 변경되었습니다.');
      setCurrentScreen('start');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_RESET_FAIL') || '변경 실패');
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
      <Pressable onPress={handleReset} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{t('BTN_RESET_PW') || '변경'}</Text>
      </Pressable>
    </View>
  );
}

/* ======================
 * 5) 내 계정에 질문 2개 등록/수정
 * ====================== */
function SetQuestionsScreen({ t }) {
  const [qna, setQna] = useState([
    { code: QUESTIONS[0].code, answer: '' },
    { code: QUESTIONS[1].code, answer: '' },
  ]);
  const usedCodes = useMemo(() => new Set(qna.map((x) => x.code)), [qna]);

  const getAvailable = (idx) => {
    const self = qna[idx].code;
    return QUESTIONS.filter((q) => q.code === self || !usedCodes.has(q.code)).map((q) => ({
      value: q.code,
      labelKey: q.labelKey,
    }));
  };

  const setCodeAt = (idx, code) => {
    setQna((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], code };
      return next;
    });
  };

  const setAnswerAt = (idx, text) => {
    setQna((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], answer: text };
      return next;
    });
  };

  const handleSave = async () => {
    const codes = qna.map((x) => x.code);
    const unique = new Set(codes);
    if (unique.size !== qna.length) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_DUPLICATE_QUESTIONS') || '같은 질문은 선택할 수 없습니다.');
      return;
    }
    const payload = qna
      .map(({ code, answer }) => {
        const a = (answer || '').trim();
        if (!a) return null;
        return { code, answer: a };
      })
      .filter(Boolean);

    if (payload.length !== qna.length) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_ANSWER_ALL_QUESTIONS') || '모든 답을 입력하세요.');
      return;
    }

    try {
      await apiPut(API.set, { answers: payload }); // 백엔드는 answers만 받음
      Alert.alert(t('ALERT_SUCCESS'), t('ALERT_QUESTIONS_SAVE_SUCCESS') || '저장되었습니다.');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_SAVE_QUESTIONS_FAIL') || '저장 실패');
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_SET_QUESTIONS') || '보안질문 설정'}</Text>
      {qna.map((row, idx) => {
        const options = getAvailable(idx);
        return (
          <View key={`slot-${idx}`} style={styles.questionBlock}>
            <Text style={styles.label}>{t('LABEL_SELECT_QUESTION') || '질문 선택'}</Text>
            <Dropdown
              value={row.code}
              onChange={(val) => setCodeAt(idx, val)}
              options={options}
              labelRenderer={(opt) => t(opt.labelKey)}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>{t('PLACEHOLDER_ANSWER') || '답 입력'}</Text>
            <TextInput
              style={styles.input}
              value={row.answer}
              onChangeText={(text) => setAnswerAt(idx, text)}
              placeholder={t('PLACEHOLDER_ANSWER') || '답 입력'}
              placeholderTextColor="rgba(0,0,0,0.35)"
            />
          </View>
        );
      })}

      <Pressable onPress={handleSave} style={[styles.primaryBtn, { marginTop: 6 }]}>
        <Text style={styles.primaryBtnText}>{t('BTN_SAVE_QUESTIONS') || '저장'}</Text>
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
  const [questionsToAnswer, setQuestionsToAnswer] = useState([]);
  const [answers, setAnswers] = useState({});

  if (!fontsLoaded) return <ActivityIndicator size="large" color="#0000ff" />;

  const render = () => {
    switch (currentScreen) {
      case 'start':
        return (
          <StartScreen
            t={t}
            loginId={loginId}
            setLoginId={setLoginId}
            setQuestionsToAnswer={setQuestionsToAnswer}
            setCurrentScreen={setCurrentScreen}
          />
        );
      case 'findId':
        return (
          <FindIdScreen
            t={t}
            setQuestionsToAnswer={setQuestionsToAnswer}
            setCurrentScreen={setCurrentScreen}
          />
        );
      case 'verify':
        return (
          <VerifyScreen
            t={t}
            loginId={loginId}
            questionsToAnswer={questionsToAnswer}
            answers={answers}
            setAnswers={setAnswers}
            setCurrentScreen={setCurrentScreen}
            setRecoveryToken={setRecoveryToken}
          />
        );
      case 'reset':
        return <ResetScreen t={t} recoveryToken={recoveryToken} setCurrentScreen={setCurrentScreen} />;
      case 'setQuestions':
        return <SetQuestionsScreen t={t} />;
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
  questionBlock: { marginBottom: 16, padding: 14, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12 },
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
  selectText: { fontFamily: FONT, fontSize: 16, color: '#111827' },
  selectArrow: { fontFamily: FONT, fontSize: 16, color: '#111827' },
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
