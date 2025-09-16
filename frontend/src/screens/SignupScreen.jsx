// src/screens/SignupScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity, // ✅ 일관성을 위해 TouchableOpacity 사용
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
const isValidEmail = (v = '') => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v).trim());
const onlyDigits = (s = '') => s.replace(/\\D+/g, '').slice(0, 6);

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });

  let auth = null;
  try { auth = useAuth?.(); } catch { auth = null; }

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 이메일 인증 관련 상태
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [leftSec, setLeftSec] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const timerId = useRef();

  useEffect(() => {
    if (leftSec <= 0) {
      if (timerId.current) clearTimeout(timerId.current);
      return;
    }
    timerId.current = setTimeout(() => {
      setLeftSec(leftSec - 1);
    }, 1000);
    return () => clearTimeout(timerId.current);
  }, [leftSec]);

  const requestVerificationEmail = async () => {
    setResendLoading(true);
    try {
      const response = await apiPost('/api/email/send', { email: id.trim() });
      if (response.success) {
        Alert.alert('성공', '인증번호가 발송되었습니다.');
        setSent(true);
        setLeftSec(180);
      } else {
        Alert.alert('오류', response.message);
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setResendLoading(false);
    }
  };

  const requestVerificationEmail_NoBody = async (email) => {
    setResendLoading(true);
    try {
      const response = await fetch(`${API_BASE_DEBUG}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('성공', '인증번호가 발송되었습니다.');
        setSent(true);
        setLeftSec(180);
      } else {
        Alert.alert('오류', data.message);
      }
    } catch (e) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setResendLoading(false);
    }
  };

  const verifyEmailCode = async () => {
    setVerifyLoading(true);
    try {
      const response = await fetch(`${API_BASE_DEBUG}/api/email/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: code, email: id.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('성공', '이메일 인증이 완료되었습니다. 회원가입을 계속해주세요.');
        // 성공 시 인증 섹션 숨기기
        setSent(false);
        setLeftSec(0);
      } else {
        Alert.alert('오류', data.message);
      }
    } catch (e) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSignup = async () => {
    setErrorMessage('');
    try {
      setLoading(true);

      const payload = {
        id: id.trim(),
        password,
        age: Number(age),
        weight: Number(weight),
        height: Number(height),
        gender: gender.toUpperCase(),
      };
      
      if (
        Number.isNaN(payload.age) ||
        Number.isNaN(payload.weight) ||
        Number.isNaN(payload.height)
      ) {
        setLoading(false);
        return Alert.alert('형식 오류', '나이/체중/키는 숫자로 입력하세요.');
      }
      
      const response = await apiPost('/auth/signup', payload);

      if (response.success) {
        Alert.alert('가입 성공', '회원가입이 완료되었습니다.');
        navigation.navigate('Login');
      } else {
        setErrorMessage(response.message || '회원가입 실패');
      }
    } catch (error) {
      setErrorMessage(error.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = useMemo(
    () => ({
      width: '100%',
      height: 50,
      backgroundColor: '#f1f5f9',
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: FONT,
      color: '#1a202c',
    }),
    [],
  );

  const buttonStyle = useMemo(
    () => ({
      width: '100%',
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    }),
    [],
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ backgroundColor: '#fff' }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            paddingTop: insets.top + 24,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              marginBottom: 24,
              fontFamily: FONT,
              color: '#1d4ed8',
            }}
          >
            회원가입
          </Text>

          <View style={{ width: '100%', gap: 10 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>아이디 (이메일)</Text>
            <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
              <TextInput
                value={id}
                onChangeText={setId}
                placeholder="이메일 주소"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ ...inputStyle, flex: 1 }}
              />
              <TouchableOpacity
                style={{
                  ...buttonStyle,
                  width: 120,
                  backgroundColor: resendLoading || (sent && leftSec > 0) ? '#cbd5e1' : '#2563eb',
                }}
                onPress={() => {
                  if (!isValidEmail(id)) return Alert.alert('형식 오류', '올바른 이메일을 입력하세요.');
                  if (sent && leftSec > 0) return;
                  requestVerificationEmail_NoBody(id.trim());
                }}
                disabled={resendLoading || (sent && leftSec > 0)}
              >
                <Text style={{ color: '#fff', fontFamily: FONT }}>
                  {resendLoading ? '전송 중...' : sent && leftSec > 0 ? `재전송 (${leftSec}s)` : '인증번호 발송'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 10 }} />

            {sent && (
              <View style={{ width: '100%', gap: 10 }}>
                <Text style={{ fontFamily: FONT, color: '#4b5563' }}>인증번호</Text>
                <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
                  <TextInput
                    value={code}
                    onChangeText={(t) => setCode(onlyDigits(t))}
                    placeholder="6자리 인증번호"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <TouchableOpacity
                    style={{
                      ...buttonStyle,
                      width: 120,
                      backgroundColor: verifyLoading || code.length !== 6 ? '#cbd5e1' : '#2563eb',
                    }}
                    onPress={verifyEmailCode}
                    disabled={verifyLoading || code.length !== 6}
                  >
                    <Text style={{ color: '#fff', fontFamily: FONT }}>
                      {verifyLoading ? '확인 중...' : '인증 확인'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 10 }} />

            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              style={inputStyle}
            />

            <View style={{ height: 10 }} />

            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>나이 / 체중 / 키</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="나이"
                keyboardType="numeric"
                style={{ ...inputStyle, flex: 1 }}
              />
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="체중 (kg)"
                keyboardType="numeric"
                style={{ ...inputStyle, flex: 1 }}
              />
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="키 (cm)"
                keyboardType="numeric"
                style={{ ...inputStyle, flex: 1 }}
              />
            </View>

            <View style={{ height: 10 }} />

            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>성별</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  ...buttonStyle,
                  flex: 1,
                  backgroundColor: gender === 'male' ? '#1d4ed8' : '#e2e8f0',
                }}
                onPress={() => setGender('male')}
              >
                <Text style={{ color: gender === 'male' ? '#fff' : '#4b5563', fontFamily: FONT }}>남성</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  ...buttonStyle,
                  flex: 1,
                  backgroundColor: gender === 'female' ? '#1d4ed8' : '#e2e8f0',
                }}
                onPress={() => setGender('female')}
              >
                <Text style={{ color: gender === 'female' ? '#fff' : '#4b5563', fontFamily: FONT }}>여성</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />

            {errorMessage ? (
              <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10, fontFamily: FONT }}>
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={{
                ...buttonStyle,
                backgroundColor: loading ? '#cbd5e1' : '#1d4ed8',
              }}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: FONT }}>
                {loading ? '가입 중...' : '가입하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}