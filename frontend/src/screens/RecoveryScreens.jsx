import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, Button, Alert,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useI18n } from '../i18n/I18nContext';
import { useFonts } from 'expo-font';

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

const API = {
  set: '/profile/security-questions',
  start: '/recover/start',
  verify: '/recover/verify',
  reset: '/recover/reset',
};

// ---- 가짜 API (실서비스로 대체해서 쓰면 됨)
async function apiPost(url, data) {
  if (url === API.start) {
    const picked = QUESTIONS.slice(0, 2).map(q => q.code);
    return { data: { id: data.id, questions: picked } };
  }
  if (url === API.verify) {
    return { data: { recoveryToken: 'mock-recovery-token' } };
  }
  if (url === API.reset) {
    return { data: { success: true } };
  }
  return { data: { success: true } };
}
async function apiPut(url, data) {
  return { data: { success: true } };
}

function StartScreen({ t, loginId, setLoginId, setQuestionsToAnswer, setCurrentScreen }) {
  const handleStart = async () => {
    if (!loginId) {
      Alert.alert(t('ALERT_WARNING'), t('INPUT_REQUIRED'));
      return;
    }
    try {
      const res = await apiPost(API.start, { id: loginId });
      setQuestionsToAnswer(res.data.questions || []);
      setCurrentScreen('verify');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ID'));
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('RECOVERY_TITLE')}</Text>
      <Text style={styles.label}>{t('ENTER_EMAIL')}</Text>
      <TextInput
        style={styles.input}
        value={loginId}
        onChangeText={setLoginId}
        placeholder={t('PLACEHOLDER_EMAIL')}
      />
      <Button title={t('BTN_RECOVER_START')} onPress={handleStart} />
    </View>
  );
}

function VerifyScreen({ t, loginId, questionsToAnswer, answers, setAnswers, setCurrentScreen, setRecoveryToken }) {
  const handleVerify = async () => {
    if (Object.keys(answers).length !== questionsToAnswer.length) {
      Alert.alert(t('ALERT_WARNING'), t('ALERT_ANSWER_ALL_QUESTIONS'));
      return;
    }
    try {
      const answersArray = questionsToAnswer.map(code => ({ code, answer: answers[code] }));
      const res = await apiPost(API.verify, { id: loginId, answers: answersArray });
      setRecoveryToken(res.data.recoveryToken);
      setCurrentScreen('reset');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ANSWER'));
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_VERIFY_ANSWERS')}</Text>
      {questionsToAnswer.map((code) => (
        <View key={code} style={styles.questionBlock}>
          <Text style={styles.label}>
            {t(QUESTIONS.find(q => q.code === code)?.labelKey || 'TEXT_QUESTION_NOT_FOUND')}
          </Text>
          <TextInput
            style={styles.input}
            onChangeText={(text) => setAnswers({ ...answers, [code]: text })}
            value={answers[code] || ''}
            placeholder={t('PLACEHOLDER_ANSWER')}
          />
        </View>
      ))}
      <Button title={t('BTN_VERIFY_ANSWERS')} onPress={handleVerify} />
    </View>
  );
}

function ResetScreen({ t, recoveryToken, setCurrentScreen }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_MISMATCH'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_MIN_LENGTH'));
      return;
    }
    try {
      await apiPost(API.reset, { recoveryToken, newPassword });
      Alert.alert(t('ALERT_SUCCESS'), t('ALERT_PW_RESET_SUCCESS'));
      setCurrentScreen('start');
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_PW_RESET_FAIL'));
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_RESET_PW')}</Text>
      <Text style={styles.label}>{t('LABEL_NEW_PW')}</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder={t('PLACEHOLDER_NEW_PW')}
        secureTextEntry
      />
      <Text style={styles.label}>{t('LABEL_CONFIRM_PW')}</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('PLACEHOLDER_CONFIRM_PW')}
        secureTextEntry
      />
      <Button title={t('BTN_RESET_PW')} onPress={handleReset} />
    </View>
  );
}

function SetQuestionsScreen({ t }) {
  const [qna, setQna] = useState(QUESTIONS.slice(0, 3).map(q => ({ ...q, answer: '' })));
  const [confirmAnswers, setConfirmAnswers] = useState(QUESTIONS.slice(0, 3).map(q => ({ ...q, answer: '' })));

  const handleSave = async () => {
    const payload = qna.map((q, i) => {
      const a = q.answer.trim();
      const c = confirmAnswers[i].answer.trim();
      if (!a || a !== c) return null;
      return { code: q.code, answer: a, confirm: c };
    }).filter(Boolean);

    if (payload.length < 3) {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_ANSWER_ALL_QUESTIONS'));
      return;
    }
    try {
      await apiPut(API.set, { answers: payload });
      Alert.alert(t('ALERT_SUCCESS'), t('ALERT_QUESTIONS_SAVE_SUCCESS'));
    } catch {
      Alert.alert(t('ALERT_ERROR'), t('ALERT_SAVE_QUESTIONS_FAIL'));
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>{t('TITLE_SET_QUESTIONS')}</Text>
      {qna.map((q, i) => (
        <View key={q.code} style={styles.questionBlock}>
          <Text style={styles.label}>{t(q.labelKey)}</Text>
          <TextInput
            style={styles.input}
            value={q.answer}
            onChangeText={(text) => {
              const next = [...qna];
              next[i].answer = text;
              setQna(next);
            }}
            placeholder={t('PLACEHOLDER_ANSWER')}
          />
          <TextInput
            style={styles.input}
            value={confirmAnswers[i].answer}
            onChangeText={(text) => {
              const next = [...confirmAnswers];
              next[i].answer = text;
              setConfirmAnswers(next);
            }}
            placeholder={t('PLACEHOLDER_ANSWER')}
          />
        </View>
      ))}
      <Button title={t('BTN_SAVE_QUESTIONS')} onPress={handleSave} />
    </View>
  );
}

export default function RecoveryScreens() {
  const { t } = useI18n();
  const [currentScreen, setCurrentScreen] = useState('start');
  const [loginId, setLoginId] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [questionsToAnswer, setQuestionsToAnswer] = useState([]);
  const [answers, setAnswers] = useState({});

  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });
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
        return (
          <ResetScreen
            t={t}
            recoveryToken={recoveryToken}
            setCurrentScreen={setCurrentScreen}
          />
        );
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
      <ScrollView contentContainerStyle={styles.appContainer}>
        {render()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  appContainer: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  screenContainer: { marginBottom: 20 },
  title: { fontFamily: FONT, fontSize: 26, textAlign: 'center', marginBottom: 20 },
  label: { fontFamily: FONT, fontSize: 16, marginBottom: 5 },
  input: {
    height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10, paddingHorizontal: 10, fontFamily: FONT,
  },
  questionBlock: { marginBottom: 15 },
});
