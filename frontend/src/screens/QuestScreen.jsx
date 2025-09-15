import { useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, ImageBackground, StyleSheet, Animated, AppState, ActivityIndicator, TouchableOpacity, Image, Linking, FlatList } from 'react-native'
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
function haversineFix(lat1,lon1,lat2,lon2){const R=6371000,toRad=x=>x*Math.PI/180;const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const s1=Math.sin(dLat/2),s2=Math.sin(dLon/2);const a=s1*s1+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2*s2;return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

const TAB_HOME = 'home'
const TAB_STRETCH = 'stretch'
const TAB_GYM = 'gym'

const PRESETS = {
  [TAB_HOME]: '홈트 전신 운동 10분',
  [TAB_STRETCH]: '전신 스트레칭 10분'
}

const GYM_OPTIONS = [
  { key:'squat', label:'스쿼트', query:'스쿼트 올바른 자세 루틴' },
  { key:'bench', label:'벤치프레스', query:'벤치프레스 폼 교정 초보 루틴' },
  { key:'deadlift', label:'데드리프트', query:'데드리프트 자세 핵심 팁' },
  { key:'lat', label:'랫풀다운', query:'랫풀다운 등운동 루틴' },
  { key:'legpress', label:'레그프레스', query:'레그프레스 무릎 보호 루틴' },
  { key:'shoulder', label:'숄더프레스', query:'숄더프레스 어깨운동 루틴' },
  { key:'row', label:'시티드 로우', query:'시티드 로우 등운동 루틴' },
  { key:'cable', label:'케이블 코어', query:'케이블 크런치 복근 운동' },
]

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

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [tab, setTab] = useState(TAB_HOME)
  const [gymOpen, setGymOpen] = useState(false)
  const [gymKey, setGymKey] = useState(GYM_OPTIONS[0].key)

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

  async function fetchVideosByQuery(q){
    setLoading(true); setError(''); setVideos([])
    try {
      const raw = await apiGet(`/api/youtube/search?q=${encodeURIComponent(q)}&maxResults=12`)
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
      setError('영상을 불러오지 못했어')
    } finally {
      setLoading(false)
    }
  }

  function onTabChange(nextTab){
    setTab(nextTab)
    if (nextTab===TAB_HOME) fetchVideosByQuery(PRESETS[TAB_HOME])
    else if (nextTab===TAB_STRETCH) fetchVideosByQuery(PRESETS[TAB_STRETCH])
    else if (nextTab===TAB_GYM){
      const opt = GYM_OPTIONS.find(o=>o.key===gymKey) || GYM_OPTIONS[0]
      fetchVideosByQuery(opt.query)
    }
  }

  function onGymPick(k){
    setGymKey(k)
    const opt = GYM_OPTIONS.find(o=>o.key===k) || GYM_OPTIONS[0]
    fetchVideosByQuery(opt.query)
    setGymOpen(false)
  }

  useEffect(()=>{ onTabChange(TAB_HOME) },[]) 

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

  const gymLabel = (GYM_OPTIONS.find(o=>o.key===gymKey)||GYM_OPTIONS[0]).label

  return(
    <ImageBackground source={require('../../assets/background/home.png')} style={{flex:1}} resizeMode="cover">
      <Text style={[styles.screenTitle,{top:insets.top+8}]}>{t('BURNING') || 'BURNING'}</Text>

      <View style={{ flex:1, paddingTop: insets.top + 88, paddingHorizontal: 18, gap: 16 }}>
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

        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={()=>onTabChange(TAB_HOME)} style={[styles.tabBtn, tab===TAB_HOME && styles.tabActive]}>
            <Text style={[styles.tabTxt, tab===TAB_HOME && styles.tabTxtActive]}>홈트</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>onTabChange(TAB_STRETCH)} style={[styles.tabBtn, tab===TAB_STRETCH && styles.tabActive]}>
            <Text style={[styles.tabTxt, tab===TAB_STRETCH && styles.tabTxtActive]}>스트레칭</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>onTabChange(TAB_GYM)} style={[styles.tabBtn, tab===TAB_GYM && styles.tabActive]}>
            <Text style={[styles.tabTxt, tab===TAB_GYM && styles.tabTxtActive]}>기구운동</Text>
          </TouchableOpacity>
        </View>

        {tab===TAB_GYM && (
          <View style={{gap:8}}>
            <View>
              <TouchableOpacity onPress={()=>setGymOpen(v=>!v)} style={styles.ddBtn}>
                <Text style={styles.ddTxt}>{gymLabel}</Text>
                <Text style={styles.ddArrow}>{gymOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {gymOpen && (
                <View style={styles.ddMenu}>
                  {GYM_OPTIONS.map(o=>(
                    <TouchableOpacity key={o.key} onPress={()=>onGymPick(o.key)} style={styles.ddItem}>
                      <Text style={[styles.ddItemTxt, o.key===gymKey && styles.ddItemActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.listWrap}>
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
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
    </ImageBackground>
  )
}

const styles=StyleSheet.create({
  screenTitle:{position:'absolute',left:0,right:0,textAlign:'center',color:'#000',fontSize:26,lineHeight:32,textShadowColor:'rgba(255,255,255,0.28)',textShadowOffset:{width:0,height:1},textShadowRadius:2,zIndex:10,fontFamily:FONT,fontWeight:'normal',includeFontPadding:true},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:'rgba(255,255,255,0.8)',borderRadius:24,padding:18,gap:12},
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
  tabsRow:{ flexDirection:'row', gap:8 },
  tabBtn:{ flex:1, height:40, borderWidth:2, borderColor:'#111', borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.9)' },
  tabActive:{ backgroundColor:'#111', borderColor:'#111' },
  tabTxt:{ fontFamily:FONT, fontSize:16, color:'#111' },
  tabTxtActive:{ color:'#fff' },
  listWrap:{ flex:1, minHeight:120, paddingBottom:24 },
  item:{ flexDirection:'row', backgroundColor:'rgba(255,255,255,0.9)', borderRadius:12, overflow:'hidden' },
  thumb:{ width:120, height:80, backgroundColor:'#ddd' },
  meta:{ flex:1, padding:10, gap:4, justifyContent:'center' },
  itemTitle:{ fontFamily:FONT, fontSize:14, lineHeight:18, color:'#111' },
  itemChan:{ fontFamily:FONT, fontSize:12, lineHeight:15, color:'#4B5563' },
  empty:{ fontFamily:FONT, fontSize:14, lineHeight:18, color:'#111', textAlign:'center', paddingVertical:12 },
  err:{ fontFamily:FONT, fontSize:14, color:'#ef4444', textAlign:'center' },
  ddBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:44, paddingHorizontal:12, borderWidth:2, borderColor:'#111', borderRadius:12, backgroundColor:'rgba(255,255,255,0.9)' },
  ddTxt:{ fontFamily:FONT, fontSize:16, color:'#111' },
  ddArrow:{ fontFamily:FONT, fontSize:14, color:'#4B5563' },
  ddMenu:{ marginTop:6, borderWidth:2, borderColor:'#111', borderRadius:12, overflow:'hidden', backgroundColor:'rgba(255,255,255,0.98)' },
  ddItem:{ paddingVertical:10, paddingHorizontal:12 },
  ddItemTxt:{ fontFamily:FONT, fontSize:16, color:'#111' },
  ddItemActive:{ textDecorationLine:'underline' },
})
