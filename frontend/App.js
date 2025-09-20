import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';

import RootNavigator from './src/navigation/RootNavigator';
import AuthProvider, { useAuth } from './src/context/AuthContext';
import { I18nProvider } from './src/i18n/I18nContext';
import useExpoPushToken from './src/hooks/useExpoPushToken';

/* ===== 알림 핸들러: 포그라운드에서도 배너 보이게 ===== */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

  // ✅ 앱 시작 시 Expo Push Token 등록(백엔드 /api/alarm/tokens 호출)
  useExpoPushToken();

  // 전역 폰트 적용
  useEffect(() => {
    if (fontsLoaded) {
      if (Text.defaultProps == null) Text.defaultProps = {};
      Text.defaultProps.style = { fontFamily: 'DungGeunMo' };
    }
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
