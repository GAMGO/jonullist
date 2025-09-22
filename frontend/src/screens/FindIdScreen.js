import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useI18n } from '../i18n/I18nContext';
import { Picker } from '@react-native-picker/picker';
import { apiPost } from '../config/api';

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

/** 이메일 마스킹 유틸(옵션) */
const maskEmail = (s = '') => {
  const [user, domain] = String(s).split('@');
  if (!user || !domain) return s;
  const maskedUser =
    user.length <= 2 ? user[0] + '*' : user[0] + '*'.repeat(Math.max(1, user.length - 2)) + user.slice(-1);
  const [host, ...rest] = domain.split('.');
  const maskedHost =
    host.length <= 2 ? host[0] + '*' : host[0] + '*'.repeat(Math.max(1, host.length - 2)) + host.slice(-1);
  return `${maskedUser}@${[maskedHost, ...rest].join('.')}`;
};

export default function FindIdScreen() {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [birthMonth, setBirthMonth] = useState(1); // 드롭다운 기본값
  const [birthDay, setBirthDay] = useState(1);     // 드롭다운 기본값
  const [gender, setGender] = useState('F');       // 백엔드 enum과 맞춤: 'M'|'F'

  // 아래는 선택 UI(유지 요청 시 사용)
  const [q1, setQ1] = useState(QUESTIONS[0].code);
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState(QUESTIONS[1].code);
  const [a2, setA2] = useState('');

  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });
  if (!fontsLoaded) return null;

  const onSubmit = async () => {
    if (!name?.trim()) {
      Alert.alert(t('INPUT_REQUIRED') || '입력 필요', t('INPUT_REQUIRED_NAME') || '이름을 입력하세요.');
      return;
    }
    if (!birthMonth || !birthDay) {
      Alert.alert(t('INPUT_REQUIRED') || '입력 필요', t('INPUT_REQUIRED_BIRTH') || '생월/생일을 선택하세요.');
      return;
    }
    if (!['M', 'F'].includes(gender)) {
      Alert.alert(t('INPUT_REQUIRED') || '입력 필요', t('INPUT_REQUIRED_GENDER') || '성별을 선택하세요.');
      return;
    }

    const mm = String(birthMonth).padStart(2, '0');
    const dd = String(birthDay).padStart(2, '0');
    const payload = {
      name: name.trim(),
      birth: `${mm}-${dd}`, // 백엔드: "MM-DD"
      gender,               // 'M' | 'F'
    };

    try {
      const res = await apiPost('/api/recover/find-id', payload);
      // 백엔드: id가 곧 이메일
      const email = res?.data?.id;
      const qs = res?.data?.questions || [];

      if (email) {
        const showFull = true; // 전체 노출 원치 않으면 false로 변경
        const display = showFull ? email : maskEmail(email);
        Alert.alert(t('FIND_ID_RESULT') || '아이디(이메일) 찾기 결과', display);
        return;
      }

      if (qs.length) {
        // 백엔드가 아직 이메일을 안 실어 보낼 때 대비(폴백)
        Alert.alert(
          t('FIND_ID_RESULT') || '아이디(이메일) 찾기 결과',
          t('FIND_ID_QUESTIONS_READY') || '본인확인 질문 2개가 준비되었습니다.'
        );
        return;
      }

      Alert.alert(t('ERR') || '오류', t('INVALID_ID') || '일치하는 사용자 정보가 없습니다.');
    } catch (e) {
      Alert.alert(t('ERR')  || '오류', t('INVALID_ID') || '일치하는 사용자 정보가 없습니다.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('FIND_ID') || '아이디 찾기'}</Text>

        {/* 이름 */}
        <Text style={styles.label}>{t('LABEL_NAME') || '이름'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('LABEL_NAME') || '이름'}
          placeholderTextColor="rgba(0,0,0,0.35)"
        />

        {/* 생월 드롭다운 */}
        <Text style={styles.label}>{t('LABEL_BIRTH_MONTH') || '생월(1-12)'}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={birthMonth}
            onValueChange={setBirthMonth}
            style={styles.picker}
            dropdownIconColor="#111827"
            mode="dropdown"
          >
            {MONTHS.map((m) => (
              <Picker.Item key={m} label={`${m}`} value={m} style={styles.pickerItem} />
            ))}
          </Picker>
        </View>

        {/* 생일 드롭다운 */}
        <Text style={styles.label}>{t('LABEL_BIRTH_DAY') || '생일(1-31)'}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={birthDay}
            onValueChange={setBirthDay}
            style={styles.picker}
            dropdownIconColor="#111827"
            mode="dropdown"
          >
            {DAYS.map((d) => (
              <Picker.Item key={d} label={`${d}`} value={d} style={styles.pickerItem} />
            ))}
          </Picker>
        </View>

        {/* 성별 (M/F) */}
        <Text style={styles.label}>{t('GENDER') || '성별'}</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            onPress={() => setGender('M')}
            style={[styles.segmentBtn, gender === 'M' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, gender === 'M' && styles.segmentTextActive]}>
              {t('GENDER_MALE') || '남성'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGender('F')}
            style={[styles.segmentBtn, gender === 'F' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, gender === 'F' && styles.segmentTextActive]}>
              {t('GENDER_FEMALE') || '여성'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* (선택) 복구 질문 UI 유지 시 */}
        <Text style={styles.sectionTitle}>{t('RECOVERY_QUESTIONS_TITLE') || '복구 질문 (선택)'}</Text>

        <Text style={styles.label}>{t('SELECT_QUESTION') || '질문 선택 1'}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={q1}
            onValueChange={setQ1}
            style={styles.picker}
            dropdownIconColor="#111827"
            mode="dropdown"
          >
            {QUESTIONS.map((q) => (
              <Picker.Item key={q.code} label={t(q.labelKey)} value={q.code} style={styles.pickerItem} />
            ))}
          </Picker>
        </View>
        <TextInput
          style={styles.input}
          value={a1}
          onChangeText={setA1}
          placeholder={t('ANSWER') || '답변 입력'}
          placeholderTextColor="rgba(0,0,0,0.35)"
        />

        <Text style={styles.label}>{t('SELECT_QUESTION') || '질문 선택 2'}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={q2}
            onValueChange={setQ2}
            style={styles.picker}
            dropdownIconColor="#111827"
            mode="dropdown"
          >
            {QUESTIONS.map((q) => (
              <Picker.Item key={q.code} label={t(q.labelKey)} value={q.code} style={styles.pickerItem} />
            ))}
          </Picker>
        </View>
        <TextInput
          style={styles.input}
          value={a2}
          onChangeText={setA2}
          placeholder={t('ANSWER') || '답변 입력'}
          placeholderTextColor="rgba(0,0,0,0.35)"
        />

        <TouchableOpacity onPress={onSubmit} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>{t('CONFIRM') || '확인'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, flexGrow: 1 },
  title: {
    fontSize: 24,
    fontFamily: FONT,
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
    lineHeight: 30,
    includeFontPadding: true,
  },
  label: {
    fontFamily: FONT,
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
    includeFontPadding: true,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontSize: 16,
    color: '#111827',
    marginTop: 8,
    marginBottom: 2,
    lineHeight: 22,
    includeFontPadding: true,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    fontFamily: FONT,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: true,
    backgroundColor: '#fff',
    textAlignVertical: 'center',
  },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 48,
    justifyContent: 'center',
  },
  segmentBtnActive: { borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.06)' },
  segmentText: { fontFamily: FONT, color: '#111827', fontSize: 15, lineHeight: 20, includeFontPadding: true },
  segmentTextActive: { color: '#2563eb' },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    height: 50,
    justifyContent: 'center',
    marginBottom: 6,
  },
  picker: { height: 50 },
  pickerItem: { fontSize: 15, lineHeight: 20, fontFamily: FONT, color: '#111827', includeFontPadding: true },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontFamily: FONT, fontSize: 16, lineHeight: 22, includeFontPadding: true },
});
