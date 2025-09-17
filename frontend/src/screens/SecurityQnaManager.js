// src/screens/SecurityQnaManager.js

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { useI18n } from '../i18n/I18nContext';
import { apiPost } from '../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font'; // ✅ useFonts 훅을 다시 추가합니다.

const FONT = 'DungGeunMo';

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
    padding: 20,
    gap: 12,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  screenTitle: {
    fontFamily: FONT,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
  },
  policyText: {
    fontFamily: FONT,
    color: colors.mutedText,
    lineHeight: 20,
  },
  label: {
    fontFamily: FONT,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONT,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    backgroundColor: colors.white,
  },
  primaryBtn: {
    backgroundColor: colors.primaryBtnBg,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    textAlign: 'center',
    color: colors.white,
    fontFamily: FONT,
  },
});

export default function SecurityQnaManager() {
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') }); // ✅ useFonts 훅을 다시 추가합니다.
  const { t } = useI18n();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [qna, setQna] = useState([
    { code: 'BIRTHPLACE', labelKey: 'QUESTION_BIRTHPLACE', answer: '' },
    { code: 'CHILDHOOD_AREA', labelKey: 'QUESTION_CHILDHOOD_AREA', answer: '' },
    { code: 'PET_NAME', labelKey: 'QUESTION_PET_NAME', answer: '' },
    { code: 'MOTHER_NAME', labelKey: 'QUESTION_MOTHER_NAME', answer: '' },
    { code: 'ROLE_MODEL', labelKey: 'QUESTION_ROLE_MODEL', answer: '' },
  ]);

  const setQ = (idx, v) => setQna(arr => arr.map((x, i) => i === idx ? ({ ...x, answer: v }) : x));

  const saveAnswers = async () => { /* ... */ }; // 기존 saveAnswers 함수

  if (!fontsLoaded) return null; // ✅ 폰트가 로드될 때까지 렌더링하지 않습니다.

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>{t('SECURITY_QNA')}</Text>
      <Text style={styles.policyText}>{t('SECURITY_POLICY')}</Text>

      {qna.map((row, idx) => (
        <View key={row.code} style={{ gap: 6 }}>
          <Text style={styles.label}>{t(row.labelKey)}</Text>
          <TextInput
            value={row.answer}
            onChangeText={(v) => setQ(idx, v)}
            placeholder={t('ANSWER')}
            placeholderTextColor={colors.mutedText}
            style={styles.input}
          />
        </View>
      ))}

      <TouchableOpacity onPress={saveAnswers} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{t('CONFIRM')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}