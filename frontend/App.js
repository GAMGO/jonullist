import { registerRootComponent } from 'expo';
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';

import RootNavigator from './src/navigation/RootNavigator';
import AuthProvider, { useAuth } from './src/context/AuthContext';
import { I18nProvider } from './src/i18n/I18nContext';

/* ===== 알림 핸들러: 포그라운드에서도 배너 보이게 ===== */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // 배너/알림센터 표시
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  return (
    <NavigationContainer key={isAuthenticated ? 'nav-app' : 'nav-auth'}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DungGeunMo: require('./assets/fonts/DungGeunMo.otf'),
  });

  // ⛳️ 중복 발송 방지 (개발 환경에서 useEffect 두 번 실행 대비)
  const notifiedRef = useRef(false);

  // 전역 폰트 적용
  useEffect(() => {
    if (fontsLoaded) {
      if (Text.defaultProps == null) Text.defaultProps = {};
      Text.defaultProps.style = { fontFamily: 'DungGeunMo' };
    }
  }, [fontsLoaded]);

  // ✅ 앱 진입 시 즉시 알림 1회 발송
  useEffect(() => {
    if (!fontsLoaded) return;
    if (notifiedRef.current) return; // 한 번만
    notifiedRef.current = true;

    (async () => {
      // 권한 요청
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('알림 권한 거부됨');
        return;
      }

      // 안드로이드: 헤드업 뜨게 채널 중요도 MAX
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 200, 120, 200],
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // 바로 발송
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '바벨몬 🍽️',
          body: '혹시 식사 중이신가요? 식단을 기록해보세요!',
          sound: 'default',
        },
        trigger: null, // 즉시
      });
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <Loading />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#111827" />
      <I18nProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

registerRootComponent(App);
