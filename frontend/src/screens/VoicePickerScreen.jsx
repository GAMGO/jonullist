import { useEffect, useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import * as Speech from 'expo-speech'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useI18n } from "../i18n/I18nContext";

const STORE_KEY = '@tts/voiceId'

export default function VoicePickerScreen() {
  const [voices, setVoices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n(); // 🟢 t 함수를 구조 분해 할당으로 가져옵니다.
  useEffect(() => {
    ;(async () => {
      const saved = await AsyncStorage.getItem(STORE_KEY)
      setSelectedId(saved || null)
      const vs = await Speech.getAvailableVoicesAsync()
      setVoices(vs || [])
      setLoading(false)
    })()
  }, [])

  const sorted = useMemo(() => {
    return voices.slice().sort((a, b) => {
      const la = (a.language || '').toLowerCase()
      const lb = (b.language || '').toLowerCase()
      if (la.startsWith('ko') && !lb.startsWith('ko')) return -1
      if (!la.startsWith('ko') && lb.startsWith('ko')) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [voices])

  async function preview(item) {
    Speech.stop()
    Speech.speak(t('TEST_LINE'), {
      voice: item.identifier,
    })
  }

  async function clearSelection() {
    await AsyncStorage.removeItem(STORE_KEY)
    setSelectedId(null)
  }

  async function selectVoice(item) {
    await AsyncStorage.setItem(STORE_KEY, item.identifier)
    setSelectedId(item.identifier)
    preview(item)
  }
  
  function renderItem({ item }) {
    const isSelected = item.identifier === selectedId
    return (
      <TouchableOpacity
        onPress={() => selectVoice(item)}
        style={[S.row, isSelected && S.rowSel]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={S.name}>{item.name}</Text>
          <Text style={S.meta}>{item.language} / {item.quality} / {item.gender}</Text>
        </View>
        <TouchableOpacity style={S.btn} onPress={() => preview(item)}>
          <Text style={S.btnTxt}>{t('TEST')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  return (
    <View style={S.wrap}>
      <Text style={S.title}>{t('VOICE_PICKER_SCREEN')}</Text>
      <View style={S.actions}>
        <TouchableOpacity style={S.btnWide} onPress={clearSelection}>
          <Text style={S.btnTxt}>{t('USE_DEFAULT')}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <Text style={S.meta}>{t('LOADING')}</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item, idx) => item.identifier || String(idx)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#000', padding:16 },
  title:{ color:'#fff', fontSize:22, fontWeight:'900', marginBottom:12 },
  actions:{ flexDirection:'row', gap:10, marginBottom:12 },
  row:{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#111', padding:12, borderRadius:12 },
  rowSel:{ backgroundColor:'#1f2937', borderWidth:1, borderColor:'#334155' },
  name:{ color:'#fff', fontWeight:'800' },
  meta:{ color:'#9ca3af' },
  btn:{ backgroundColor:'#3b82f6', paddingHorizontal:12, paddingVertical:8, borderRadius:8 },
  btnWide:{ flex:1, backgroundColor:'#3b82f6', paddingHorizontal:12, paddingVertical:10, borderRadius:8, alignItems:'center' },
  btnTxt:{ color:'#fff', fontWeight:'800' }
})