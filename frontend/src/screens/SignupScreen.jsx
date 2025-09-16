// src/screens/SignupScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiPost, API_BASE_DEBUG } from '../config/api';
import { calcBMI, classifyBMI } from '../utils/bmi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

const FONT = 'DungGeunMo';
const isValidEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
const onlyDigits = (s = '') => s.replace(/\D+/g, '').slice(0, 6);

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });

  let auth = null;
  try { auth = useAuth?.(); } catch { auth = null; }

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('F'); // 'F' | 'M' (백엔드 enum은 [M, F])
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);

  // 이메일 인증
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [leftSec, setLeftSec] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const tickRef = useRef(null);

  const endpoint = useMemo(() => `${API_BASE_DEBUG}/api/auth/signup`, []);

  useEffect(() => {
    if (leftSec <= 0 && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [leftSec]);

  function startTimer(sec = 300) {
    setLeftSec(sec);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setLeftSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  }

  async function signupFallback(payload) {
    const res = await apiPost('/api/auth/signup', payload);
    return !!res;
  }

  const onSubmit = async () => {
    if (!id || !password || !weight || !age || !gender || !height) {
      return Alert.alert('필수 입력', '모든 항목을 입력해 주세요.');
    }
    if (!isValidEmail(id)) return Alert.alert('형식 오류', '이메일 형식이 올바르지 않습니다.');
    if (String(password).length < 8) return Alert.alert('형식 오류', '비밀번호는 8자리 이상이어야 합니다.');

    const w = Number(weight);
    const a = Number(age);
    const h = Number(height);
    if ([w, a, h].some(Number.isNaN)) return Alert.alert('형식 오류', '나이/체중/키는 숫자로 입력하세요.');
    if (a > 150) return Alert.alert('형식 오류', '나이는 150 이하로 입력하세요.');

    const payload = {
      id: id.trim(),
      password,
      weight: w,
      age: a,
      gender,      // 'M' 또는 'F'
      height: h,
    };

    try {
      setLoading(true);
      const ok = auth?.signup ? await auth.signup(payload) : await signupFallback(payload);
      if (!ok) return Alert.alert('가입 실패', '다시 시도해 주세요.');

      await AsyncStorage.multiSet([
        ['@profile/prefill', JSON.stringify({ id: payload.id, email: payload.id, weight: w, height: h, age: a, gender: payload.gender })],
        ['goal_draft', JSON.stringify({ weight: w, height: h, age: a, gender: payload.gender })],
        ['@avatar/category_prefill', String(classifyBMI(calcBMI(w, h)))],
      ]);

      // 백엔드가 가입 시 인증코드를 즉시 발송하므로 바로 인증 단계로 전환
      setSent(true);
      startTimer(300);

      Alert.alert('가입 완료', '인증번호가 이메일로 발송되었어요. 아래에 입력해 주세요.');
    } catch (e) {
      Alert.alert('가입 실패', e?.message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // @RequestParam email 호환: 바디/헤더 없이 POST
  async function requestVerificationEmail_NoBody(email) {
    try {
      setResendLoading(true);
      const url = `${API_BASE_DEBUG}/api/email/resend?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await safeJson(res);
      if (res.ok && data?.success) {
        setSent(true);
        startTimer(300);
        return true;
      }
      Alert.alert('발송 실패', data?.message ?? `코드 발송에 실패했습니다 (HTTP ${res.status})`);
      return false;
    } catch (e) {
      Alert.alert('네트워크 오류', e?.message ?? '잠시 후 다시 시도해 주세요.');
      return false;
    } finally {
      setResendLoading(false);
    }
  }

  async function verifyEmailCode() {
    const token = onlyDigits(code);
    if (token.length !== 6) return Alert.alert('형식 오류', '6자리 인증번호를 입력해 주세요.');
    try {
      setVerifyLoading(true);
      const res = await apiPost('/api/email/verify', { token });
      if (res?.success) {
        Alert.alert('인증 완료', '이메일 인증이 완료되었어요! 로그인해주세요.');
        navigation.replace('Login');
      } else {
        Alert.alert('인증 실패', res?.message ?? '인증에 실패했어요.');
      }
    } catch (e) {
      Alert.alert('서버 오류', e?.message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function safeJson(res) {
    try { const t = await res.text(); return t ? JSON.parse(t) : {}; }
    catch { return {}; }
  }

  if (!fontsLoaded) return null;

  const inputStyle = { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontFamily: FONT };
  const Button = ({ title, onPress, disabled, bg = '#111827', light = false, style }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[{ backgroundColor: light ? '#e5e7eb' : bg, padding: 14, borderRadius: 10, opacity: disabled ? 0.6 : 1 }, style]}
    >
      <Text style={{ color: light ? '#111' : '#fff', textAlign: 'center', fontFamily: FONT }}>{title}</Text>
    </TouchableOpacity>
  );
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: insets.top + 80, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 36, fontFamily: FONT, marginBottom: 20, textAlign: 'center' }}>SIGNUP</Text>

        {/* 기본 가입 입력 */}
        <TextInput value={id} onChangeText={setId} placeholder="이메일(ID)" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" inputMode="email" style={inputStyle} />
        <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호 (8자리 이상)" secureTextEntry autoCapitalize="none" style={inputStyle} />
        <TextInput value={age} onChangeText={setAge} placeholder="나이" keyboardType="numeric" style={inputStyle} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setGender('F')} style={{ flex: 1, backgroundColor: gender === 'F' ? '#111827' : '#e5e7eb', padding: 12, borderRadius: 10 }}>
            <Text style={{ fontFamily: FONT, color: gender === 'F' ? '#fff' : '#111', textAlign: 'center' }}>여성(F)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setGender('M')} style={{ flex: 1, backgroundColor: gender === 'M' ? '#111827' : '#e5e7eb', padding: 12, borderRadius: 10 }}>
            <Text style={{ fontFamily: FONT, color: gender === 'M' ? '#fff' : '#111', textAlign: 'center' }}>남성(M)</Text>
          </TouchableOpacity>
        </View>
        <TextInput value={weight} onChangeText={setWeight} placeholder="체중 (kg)" keyboardType="numeric" style={inputStyle} />
        <TextInput value={height} onChangeText={setHeight} placeholder="키 (cm)" keyboardType="numeric" style={inputStyle} />

        <Button title={loading ? '처리 중…' : '계정 만들기'} onPress={onSubmit} disabled={loading} bg="#10b981" />

        {/* ───────── 이메일 인증 섹션 ───────── */}
        <View style={{ marginTop: 24, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 }}>
          <Text style={{ fontFamily: FONT, fontSize: 18, marginBottom: 8 }}>이메일 인증</Text>
          <Text style={{ fontFamily: FONT, color: '#6b7280', marginBottom: 10 }}>
            가입하면 인증코드가 자동 발송돼요. 필요하면 아래에서 재발송할 수 있어요.
          </Text>

          <Button
            title={resendLoading ? '발송 중…' : sent && leftSec > 0 ? `재발송 (대기 ${mmss(leftSec)})` : '인증번호 발송'}
            onPress={() => {
              if (!isValidEmail(id)) return Alert.alert('형식 오류', '올바른 이메일을 입력하세요.');
              if (sent && leftSec > 0) return;
              requestVerificationEmail_NoBody(id.trim());
            }}
            disabled={resendLoading || (sent && leftSec > 0)}
            bg="#2563eb"
          />

          <View style={{ height: 10 }} />

          <TextInput
            value={code}
            onChangeText={(t) => setCode(onlyDigits(t))}
            placeholder="인증코드 6자리"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            style={{ ...inputStyle, textAlign: 'center', letterSpacing: 6, fontSize: 20 }}
          />

          <View style={{ height: 8 }} />
          <Button
            title={verifyLoading ? '확인 중…' : '인증 확인'}
            onPress={verifyEmailCode}
            disabled={verifyLoading || code.length !== 6}
          />
        </View>
        {/* ───────── 이메일 인증 섹션 끝 ───────── */}

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#6b7280', fontFamily: FONT }}>이미 계정이 있나요? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={{ color: '#2563eb', fontFamily: FONT }}>로그인</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
