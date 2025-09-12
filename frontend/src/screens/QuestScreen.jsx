import { useEffect, useRef, useState, useMemo } from 'react'
import {
  View, Text, ImageBackground, StyleSheet, Animated, AppState, ActivityIndicator,
  TouchableOpacity, Image, Linking, FlatList, Pressable, ScrollView
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import { useI18n } from '../i18n/I18nContext'
import { apiGet } from '../config/api'

const FONT = 'DungGeunMo'
if (Text.defaultProps == null) Text.defaultProps = {}
Text.defaultProps.includeFontPadding = true

const TAUNTS_MAP = {
  none: {
    ko: ['0.00km… 산책 앱을 켰는데 산책은 안 함','첫 좌표에서 평생 살 계획?','오늘도 바닥이랑 베프네','다리는 절전 모드, 폰만 고성능','앉아있는 재능 국가대표'],
    en: ['0.00km… Opened the app but no walk','Planning to live at the first GPS point forever?','Best friends with the floor again','Legs in power save, phone on turbo','National-team level at sitting'],
    ja: ['0.00km… アプリ開いたのに歩いてない','最初の座標で一生暮らすの？','今日も床と親友','足は省電力、スマホはハイスペ','座りっぱなしの才能は代表クラス'],
    zh: ['0.00km… 打开了应用却没走','打算一辈子待在第一个坐标？','今天又和地板做朋友','腿在省电模式，手机在高性能','坐着的天赋国家级'],
  },
  done: {
    ko: ['오케이 인정. 오늘만','완료. 변명 금지 모드 진입','터보 엔진 잠깐 켰네'],
    en: ['Okay, respect. Today only','Done. Excuse-free mode engaged','Turbo engine briefly on'],
    ja: ['オーケー認めよう。今日はね','完了。言い訳禁止モード突入','ターボ一瞬ON'],
    zh: ['行，认可。仅限今天','完成。进入无借口模式','涡轮短暂开启'],
  },
  unavailable: {
    ko: ['위치 권한부터 허락하고 훈수 두자','GPS가 못 잡아도 핑계는 잘 잡네'],
    en: ['Grant location first, then coach me','GPS can’t lock but excuses can'],
    ja: ['まず位置情報を許可してから指示して','GPSは掴めないのに言い訳は掴む'],
    zh: ['先给定位权限，再来指点','GPS锁不住，借口倒挺多'],
  },
}
const TAUNTS = (lang) => ({
  none: TAUNTS_MAP.none[lang] || TAUNTS_MAP.none.ko,
  done: TAUNTS_MAP.done[lang] || TAUNTS_MAP.done.ko,
  unavailable: TAUNTS_MAP.unavailable[lang] || TAUNTS_MAP.unavailable.ko,
})

function pick(a){return a[Math.floor(Math.random()*a.length)]}
function dayKey(d=new Date()){const t=new Date(d);t.setHours(0,0,0,0);return t.toISOString().slice(0,10)}
function haversineFix(lat1,lon1,lat2,lon2){
  const R=6371000,toRad=x=>x*Math.PI/180
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1)
  const s1=Math.sin(dLat/2),s2=Math.sin(dLon/2)
  const a=s1*s1+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2*s2
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

/* ── 기구운동 드롭다운 ── */
function Dropdown({ value, onChange, options, placeholder = '기구 선택', style }) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <View style={[styles.ddWrap, style]}>
      <Pressable onPress={() => setOpen(o => !o)} style={({ pressed }) => [styles.ddBtn, pressed && { transform: [{ translateY: 1 }] }]}>
        <Text style={styles.ddText}>{current ? current.label : placeholder}</Text>
        <Text style={styles.ddArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={styles.ddMenu}>
          {options.map(opt => (
            <Pressable key={opt.value} onPress={() => { onChange(opt.value); setOpen(false) }} style={({ pressed }) => [styles.ddItem, pressed && { opacity: 0.8 }]} >
              <Text style={styles.ddItemText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

export default function QuestScreen(){
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  const { t, lang } = useI18n()
  const [perm, setPerm] = useState('undetermined')
  const [meters, setMeters] = useState(0)
  const [quests, setQuests] = useState([])
  const anim = useRef(new Animated.Value(0)).current
  const watchRef = useRef(null)
  const lastRef = useRef(null)
  const appActiveRef = useRef(true)
  const today = dayKey()
  const taunts = useMemo(()=>TAUNTS(lang), [lang])

  /* ▶ 운동 카테고리 3종: 'stretch' | 'home' | 'gym' */
  const [category, setCategory] = useState('stretch')

  /* ▶ 기구운동일 때만 드롭다운 사용 */
  const GYM_OPTIONS = useMemo(() => ([
    { value: 'squat_rack', label: '스쿼트랙' },
    { value: 'bench_press', label: '벤치프레스' },
    { value: 'deadlift', label: '데드리프트' },
    { value: 'lat_pulldown', label: '랫풀다운' },
    { value: 'leg_press', label: '레그프레스' },
    { value: 'cable_cross', label: '케이블 크로스' },
    { value: 'shoulder_press', label: '숄더프레스' },
    { value: 'row_machine', label: '로우 머신' },
    { value: 'smith', label: '스미스 머신' },
  ]), [])
  const [gymType, setGymType] = useState('lat_pulldown')

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadOrGenQuests(){
    const storedDate = await AsyncStorage.getItem('@quest/date')
    if (storedDate !== today) {
      await genNewQuests()
      await AsyncStorage.setItem('@quest/date', today)
    } else {
      const raw = await AsyncStorage.getItem('@quest/list')
      setQuests(raw ? JSON.parse(raw) : [])
    }
  }

  async function genNewQuests(){
    let weight=65, height=170, gender='F'
    try {
      const prof = await apiGet('/api/profile')
      if (prof?.weight) weight = Number(prof.weight)
      if (prof?.height) height = Number(prof.height)
      if (prof?.gender) gender = String(prof.gender)
    } catch {}
    const bmi = height>0 ? (weight/((height/100)*(height/100))) : 22
    const factor = Math.max(0.8, Math.min(1.4, bmi/22 * (gender==='M'?1.05:1)))
    const walkKm = Math.round((4.0 * factor) * 10) / 10
    const squats = Math.round(30 * factor)
    const pushups = Math.round(20 * factor)
    const list = [
      { id: 'walk',  type: 'walk_km', target: walkKm, desc: `${t('WALK') || 'WALK'} ${walkKm} km`, auto: true,  done: false },
      { id: 'squat', type: 'squat',   target: squats,  desc: `${t('SQUAT') || 'SQUAT'} ${squats}`,   auto: false, done: false },
      { id: 'pushup', type: 'pushup', target: pushups, desc: `${t('PUSHUP') || 'PUSH-UP'} ${pushups}`, auto: false, done: false },
    ]
    await AsyncStorage.setItem('@quest/list', JSON.stringify(list))
    setQuests(list)
  }

  useEffect(()=>{ (async()=>{ await loadOrGenQuests(); })() }, [])
  useFocusEffect(useMemo(() => () => { return () => {} }, []))
  useEffect(()=>{
    const sub = AppState.addEventListener('change', s => { appActiveRef.current = (s === 'active') })
    return () => sub?.remove?.()
  },[])

  useEffect(()=>{let mounted=true;(async()=>{
    const {status}=await Location.requestForegroundPermissionsAsync().catch(()=>({status:'denied'}))
    if (!mounted) return
    setPerm(status||'denied')
    if ((status||'denied')!=='granted') return
    lastRef.current=null
    watchRef.current?.remove?.()
    watchRef.current=await Location.watchPositionAsync(
      {accuracy:Location.Accuracy.BestForNavigation,timeInterval:2000,distanceInterval:10,mayShowUserSettingsDialog:true},
      async pos=>{
        if(!appActiveRef.current) return
        const {coords,timestamp}=pos||{}
        const {latitude,longitude,accuracy,speed}=coords||{}
        if(!(latitude&&longitude))return
        if(typeof accuracy==='number'&&accuracy>25)return
        const last=lastRef.current
        lastRef.current={lat:latitude,lon:longitude,t:timestamp||Date.now()}
        if(!last)return
        const now=timestamp||Date.now()
        const dt=Math.max(1,(now-(last.t||now))/1000)
        const d=haversineFix(last.lat,last.lon,latitude,longitude)
        const v=d/dt
        if(d<10||d>100)return
        const vOk=v>=0.7&&v<=4.5
        const sOk=typeof speed==='number'?speed>=0.7&&speed<=4.5:true
        if(!(vOk&&sOk))return
        setMeters(prev=>prev+d)
      }
    )
  })();return()=>{mounted=false;watchRef.current?.remove?.()}},[])

  const [quip,setQuip]=useState('')
  useEffect(()=>{
    const q = quests.find(x=>x.id==='walk')
    const goalMeters = q ? q.target*1000 : 0
    const ratio=goalMeters>0?Math.min(meters/goalMeters,1):0
    Animated.timing(anim,{toValue:ratio,duration:400,useNativeDriver:false}).start()
    if(perm!=='granted') setQuip(pick(taunts.unavailable))
    else if(goalMeters>0 && meters>=goalMeters) setQuip(pick(taunts.done))
    else if(meters===0) setQuip(pick(taunts.none))
  },[meters, quests, perm, taunts, anim])

  const width=anim.interpolate({inputRange:[0,1],outputRange:['0%','100%']})
  const walkQ = quests.find(x=>x.id==='walk')
  const squatQ = quests.find(x=>x.id==='squat')
  const pushupQ = quests.find(x=>x.id==='pushup')
  const km = ((meters)/1000).toFixed(2)
  const goalKm = walkQ ? walkQ.target.toFixed(1) : '0.0'

  const startSquat = () => squatQ && navigation.navigate('TACoach', { mode: 'squat', target: squatQ.target })
  const startPushup = () => pushupQ && navigation.navigate('TACoach', { mode: 'pushup', target: pushupQ.target })

  /* ▼ 검색 키워드 빌드 */
  function gymQuery(value){
    switch(value){
      case 'squat_rack':    return '스쿼트랙 사용법 스쿼트 폼'
      case 'bench_press':   return '벤치프레스 그립 각도 폼'
      case 'deadlift':      return '데드리프트 허리 보호 자세'
      case 'lat_pulldown':  return '랫풀다운 광배 활성화 폼'
      case 'leg_press':     return '레그프레스 무릎 통증 방지'
      case 'cable_cross':   return '케이블 크로스 가슴 내부 자극'
      case 'shoulder_press':return '숄더프레스 어깨 안전각'
      case 'row_machine':   return '로우 머신 어깨하강 등 수축'
      case 'smith':         return '스미스 머신 스쿼트 안전 가이드'
      default:              return '헬스 기구 사용법 초보'
    }
  }
  function categoryQuery(cat){
    if (cat === 'stretch') return '전신 스트레칭 루틴 초보 10분'
    if (cat === 'home')    return '홈트 전신 루틴 초보 15분'
    return gymQuery(gymType) // gym
  }

  async function searchVideos(qText){
    const q = (qText || '').trim()
    if (!q) return
    setLoading(true); setError(''); setVideos([])
    try {
      const raw = await apiGet(`/api/youtube/search?q=${encodeURIComponent(q)}&maxResults=8`)
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      const arr = Array.isArray(data) ? data : []
      const mapped = arr.map(it => ({
        id: it.videoId,
        title: it.title || '',
        channel: it.channelTitle || '',
        thumb: it.thumbnail || '',
        publishedAt: it.publishedAt || '',
        viewCount: it.viewCount || '',
      })).filter(v => v.id)
      setVideos(mapped)
    } catch (e) {
      setError('추천을 불러오지 못했어yo')
    } finally {
      setLoading(false)
    }
  }

  /* 최초 로드 & 선택 변경 시 자동 검색 */
  useEffect(()=>{
    searchVideos(categoryQuery(category))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]) 
  useEffect(()=>{
    searchVideos(categoryQuery(category))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[category, gymType])

  function openVideo(id){
    const url = `https://www.youtube.com/watch?v=${id}`
    Linking.openURL(url)
  }

  if(!fontsLoaded){
    return(
      <View style={[styles.center,{backgroundColor:'#000'}]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={{flex:1}} resizeMode="cover">
      <Text style={[styles.screenTitle,{top:insets.top+8}]}>{t('BURNING') || 'BURNING'}</Text>

      {/* 전체 스크롤 뷰 */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 88,
          paddingHorizontal: 18,
          paddingBottom: insets.bottom + 28,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t('DAILY_QUESTS') || 'DAILY QUESTS'}</Text>
          <Text style={styles.questMain}>{(t('WALK') || 'WALK')} {goalKm} km</Text>
          <View style={styles.barWrap}>
            <Animated.View style={[styles.barFill,{width}]}/>
            <Text style={styles.barText}>{km} / {goalKm} km</Text>
          </View>
          <Text style={styles.quip}>{quip}</Text>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity onPress={startSquat} disabled={!squatQ} style={[styles.quickBtn, !squatQ && styles.disabled]}>
            <Text style={styles.quickTxt}>스쿼트 시작</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startPushup} disabled={!pushupQ} style={[styles.quickBtn, !pushupQ && styles.disabled]}>
            <Text style={styles.quickTxt}>푸쉬업 시작</Text>
          </TouchableOpacity>
        </View>

        {/* 카테고리 3종 */}
        <View style={styles.segment}>
          {[
            { key: 'stretch', label: '스트레칭' },
            { key: 'home', label: '홈트' },
            { key: 'gym', label: '기구운동' },
          ].map(btn => {
            const active = category === btn.key
            return (
              <Pressable key={btn.key} onPress={()=>setCategory(btn.key)} style={[styles.segBtn, active && styles.segActive]}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{btn.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* 추천 영역 */}
        <View style={styles.card}>
          {category === 'gym' ? (
            <>
              <Text style={styles.title}>기구운동 가이드</Text>
              <Dropdown
                value={gymType}
                onChange={setGymType}
                options={GYM_OPTIONS}
                placeholder="기구 선택"
                style={{ marginTop: 8, marginBottom: 8 }}
              />
            </>
          ) : (
            <Text style={styles.title}>
              {category === 'stretch' ? '스트레칭 추천' : '홈트 추천'}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator />
          ) : error ? (
            <Text style={styles.err}>{error}</Text>
          ) : (
            <FlatList
              data={videos}
              keyExtractor={(item)=> String(item.id)}
              renderItem={({item})=>(
                <TouchableOpacity style={styles.item} onPress={()=>openVideo(item.id)}>
                  <Image source={{uri:item.thumb}} style={styles.thumb}/>
                  <View style={styles.meta}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.itemChan} numberOfLines={1}>{item.channel}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={()=> <View style={{height:10}}/>}
              ListEmptyComponent={<Text style={styles.empty}>추천 영상을 불러오지 못했어요</Text>}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
              scrollEnabled={false}        // 전체 ScrollView로 스크롤
              nestedScrollEnabled
            />
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  )
}

const styles=StyleSheet.create({
  screenTitle:{position:'absolute',left:0,right:0,textAlign:'center',color:'#000',fontSize:26,lineHeight:32,textShadowColor:'rgba(255,255,255,0.28)',textShadowOffset:{width:0,height:1},textShadowRadius:2,zIndex:10,fontFamily:FONT,fontWeight:'normal',includeFontPadding:true},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:'rgba(255,255,255,0.85)',borderRadius:24,padding:18,gap:12},
  title:{fontFamily:FONT,fontSize:20,lineHeight:24,color:'#111',includeFontPadding:true},
  questMain:{fontFamily:FONT,fontSize:28,lineHeight:34,color:'#111',includeFontPadding:true},
  barWrap:{height:26,borderWidth:2,borderColor:'#111',borderRadius:10,overflow:'hidden',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.05)'},
  barFill:{position:'absolute',left:0,top:0,bottom:0,backgroundColor:'rgba(34,197,94,0.85)'},
  barText:{textAlign:'center',fontFamily:FONT,fontSize:14,lineHeight:17,color:'#111',includeFontPadding:true},
  quip:{fontFamily:FONT,fontSize:14,lineHeight:17,color:'#000',marginTop:2,includeFontPadding:true},
  quickRow:{ flexDirection:'row', gap:10 },
  quickBtn:{ flex:1, backgroundColor:'#111827', borderRadius:12, paddingVertical:12, alignItems:'center' },
  quickTxt:{ fontFamily:FONT, color:'#fff', fontSize:16, lineHeight:20, includeFontPadding:true },
  disabled:{ opacity:0.5 },

  /* 세그먼트(카테고리 3종) */
  segment:{ flexDirection:'row', gap:8, justifyContent:'space-between' },
  segBtn:{ flex:1, paddingVertical:10, borderWidth:2, borderColor:'#111', borderRadius:12, backgroundColor:'#fff', alignItems:'center' },
  segActive:{ backgroundColor:'#d7ffd9', borderColor:'#0a8a20' },
  segText:{ fontFamily:FONT, fontSize:16, color:'#111' },
  segTextActive:{ color:'#075e16' },

  /* 드롭다운 */
  ddWrap:{ position:'relative' },
  ddBtn:{ height:44, paddingHorizontal:14, backgroundColor:'#fff', borderWidth:2, borderColor:'#111', borderRadius:12, alignItems:'center', justifyContent:'space-between', flexDirection:'row' },
  ddText:{ fontFamily:FONT, fontSize:16, color:'#111' },
  ddArrow:{ fontFamily:FONT, fontSize:14, color:'#111' },
  ddMenu:{ position:'absolute', top:48, left:0, right:0, backgroundColor:'#fff', borderWidth:2, borderColor:'#111', borderRadius:12, overflow:'hidden', zIndex:20 },
  ddItem:{ paddingVertical:10, paddingHorizontal:14, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.06)' },
  ddItemText:{ fontFamily:FONT, fontSize:15, color:'#111' },

  /* 리스트 */
  item:{ flexDirection:'row', backgroundColor:'rgba(255,255,255,0.95)', borderRadius:12, overflow:'hidden' },
  thumb:{ width:120, height:80, backgroundColor:'#ddd' },
  meta:{ flex:1, padding:10, gap:4, justifyContent:'center' },
  itemTitle:{ fontFamily:FONT, fontSize:14, lineHeight:18, color:'#111' },
  itemChan:{ fontFamily:FONT, fontSize:12, lineHeight:15, color:'#4B5563' },
  empty:{ fontFamily:FONT, fontSize:14, lineHeight:18, color:'#111', textAlign:'center', paddingVertical:12 },
  err:{ fontFamily:FONT, fontSize:14, color:'#ef4444', textAlign:'center' },
})
