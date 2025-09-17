// src/screens/RecoveryScreens.js

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../i18n/I18nContext';
import { apiGet, apiPost } from '../config/api';
import { useFonts } from 'expo-font'; // ✅ useFonts 훅을 다시 추가합니다.

const FONT = 'DungGeunMo';
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.includeFontPadding = true;

const QUESTION_SET = [
  { code: 'BIRTHPLACE', key: 'QUESTION_BIRTHPLACE' },
  { code: 'CHILDHOOD_AREA', key: 'QUESTION_CHILDHOOD_AREA' },
  { code: 'PET_NAME', key: 'QUESTION_PET_NAME' },
  { code: 'MOTHER_NAME', key: 'QUESTION_MOTHER_NAME' },
  { code: 'ROLE_MODEL', key: 'QUESTION_ROLE_MODEL' },
];

const colors = {
  bg: '#f8f9fa',
  text: '#212529',
  mutedText: '#6c757d',
  inputBorder: '#ced4da',
  primaryBtnBg: '#2563eb',
  white: '#fff',
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontSize: 26,
    textAlign: 'center',
    color: colors.text,
  },
  labelBase: {
    fontFamily: FONT,
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: true,
  },
  inputS: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
    fontFamily: FONT,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primaryBtnBg,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: {
    textAlign: 'center',
    color: colors.white,
    fontFamily: FONT,
  },
});

export function RecoverySetupScreen() {
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [pwd, setPwd] = useState('');
  const [checking, setChecking] = useState(false);
  const nav = useNavigation();

  const msgByLang = (lang, ko, en, ja, zh) => (lang === 'en' ? en : lang === 'ja' ? ja : lang === 'zh' ? zh : ko);

  const verify = async () => { /* ... */ }; // 기존 verify 함수

  if (!fontsLoaded) return null; // ✅ 폰트가 로드될 때까지 렌더링하지 않습니다.

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.bg, flexGrow: 1 }]}>
        <Text style={styles.sectionTitle}>{t('SECURITY_QNA') || 'Security Q&A'}</Text>
        <Text style={[styles.labelBase, { color: colors.mutedText }]}>
          {msgByLang(lang, '보안 질문을 등록/수정하려면 비밀번호를 한 번 더 입력하세요.', 'Enter your password to register/update your security Q&A.', 'セキュリティQ&Aを登録・修正するにはパスワードを再入力してください。', '要登记/修改安全问答，请再次输入密码。')}
        </Text>
        <TextInput
          value={pwd}
          onChangeText={setPwd}
          placeholder={t('PASSWORD') || '비밀번호'}
          placeholderTextColor={colors.mutedText}
          secureTextEntry
          style={styles.inputS}
        />
        <TouchableOpacity onPress={verify} disabled={checking} style={styles.primaryBtn}>
          {checking ? <ActivityIndicator color={colors.white} /> : (
            <Text style={styles.primaryBtnText}>{t('CONFIRM') || '확인'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}