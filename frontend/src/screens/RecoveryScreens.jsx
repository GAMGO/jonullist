import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TextInput, Button, Alert, ActivityIndicator,
    ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../i18n/I18nContext';
import { useFonts } from 'expo-font';

const FONT = 'DungGeunMo';

// 백엔드 RecoveryQuestionCode.java와 일치하는 질문 목록
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
    reset: '/recover/reset'
};

const colors = {
    bg: '#f8f9fa',
    text: '#212529',
    mutedText: '#6c757d',
    inputBorder: '#ced4da',
    primaryBtnBg: '#2563eb',
    white: '#fff',
};

// 가상의 API 호출 함수 (실제 환경에 맞게 수정 필요)
async function apiPost(url, data) {
    console.log(`POST to ${url} with data:`, data);
    if (url === API.start) {
        // 복구 질문 2개 임의로 반환
        const pickedQuestions = QUESTIONS.slice(0, 2).map(q => q.code);
        return { data: { id: data.id, questions: pickedQuestions } };
    }
    if (url === API.verify) {
        // 임시 토큰 반환
        return { data: { recoveryToken: 'mock-recovery-token' } };
    }
    return { data: { success: true } };
}

async function apiPut(url, data) {
    console.log(`PUT to ${url} with data:`, data);
    return { data: { success: true } };
}

export const RecoveryScreens = () => {
    const { t } = useI18n();
    const [currentScreen, setCurrentScreen] = useState('start');
    const [loginId, setLoginId] = useState('');
    const [recoveryToken, setRecoveryToken] = useState('');
    const [questionsToAnswer, setQuestionsToAnswer] = useState([]);
    const [answers, setAnswers] = useState({});

    const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });

    if (!fontsLoaded) return <ActivityIndicator size="large" color="#0000ff" />;

    // Start Screen
    const StartScreen = () => {
        const handleStartRecovery = async () => {
            if (!loginId) {
                Alert.alert(t('ALERT_WARNING'), t('INPUT_REQUIRED'));
                return;
            }
            try {
                const response = await apiPost(API.start, { id: loginId });
                setQuestionsToAnswer(response.data.questions);
                setCurrentScreen('verify');
            } catch (error) {
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
                <Button title={t('BTN_RECOVER_START')} onPress={handleStartRecovery} />
            </View>
        );
    };

    // Verify Screen
    const VerifyScreen = () => {
        const handleVerifyAnswers = async () => {
            if (Object.keys(answers).length !== questionsToAnswer.length) {
                Alert.alert(t('ALERT_WARNING'), t('ALERT_ANSWER_ALL_QUESTIONS'));
                return;
            }
            try {
                const answersArray = questionsToAnswer.map(code => ({
                    code,
                    answer: answers[code]
                }));
                const response = await apiPost(API.verify, { id: loginId, answers: answersArray });
                setRecoveryToken(response.data.recoveryToken);
                setCurrentScreen('reset');
            } catch (error) {
                Alert.alert(t('ALERT_ERROR'), t('ALERT_INVALID_ANSWER'));
            }
        };

        return (
            <View style={styles.screenContainer}>
                <Text style={styles.title}>{t('TITLE_VERIFY_ANSWERS')}</Text>
                {questionsToAnswer.map((code) => (
                    <View key={code} style={styles.questionBlock}>
                        <Text style={styles.label}>{t(QUESTIONS.find(q => q.code === code)?.labelKey || 'TEXT_QUESTION_NOT_FOUND')}</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => setAnswers({ ...answers, [code]: text })}
                            value={answers[code] || ''}
                            placeholder={t('PLACEHOLDER_ANSWER')}
                        />
                    </View>
                ))}
                <Button title={t('BTN_VERIFY_ANSWERS')} onPress={handleVerifyAnswers} />
            </View>
        );
    };

    // Reset Password Screen
    const ResetScreen = () => {
        const [newPassword, setNewPassword] = useState('');
        const [confirmPassword, setConfirmPassword] = useState('');

        const handleResetPassword = async () => {
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
            } catch (error) {
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
                <Button title={t('BTN_RESET_PW')} onPress={handleResetPassword} />
            </View>
        );
    };

    // Set Questions Screen (기존 RecoverySetup/SecurityQnaManager 로직)
    const SetQuestionsScreen = () => {
        const [qna, setQna] = useState(QUESTIONS.slice(0, 3).map(q => ({ ...q, answer: '' })));
        const [confirmAnswers, setConfirmAnswers] = useState(QUESTIONS.slice(0, 3).map(q => ({ ...q, answer: '' })));

        const handleSaveQuestions = async () => {
            const payload = qna.map((q, index) => {
                const answer = q.answer.trim();
                const confirm = confirmAnswers[index].answer.trim();

                if (!answer || answer !== confirm) {
                    Alert.alert(t('ALERT_ERROR'), t('ALERT_ANSWERS_MISMATCH'));
                    return null;
                }

                return {
                    code: q.code,
                    answer: answer,
                    confirm: confirm,
                };
            }).filter(item => item !== null);

            if (payload.length < 3) {
                Alert.alert(t('ALERT_ERROR'), t('ALERT_ANSWER_ALL_QUESTIONS'));
                return;
            }

            try {
                await apiPut(API.set, { answers: payload });
                Alert.alert(t('ALERT_SUCCESS'), t('ALERT_QUESTIONS_SAVE_SUCCESS'));
                // 성공 시 화면 이동 로직 추가
            } catch (error) {
                Alert.alert(t('ALERT_ERROR'), t('ALERT_SAVE_QUESTIONS_FAIL'));
            }
        };

        return (
            <View style={styles.screenContainer}>
                <Text style={styles.title}>{t('TITLE_SET_QUESTIONS')}</Text>
                {qna.map((q, index) => (
                    <View key={q.code} style={styles.questionBlock}>
                        <Text style={styles.label}>{t(q.labelKey)}</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => {
                                const newQna = [...qna];
                                newQna[index].answer = text;
                                setQna(newQna);
                            }}
                            value={q.answer}
                            placeholder={t('PLACEHOLDER_ANSWER')}
                        />
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => {
                                const newConfirms = [...confirmAnswers];
                                newConfirms[index].answer = text;
                                setConfirmAnswers(newConfirms);
                            }}
                            value={confirmAnswers[index].answer}
                            placeholder={t('PLACEHOLDER_ANSWER')}
                        />
                    </View>
                ))}
                <Button title={t('BTN_SAVE_QUESTIONS')} onPress={handleSaveQuestions} />
            </View>
        );
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case 'start':
                return <StartScreen />;
            case 'verify':
                return <VerifyScreen />;
            case 'reset':
                return <ResetScreen />;
            case 'setQuestions':
                return <SetQuestionsScreen />;
            default:
                return <StartScreen />;
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
            <ScrollView contentContainerStyle={styles.appContainer}>
                {renderScreen()}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    appContainer: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    screenContainer: {
        marginBottom: 20,
    },
    title: {
        fontFamily: FONT,
        fontSize: 26,
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        fontFamily: FONT,
        fontSize: 16,
        marginBottom: 5,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        fontFamily: FONT,
    },
    questionBlock: {
        marginBottom: 15,
    },
});