import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { apiPost, ORIGIN } from '../config/api.js';

export default function GoalScreen({ navigation }) {
  const [targetWeight, setTargetWeight] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('F');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    if (!weight || !height) {
      Alert.alert('입력 필요', '현재 체중과 키는 필수입니다.');
      return;
    }
    try {
      setSaving(true);
      if (__DEV__) console.log('POST to:', ORIGIN + '/api/body');

      // 서버 측 /api/body 미구현이라면 이후에 REST 추가 필요.
      const payload = {
        target_weight: targetWeight ? Number(targetWeight) : null,
        target_calories: targetCalories ? Number(targetCalories) : null,
        weight: Number(weight),
        height: Number(height),
        age: age ? Number(age) : null,
        gender
      };

      await apiPost('/body', payload);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      Alert.alert('네트워크 오류', String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, padding: 24, gap: 14, justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center' }}>목표 설정</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text>현재 체중(kg)</Text>
            <TextInput value={weight} onChangeText={setWeight} keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text>키(cm)</Text>
            <TextInput value={height} onChangeText={setHeight} keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text>목표 체중(kg)</Text>
            <TextInput value={targetWeight} onChangeText={setTargetWeight} keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text>목표 섭취칼로리(kcal)</Text>
            <TextInput value={targetCalories} onChangeText={setTargetCalories} keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text>나이</Text>
            <TextInput value={age} onChangeText={setAge} keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text>성별</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setGender('F')} style={{ flex: 1, padding: 12, borderWidth: 1, borderRadius: 8, backgroundColor: gender === 'F' ? '#fecaca' : 'transparent', alignItems: 'center' }}>
                <Text>F</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGender('M')} style={{ flex: 1, padding: 12, borderWidth: 1, borderRadius: 8, backgroundColor: gender === 'M' ? '#bfdbfe' : 'transparent', alignItems: 'center' }}>
                <Text>M</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={submit} disabled={saving} style={{ backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: 'white', fontWeight: '800' }}>{saving ? '저장 중...' : '저장하고 시작하기'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })} style={{ alignItems: 'center', padding: 10 }}>
          <Text>나중에 설정</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
