import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { View, Text, ImageBackground, StyleSheet, Animated, AppState, ActivityIndicator, TouchableOpacity, Image, Linking, FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import { useI18n } from '../i18n/I18nContext'
import { apiGet } from '../config/api'
import { useAuth } from '../context/AuthContext'

const FONT = 'DungGeunMo'
if (Text.defaultProps == null) Text.defaultProps = {}
Text.defaultProps.includeFontPadding = true

const TAUNTS_MAP = {
  none: {
    ko: ['0.00km… 산책 앱을 켰는데 산책은 안 함','첫 좌표에서 평생 살 계획?','오늘도 바닥이랑 베프네','다리는 절전 모드, 폰만 고성능','앉아있는 재능 국가대표'],
    en: ['0.00km… Opened the app but no walk','Planning to live at the first GPS point forever?','Best friends with the floor again','Legs in power save, phone on turbo','National-team level at sitting'],
    ja: ['0.00km… アプリ開いたのに歩いてない','最初の座標で一生暮らすの？','今日も床と親友','足は省エネモード、スマホは高性能','座る才能の国家代表'],
  }
}

export default function QuestScreen(){
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [quests, setQuests] = useState([])
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null)
  const [speed, setSpeed] = useState(0)
  const [distance, setDistance] = useState(0)
  const [currentTaunt, setCurrentTaunt] = useState('')
  const animatedValue = useRef(new Animated.Value(0)).current
  const [appState, setAppState] = useState(AppState.currentState)
  const [startTime, setStartTime] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [questType, setQuestType] = useState('all')

  const { user } = useAuth() // ✅ 이 부분을 추가합니다.

  const speedInKm = useMemo(() => {
    return speed * 3.6
  }, [speed])

  const distanceInKm = useMemo(() => {
    return distance / 1000
  }, [distance])

  async function fetchQuests() {
    // 로그인된 사용자가 없는 경우 퀘스트를 불러오지 않습니다.
    if (!user || !user.id) {
        setLoading(false)
        return
    }

    setLoading(true)
    try {
      // ✅ user 객체에서 동적으로 ID를 가져와 API 호출에 사용합니다.
      const quests = await apiGet(`/api/quests/daily?customerId=${user.id}`)
      setQuests(quests)
      setError('')
    } catch (e) {
      console.error(e)
      setError('퀘스트를 불러오는 데 실패했습니다.')
      setQuests([])
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchQuests()
    }, [user]) // ✅ 의존성 배열에 user를 추가하여 로그인 상태 변경 시 퀘스트를 다시 불러오도록 합니다.
  )

  useEffect(() => {
    let locationSubscription = null
    async function startLocationTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('위치 권한이 필요합니다.')
        return
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1, // 1m마다 업데이트
        },
        (loc) => {
          if (isRecording) {
            setLocation(prevLocation => {
              if (prevLocation) {
                const newDistance = Location.getDistanceAsync(
                  { latitude: prevLocation.coords.latitude, longitude: prevLocation.coords.longitude },
                  { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
                )
                setDistance(prev => prev + newDistance)
              }
              setSpeed(loc.coords.speed || 0)
              return loc
            })
          }
        }
      )
    }

    if (isRecording) {
      setStartTime(new Date())
      startLocationTracking()
    } else {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
  }, [isRecording])

  useEffect(() => {
    const tauntInterval = setInterval(() => {
      if (speedInKm < 0.1) {
        const taunts = TAUNTS_MAP.none.ko
        const newTaunt = taunts[Math.floor(Math.random() * taunts.length)]
        setCurrentTaunt(newTaunt)
      } else {
        setCurrentTaunt('')
      }
    }, 5000)

    return () => clearInterval(tauntInterval)
  }, [speedInKm])

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!');
    }
    setAppState(nextAppState);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [appState]);

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  if (!fontsLoaded) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }
  
  const filteredQuests = quests.filter(q => {
    if (questType === 'all') return true
    return q.type === questType
  })

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={styles.wrap} resizeMode="cover">
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <Text style={styles.screenTitle}>일일 퀘스트</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.tabWrap}>
          <TouchableOpacity onPress={() => setQuestType('all')} style={[styles.tab, questType === 'all' && styles.tabActive]}><Text style={[styles.tabTxt, questType === 'all' && styles.tabTxtActive]}>전체</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setQuestType('reps')} style={[styles.tab, questType === 'reps' && styles.tabActive]}><Text style={[styles.tabTxt, questType === 'reps' && styles.tabTxtActive]}>횟수</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setQuestType('distance')} style={[styles.tab, questType === 'distance' && styles.tabActive]}><Text style={[styles.tabTxt, questType === 'distance' && styles.tabTxtActive]}>거리</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setQuestType('time')} style={[styles.tab, questType === 'time' && styles.tabActive]}><Text style={[styles.tabTxt, questType === 'time' && styles.tabTxtActive]}>시간</Text></TouchableOpacity>
        </View>
        <FlatList
          style={styles.listWrap}
          data={filteredQuests}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.meta}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemChan}>{item.desc}</Text>
                <Text style={styles.itemChan}>보상: {item.reward}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>퀘스트가 없습니다.</Text>}
          contentContainerStyle={quests.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
        />
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        {error && <Text style={styles.err}>{error}</Text>}
      </View>
    </ImageBackground>
  )
}
const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: {
    position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#000', fontFamily: FONT, fontSize: 28, zIndex: 10,
  },
  body: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  tabWrap:{ flexDirection:'row', gap:8, marginBottom:16 },
  tab:{ flex:1, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'#111', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.9)' },
  tabActive:{ backgroundColor:'#111', borderColor:'#111' },
  tabTxt:{ fontFamily:FONT, fontSize:16, color:'#111' },
  tabTxtActive:{ color:'#fff' },
  listWrap:{ flex:1, minHeight:120, paddingBottom:24 },
  item:{ flexDirection:'row', backgroundColor:'rgba(255,255,255,0.9)', borderRadius:12, overflow:'hidden', marginBottom:12 },
  thumb:{ width:120, height:80, backgroundColor:'#ddd' },
  meta:{ flex:1, padding:10, gap:4, justifyContent:'center' },
  itemTitle:{ fontFamily:FONT, fontSize:14, lineHeight:18, color:'#111' },
  itemChan:{ fontFamily:FONT, fontSize:12, lineHeight:15, color:'#4B5563' },
  empty:{ fontFamily:FONT, fontSize:14, lineHeight:18, color:'#111', textAlign:'center', paddingVertical:12 },
  err:{ fontFamily:FONT, fontSize:14, color:'#ef4444', textAlign:'center' },
  ddBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:44, paddingHorizontal:12, borderWidth:2, borderColor:'#111', borderRadius:12, backgroundColor:'rgba(255,255,255,0.9)' },
  ddTxt:{ fontFamily:FONT, fontSize:16, color:'#111' },
});