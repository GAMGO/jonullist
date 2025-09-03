import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiPost, API_BASE_DEBUG } from '../config/api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }) {
  let auth = null; try { auth = useAuth?.() } catch { auth = null }

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('F');
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [dupErr, setDupErr] = useState('');
  const [checking, setChecking] = useState(false);

  const endpoint = useMemo(() => `${API_BASE_DEBUG}/api/auth/signup`, []);

  const onEmailChange = (v) => {
    setId(v);
    if (!v) setEmailErr('이메일을 입력하세요.');
    else if (!EMAIL_RE.test(v)) setEmailErr('올바른 이메일이 아닙니다.(@와 . 포함)');
    else setEmailErr('');
  };

  // 비밀번호 최대 8자만 허용
  const onPasswordChange = (v) => {
    if (v.length > 8) {
      setPassErr('비밀번호는 최대 8자리까지만 입력 가능합니다.');
      v = v.slice(0, 8);
    } else {
      setPassErr('');
    }
    setPassword(v);
  };

  // 이메일 중복 체크 (디바운스)
  const tRef = useRef(null);
  useEffect(() => {
    if (!id || emailErr) { setDupErr(''); return; }
    clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      try {
        setChecking(true);
        const r = await fetch(`${API_BASE_DEBUG}/api/auth/exists?id=${encodeURIComponent(id)}`);
        const j = await r.json();
        setDupErr(j.exists ? '이미 등록된 이메일입니다.' : '');
      } catch { setDupErr(''); }
      finally { setChecking(false); }
    }, 400);
    return () => clearTimeout(tRef.current);
  }, [id, emailErr]);

  const signupFallback = async (payload) => {
    const res = await apiPost('/api/auth/signup', payload);
    return !!res;
  };

  const onSubmit = async () => {
    if (!id || !password || !weight || !age || !gender || !height) {
      return Alert.alert('필수 입력', '모든 항목을 입력해 주세요.');
    }
    if (emailErr || dupErr) {
      return Alert.alert('이메일 확인', emailErr || dupErr);
    }

    const payload = {
      id: id.trim(),
      password,
      weight: Number(weight),
      age: Number(age),
      gender,
      height: Number(height)
    };
    if ([payload.weight, payload.age, payload.height].some(Number.isNaN)) {
      return Alert.alert('형식 오류', '나이/체중/키는 숫자로 입력하세요.');
    }

    try {
      setLoading(true);
      const ok = auth?.signup ? await auth.signup(payload) : await signupFallback(payload);
      if (ok) {
        Alert.alert('성공', '회원가입 완료!');
        navigation.replace('Login');
      } else {
        Alert.alert('가입 실패', '다시 시도해 주세요.');
      }
    } catch (e) {
      Alert.alert('가입 실패', e?.message ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Sign Up</Text>

        <TextInput
          value={id}
          onChangeText={onEmailChange}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}
        />
        {!!emailErr && <Text style={{ color: '#ef4444' }}>{emailErr}</Text>}
        {!!dupErr && <Text style={{ color: '#ef4444' }}>{dupErr}</Text>}
        {checking && <Text style={{ color: '#6b7280' }}>이메일 확인 중…</Text>}

        <TextInput
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Password (max 8 chars)"
          secureTextEntry
          maxLength={8}
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}
        />
        {!!passErr && <Text style={{ color: '#ef4444' }}>{passErr}</Text>}

        <TextInput value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}/>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setGender('F')} style={{ flex: 1, backgroundColor: gender === 'F' ? '#111827' : '#e5e7eb', padding: 12, borderRadius: 10 }}>
            <Text style={{ color: gender === 'F' ? '#fff' : '#111', textAlign: 'center' }}>여성</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setGender('M')} style={{ flex: 1, backgroundColor: gender === 'M' ? '#111827' : '#e5e7eb', padding: 12, borderRadius: 10 }}>
            <Text style={{ color: gender === 'M' ? '#fff' : '#111', textAlign: 'center' }}>남성</Text>
          </TouchableOpacity>
        </View>
        <TextInput value={weight} onChangeText={setWeight} placeholder="Weight (kg)" keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}/>
        <TextInput value={height} onChangeText={setHeight} placeholder="Height (cm)" keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}/>

        <TouchableOpacity onPress={onSubmit} disabled={loading}
          style={{ backgroundColor: loading ? '#93c5fd' : '#10b981', padding: 14, borderRadius: 10 }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>{loading ? 'Submitting…' : 'Create Account'}</Text>
        </TouchableOpacity>

        {/* 🔹 회원가입 없이 로그인으로 돌아가기 */}
        <TouchableOpacity
          onPress={() => navigation.replace('Login')}
          style={{ padding: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#2563eb', fontWeight: '700' }}>
            로그인 화면으로 돌아가기
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
