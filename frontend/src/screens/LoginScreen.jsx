import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (loading) return;
    if (!id || !password) {
      return Alert.alert('입력 필요', '아이디와 비밀번호를 입력해주세요.');
    }
    if (!EMAIL_RE.test(id)) {
      return Alert.alert('이메일 오류', '이메일에는 @와 .이 포함되어야 합니다.');
    }
    if (String(password).length !== 8) {
      return Alert.alert('비밀번호 규칙', '비밀번호는 정확히 8자리여야 합니다.');
    }
    try {
      setLoading(true);
      const ok = await login(id.trim(), password);
      if (!ok) throw new Error('로그인 실패');
      navigation.reset({ index: 0, routes: [{ name: 'Goal' }] });
    } catch (e) {
      Alert.alert('로그인 실패', e?.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>Login</Text>

        <TextInput
          value={id}
          onChangeText={setId}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}
          returnKeyType="next"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (8 chars)"
          secureTextEntry
          maxLength={8}
          textContentType="password"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        <TouchableOpacity onPress={onSubmit} disabled={loading} style={{ backgroundColor: loading ? '#93c5fd' : '#2563eb', padding: 14, borderRadius: 10, marginTop: 6 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{loading ? '로그인 중…' : 'Login'}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#6b7280' }}>계정이 없으신가요? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Signup')}>
            <Text style={{ color: '#2563eb', fontWeight: '700' }}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
