import { useState, useMemo } from 'react';
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
import { apiPost, API_BASE_DEBUG } from '../config/api.js';
import { calcBMI, classifyBMI } from '../utils/bmi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

const FONT = 'DungGeunMo';

const isValidEmail = (v = '') => {
  const s = String(v).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    [FONT]: require('../../assets/fonts/DungGeunMo.otf'),
  });

  let auth = null;
  try {
    auth = useAuth?.();
  } catch {
    auth = null;
  }

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('F');
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => `${API_BASE_DEBUG}/api/auth/signup`, []);

  async function signupFallback(payload) {
    const res = await apiPost('/api/auth/signup', payload);
    return !!res;
  }

  const onSubmit = async () => {
    if (!id || !password || !weight || !age || !gender || !height) {
      return Alert.alert('필수 입력', '모든 항목을 입력해 주세요.');
    }
    if (!isValidEmail(id)) {
      return Alert.alert('형식 오류', '이메일 형식이 올바르지 않습니다.');
    }
    if (String(password).length < 8) {
      return Alert.alert('형식 오류', '비밀번호는 8자리 이상이어야 합니다.');
    }

    const payload = {
      id: id.trim(),
      password,
      weight: w,
      age: a,
      gender,            // 'M' 또는 'F' 그대로 보냄
      height: h,
    };

    try {
      setLoading(true);
      if (__DEV__) {
        console.log('▶ 요청:', endpoint);
        console.log('▶ 보낼 데이터:', payload);
      }
      const ok = auth?.signup ? await auth.signup(payload) : await signupFallback(payload);
      if (ok) {
        await AsyncStorage.setItem(
          '@profile/prefill',
          JSON.stringify({
            id: payload.id,
            email: payload.id,
            weight: payload.weight,
            height: payload.height,
            age: payload.age,
            gender: payload.gender,
          })
        );
        await AsyncStorage.setItem(
          'goal_draft',
          JSON.stringify({
            weight: payload.weight,
            height: payload.height,
            age: payload.age,
            gender: payload.gender,
          })
        );
        const bmi = calcBMI(payload.weight, payload.height);
        const category = classifyBMI(bmi);
        await AsyncStorage.setItem('@avatar/category_prefill', String(category));
        Alert.alert('성공', `회원가입 완료! BMI: ${bmi}`);
        navigation.replace('Login', { bmi, category });
      } else {
        Alert.alert('가입 실패', '다시 시도해 주세요.');
      }
    } catch (e) {
      Alert.alert('가입 실패', e?.message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontFamily: FONT,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: insets.top + 80,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 36,
            fontFamily: FONT,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          SIGNUP
        </Text>

        <TextInput
          value={id}
          onChangeText={setId}
          placeholder="이메일"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          style={inputStyle}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호 (8자리 이상)"
          secureTextEntry
          autoCapitalize="none"
          style={inputStyle}
        />

        <TextInput
          value={age}
          onChangeText={setAge}
          placeholder="나이"
          keyboardType="numeric"
          style={inputStyle}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setGender('F')}
            style={{
              flex: 1,
              backgroundColor: gender === 'F' ? '#111827' : '#e5e7eb',
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontFamily: FONT,
                color: gender === 'F' ? '#fff' : '#111',
                textAlign: 'center',
              }}
            >
              여성
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGender('M')}
            style={{
              flex: 1,
              backgroundColor: gender === 'M' ? '#111827' : '#e5e7eb',
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontFamily: FONT,
                color: gender === 'M' ? '#fff' : '#111',
                textAlign: 'center',
              }}
            >
              남성
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={weight}
          onChangeText={setWeight}
          placeholder="체중 (kg)"
          keyboardType="numeric"
          style={inputStyle}
        />

        <TextInput
          value={height}
          onChangeText={setHeight}
          placeholder="키 (cm)"
          keyboardType="numeric"
          style={inputStyle}
        />

        <TouchableOpacity
          onPress={onSubmit}
          disabled={loading}
          style={{
            backgroundColor: '#10b981',
            padding: 14,
            borderRadius: 10,
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontFamily: FONT }}>
            {loading ? '처리 중…' : '계정 만들기'}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#6b7280', fontFamily: FONT }}>이미 계정이 있나요? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={{ color: '#2563eb', fontFamily: FONT }}>로그인</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
