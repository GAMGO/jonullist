import { View, ScrollView, TouchableOpacity, Text, Switch, ImageBackground } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import { useNavigation } from '@react-navigation/native'

const FONT = 'DungGeunMo'
const VOICE_KEY = '@tts/voiceId'

export default function SettingsScreen() {
  const navigation = useNavigation()
  const { logout } = useAuth()
  const insets = useSafeAreaInsets()
  const { t, lang, setLang } = useI18n()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  const [sfx, setSfx] = useState(true)
  const [voiceId, setVoiceId] = useState(null)

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem('@settings/sfx')
      if (v != null) setSfx(v === '1')
      const vid = await AsyncStorage.getItem(VOICE_KEY)
      setVoiceId(vid)
    })()
  }, [])

  const toggleSfx = async () => {
    const next = !sfx
    setSfx(next)
    try { await AsyncStorage.setItem('@settings/sfx', next ? '1' : '0') } catch {}
  }

  const onLogout = async () => { await logout() }

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Text
          style={{
            fontSize: 28,
            textAlign: 'center',
            marginBottom: 16,
            fontFamily: fontsLoaded ? FONT : undefined,
            lineHeight: 34,
            includeFontPadding: true
          }}
        >
          SETTING
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 20 }}>
          <ScrollView contentContainerStyle={{ rowGap: 20 }}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: fontsLoaded ? FONT : undefined, fontSize: 18, lineHeight: 22, includeFontPadding: true }}>
                {t('LANGUAGE')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { k: 'ko', label: '한국어' },
                  { k: 'en', label: 'English' },
                  { k: 'ja', label: '日本語' },
                  { k: 'zh', label: '中文' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.k}
                    onPress={() => setLang(item.k)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: lang === item.k ? '#111827' : '#ddd',
                      backgroundColor: lang === item.k ? '#111827' : 'white'
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontsLoaded ? FONT : undefined,
                        color: lang === item.k ? 'white' : '#111827',
                        fontSize: 16,
                        lineHeight: 20,
                        includeFontPadding: true
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontFamily: fontsLoaded ? FONT : undefined, marginRight: 8, fontSize: 16, lineHeight: 20, includeFontPadding: true }}>
                {t('SOUND')}
              </Text>
              <Switch value={sfx} onValueChange={toggleSfx} />
              <Text style={{ fontFamily: fontsLoaded ? FONT : undefined, marginLeft: 8, fontSize: 16, lineHeight: 20, includeFontPadding: true }}>
                {sfx ? t('ON') : t('OFF')}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fontsLoaded ? FONT : undefined, fontSize: 18, lineHeight: 22, includeFontPadding: true }}>
                보이스
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('VoicePicker')}
                style={{
                  backgroundColor: '#111827',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  justifyContent: 'center'
                }}
              >
                <Text style={{ fontFamily: fontsLoaded ? FONT : undefined, color: '#fff', fontSize: 16, lineHeight: 20, includeFontPadding: true }}>
                  보이스 선택
                </Text>
                <Text style={{ fontFamily: fontsLoaded ? FONT : undefined, color: '#9ca3af', fontSize: 12, lineHeight: 16, includeFontPadding: true, marginTop: 4 }}>
                  {voiceId ? `현재: ${voiceId}` : '현재: 기본 보이스'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onLogout}
              style={{ backgroundColor: '#ef4444', padding: 14, borderRadius: 10, marginTop: 40 }}
            >
              <Text
                style={{
                  fontFamily: fontsLoaded ? FONT : undefined,
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: 18,
                  lineHeight: 22,
                  includeFontPadding: true
                }}
              >
                {t('LOGOUT')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </ImageBackground>
  )
}
