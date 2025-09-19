import React, { useState } from 'react'
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
} from 'react-native'
import { useFonts } from 'expo-font'
import { useI18n } from '../i18n/I18nContext'
import { Picker } from '@react-native-picker/picker'

const FONT = 'DungGeunMo'

const QUESTIONS = [
  { code: 'PET_NAME', labelKey: 'QUESTION_PET_NAME' },
  { code: 'BIRTHPLACE', labelKey: 'QUESTION_BIRTHPLACE' },
  { code: 'MOTHER_NAME', labelKey: 'QUESTION_MOTHER_NAME' },
  { code: 'FAVORITE_TEACHER', labelKey: 'QUESTION_FAVORITE_TEACHER' },
  { code: 'FAVORITE_FOOD', labelKey: 'QUESTION_FAVORITE_FOOD' },
  { code: 'FIRST_SCHOOL', labelKey: 'QUESTION_FIRST_SCHOOL' },
  { code: 'FAVORITE_COLOR', labelKey: 'QUESTION_FAVORITE_COLOR' },
  { code: 'BEST_FRIEND', labelKey: 'QUESTION_BEST_FRIEND' },
]

export default function FindIdScreen() {
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [gender, setGender] = useState('')

  const [q1, setQ1] = useState(QUESTIONS[0].code)
  const [a1, setA1] = useState('')
  const [q2, setQ2] = useState(QUESTIONS[1].code)
  const [a2, setA2] = useState('')

  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  if (!fontsLoaded) return null

  const onSubmit = () => {
    if (!name || !birthMonth || !birthDay || !gender || !a1 || !a2) {
      Alert.alert(t('INPUT_REQUIRED'), t('ANSWER_FILL'))
      return
    }
    const payload = {
      name,
      birthMonth,
      birthDay,
      gender,
      answers: [
        { code: q1, answer: a1 },
        { code: q2, answer: a2 },
      ],
    }
    Alert.alert('제출 데이터', JSON.stringify(payload, null, 2))
    // 예: fetch('/api/recover/find-id', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('FIND_ID') || '아이디 찾기'}</Text>

        <Text style={styles.label}>{t('LABEL_NAME') || '이름'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('LABEL_NAME') || '이름'}
          placeholderTextColor="rgba(0,0,0,0.35)"
        />

        <Text style={styles.label}>{t('LABEL_BIRTH_MONTH') || '생월(1-12)'}</Text>
        <TextInput
          style={styles.input}
          value={birthMonth}
          onChangeText={setBirthMonth}
          placeholder="MM"
          keyboardType="number-pad"
          placeholderTextColor="rgba(0,0,0,0.35)"
        />

        <Text style={styles.label}>{t('LABEL_BIRTH_DAY') || '생일(1-31)'}</Text>
        <TextInput
          style={styles.input}
          value={birthDay}
          onChangeText={setBirthDay}
          placeholder="DD"
          keyboardType="number-pad"
          placeholderTextColor="rgba(0,0,0,0.35)"
        />

        <Text style={styles.label}>{t('GENDER') || '성별'}</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            onPress={() => setGender('male')}
            style={[styles.segmentBtn, gender === 'male' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, gender === 'male' && styles.segmentTextActive]}>
              {t('MALE') || '남성'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGender('female')}
            style={[styles.segmentBtn, gender === 'female' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, gender === 'female' && styles.segmentTextActive]}>
              {t('FEMALE') || '여성'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('RECOVERY_QUESTIONS_TITLE') || '복구 질문'}</Text>

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
              <Picker.Item
                key={q.code}
                label={t(q.labelKey)}
                value={q.code}
                style={styles.pickerItem}
              />
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

        <Text style={styles.label}>{t('ANSWER') || '질문 선택 2'}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={q2}
            onValueChange={setQ2}
            style={styles.picker}
            dropdownIconColor="#111827"
            mode="dropdown"
          >
            {QUESTIONS.map((q) => (
              <Picker.Item
                key={q.code}
                label={t(q.labelKey)}
                value={q.code}
                style={styles.pickerItem}
              />
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
  )
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
})
