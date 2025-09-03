import { View, ScrollView, TouchableOpacity, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'

export default function SettingsScreen() {
  const { logout } = useAuth()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: 20, rowGap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Settings</Text>
        <View style={{ height: 24 }} />
        <TouchableOpacity onPress={logout} style={{ backgroundColor: '#ef4444', padding: 14, borderRadius: 10, marginTop: 40 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
