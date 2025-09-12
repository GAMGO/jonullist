import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import WelcomeScreen from '../screens/WelcomeScreen'
import LoginScreen from '../screens/LoginScreen'
import SignupScreen from '../screens/SignupScreen'
import HomeScreen from '../screens/HomeScreen'
import CameraScreen from '../screens/CameraScreen'
import GoalScreen from '../screens/GoalScreen'
import SettingsScreen from '../screens/SettingsScreen'
import DietLogScreen from '../screens/DietLogScreen'
import DirectInputScreen from '../screens/DirectInputScreen'
import DataScreen from '../screens/DataScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useFonts } from 'expo-font'
import QuestScreen from '../screens/QuestScreen'
import RankingScreen from '../screens/RankingScreen'
import HealthyCatchGameScreen from '../screens/HealthyCatchGameScreen'
import TACoach from '../screens/TACoach'
import VoicePickerScreen from '../screens/VoicePickerScreen'

// ↓ 추가: 비밀번호 찾기(공개 플로우) 스크린
import RecoverySetup from '../screens/RecoverySetup'// 파일명: src/screens/recovery.js

const Stack = createNativeStackNavigator()

const commonHeader = {
  headerShown: true,
  headerTitle: '',
  headerTransparent: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent', elevation: 0 },
  headerBackTitleVisible: false,
  headerTintColor: '#000',
  headerTitleStyle: { fontFamily: 'DungGeunMo', fontSize: 20 },
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={commonHeader}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      {/* ↓ 추가: 비밀번호 찾기 */}
      <Stack.Screen
        name="Recovery"
        component={RecoverySetup}
        options={{ headerShown: true, title: '' }}
      />
    </Stack.Navigator>
  )
}

function AppStack({ initialRouteName = 'Home' }) {
  return (
    <Stack.Navigator screenOptions={commonHeader} initialRouteName={initialRouteName}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DietLog" component={DietLogScreen}/>
      <Stack.Screen name="DirectInput" component={DirectInputScreen} />
      <Stack.Screen name="Data" component={DataScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Burning" component={QuestScreen} />
      <Stack.Screen name="Ranking" component={RankingScreen} />
      {/* 로그인 후 내 계정에 보안질문 등록/수정 */}
      <Stack.Screen name="RecoverySetup" component={RecoverySetup} />
      <Stack.Screen name="HealthyCatch" component={HealthyCatchGameScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TACoach" component={TACoach} options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="VoicePicker" component={VoicePickerScreen} options={{ title: '보이스 선택' }} />
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  const { ready, isAuthenticated, needsGoalSetup } = useAuth()
  const [fontsLoaded] = useFonts({ DungGeunMo: require('../../assets/fonts/DungGeunMo.otf') })

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!isAuthenticated) return <AuthStack />

  return (
    <AppStack
      key={needsGoalSetup ? 'app-goal' : 'app-home'}
      initialRouteName={needsGoalSetup ? 'Goal' : 'Home'}
    />
  )
}
