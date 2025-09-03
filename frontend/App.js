import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './src/navigation/RootNavigator'
import { AuthProvider } from './src/context/AuthContext'
import { StatusBar } from 'expo-status-bar'

export default function App(){
  return (
   <SafeAreaProvider>
  <StatusBar style="light" backgroundColor="#111827" />
  <AuthProvider>
    <NavigationContainer>
      <RootNavigator/>
    </NavigationContainer>
  </AuthProvider>
</SafeAreaProvider>

  )
}
