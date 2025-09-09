import { useEffect, useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import * as Speech from 'expo-speech'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORE_KEY = '@tts/voiceId'

export default function VoicePickerScreen() {
  const [voices, setVoices] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)

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
    Speech.speak('안녕하세요. 테스트 음성입니다.', {
      language: (item.language || 'ko-KR'),
      voice: item.identifier,
      rate: 1.0,
      pitch: 1.0,
    })
  }

  async function save(item) {
    setSelectedId(item?.identifier || null)
    if (item?.identifier) await AsyncStorage.setItem(STORE_KEY, item.identifier)
    else await AsyncStorage.removeItem(STORE_KEY)
  }

  function clearSelection() {
    setSelectedId(null)
    AsyncStorage.removeItem(STORE_KEY)
  }

  const renderItem = ({ item }) => {
    const isSel = selectedId === item.identifier
    return (
      <View style={[S.row, isSel && S.rowSel]}>
        <View style={{ flex: 1 }}>
          <Text style={S.name}>{item.name || '(no name)'}{(item.language || '').toLowerCase().startsWith('ko') ? ' · 한국어' : ` · ${item.language}`}</Text>
          <Text style={S.meta}>{item.identifier}</Text>
        </View>
        <TouchableOpacity style={S.btn} onPress={() => preview(item)}>
          <Text style={S.btnTxt}>미리듣기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.btn, isSel && S.btnSel]} onPress={() => save(item)}>
          <Text style={S.btnTxt}>{isSel ? '선택됨' : '선택'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={S.wrap}>
      <Text style={S.title}>보이스 선택</Text>
      <View style={S.actions}>
        <TouchableOpacity style={S.btnWide} onPress={clearSelection}>
          <Text style={S.btnTxt}>기본 보이스 사용</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <Text style={S.meta}>불러오는 중…</Text>
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
  meta:{ color:'#9ca3af', fontSize:12 },
  btn:{ backgroundColor:'#1f2937', paddingHorizontal:12, paddingVertical:8, borderRadius:10 },
  btnSel:{ backgroundColor:'#10b981' },
  btnTxt:{ color:'#fff', fontWeight:'700' },
  btnWide:{ backgroundColor:'#374151', flex:1, paddingVertical:10, borderRadius:10, alignItems:'center' },
})
