import { View, ScrollView, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(false);

  const reallyLogout = async () => {
    setPending(true);
    try {
      await logout(); // 서버 블랙리스트 + 토큰/유저 삭제
    } finally {
      setPending(false);
      // ✅ 성공/실패와 무관하게 로그인 화면으로 복귀
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const onLogout = async () => {
    if (pending) return;
    console.log('[Settings] logout button pressed');

    if (Platform.OS === 'web') {
      // RN Web에서는 Alert 다중 버튼 콜백이 동작하지 않는 경우가 있음 → window.confirm 사용
      const ok = window.confirm('정말 로그아웃 하시겠어요?');
      if (ok) await reallyLogout();
      return;
    }

    // 네이티브(ios/android)만 Alert 사용
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: reallyLogout },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 20,
          rowGap: 16,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Settings</Text>

        <TouchableOpacity
          onPress={onLogout}
          disabled={pending}
          style={{
            backgroundColor: pending ? '#9ca3af' : '#ef4444',
            padding: 14,
            borderRadius: 10,
            marginTop: 40,
          }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>
            {pending ? '로그아웃 중…' : '로그아웃'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
