import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import RootNavigator from './src/navigation/RootNavigator';
import AuthProvider, { useAuth } from './src/context/AuthContext';

// i18n 컨텍스트
import { I18nProvider } from './src/i18n/I18nContext';

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

  // useEffect로 전역 폰트 적용
  useEffect(() => {
    if (fontsLoaded) {
      console.log("✅ Fonts Loaded, applying global font: DungGeunMo");
      if (Text.defaultProps == null) {
        Text.defaultProps = {};
      }
      Text.defaultProps.style = { fontFamily: 'DungGeunMo' };
    } else {
      console.log("⌛ Fonts not loaded yet...");
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <Loading />;
  }

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
