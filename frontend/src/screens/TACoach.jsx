import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Platform } from 'react-native'
import * as Speech from 'expo-speech'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width: W, height: H } = Dimensions.get('window')

const MODE_LABEL_KO = { squat: '스쿼트', pushup: '푸쉬업' }
const MODE_LABEL_EN = { squat: 'SQUAT', pushup: 'PUSH-UP' }

const TA_IMG = require('../../assets/char/ta.png')
const STORE_KEY = '@tts/voiceId'

const MOTIVATE = [
  '좋아요! 이렇게 꾸준히 하면 금방 늘어요.',
  '한 개씩 차근차근, 잘 하고 있어요!',
  '운동하는 모습 멋져요, 계속 가요!',
  '지금처럼만 하면 목표 금방 도달할 거예요.',
  '조금만 더, 분명히 성장하고 있어요!',
  '꾸준함이 근육을 만듭니다. 잘하고 있어요!',
  '포기하지 않는 게 제일 큰 힘이에요!',
  '호흡 일정하게, 지금 완벽해요!',
  '몸이 점점 강해지고 있어요, 느껴지죠?',
  '한 번 더! 그게 오늘의 차이를 만듭니다.',
  '힘든 만큼 보상은 크게 돌아와요.',
  '오늘도 자신과의 약속을 지키고 있네요!',
  '운동은 배신하지 않아요. 계속해요!',
  '조금 힘들어도 내일의 나를 위해 가는 거예요.',
  '멋진 페이스예요, 끝까지 화이팅!',
]

const SPICY = [
  '이 정도에 힘들면 엘리베이터도 운동이지요?',
  '킹받지? 그럼 한 개만 더.',
  '근손실이 전화했어요. 빨리 움직이라네요.',
  '오늘도 포기 전문가가 되실 건가요?',
  '운동은 마음이 아니라 몸으로 하는 겁니다.',
  '이 속도로는 군고구마도 다 타겠다.',
  '땀 좀 흘려봐요, 눈물 말고요.',
  '지금 멈추면 내일 더 하기 싫을 텐데요?',
  '헬스장 대신 침대랑 계약했나요?',
  '근육은 배신 안 해요, 대신 의자랑 친해지겠죠.',
  '앉아 있는 게 더 편하죠? 그게 문제예요.',
  '몸이 아니라 변명만 성장 중이네요?',
  '운동은 공짜지만 후회는 유료입니다.',
  '운동 중 포기? 오늘도 의자 MVP!',
  '열정은 어디 두고 오신 거예요?',
  '거울이랑 눈 못 마주치게 될걸요?',
]

const pick = a => a[Math.floor(Math.random() * a.length)]

function buildGreeting(mode = 'squat') {
  const h = new Date().getHours()
  const tod = h < 5 ? '새벽' : h < 12 ? '아침' : h < 18 ? '오후' : '저녁'
  const modeKo = MODE_LABEL_KO[mode] || '운동'
  return `안녕하세요! 저는 바벨몬 트레이너에요. ${tod}에도 ${modeKo} 신나게 해봐요!`
}

async function resolveVoice() {
  const saved = await AsyncStorage.getItem(STORE_KEY)
  if (saved) return saved
  try {
    const vs = await Speech.getAvailableVoicesAsync()
    const ko = (vs || []).filter(v => (v.language || '').toLowerCase().startsWith('ko'))
    const male =
      ko.find(v => String(v.gender || '').toLowerCase() === 'male') ||
      ko.find(v => /male|남성|man|min|male1|male2/i.test(String(v.name || '')))
    return (male || ko[0])?.identifier || null
  } catch { return null }
}

export default function TACoach({ route }) {
  const mode = route?.params?.mode || 'squat'
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(0)
  const [voiceId, setVoiceId] = useState(null)
  const intervalMs = 3000
  const TONES = ['soft', 'hard', 'mix']
  const TONE_LABEL = { soft: '소프트', hard: '하드', mix: '믹스' }
  const [toneIdx, setToneIdx] = useState(0)
  const tone = TONES[toneIdx]
  const toneRef = useRef(tone)

  useEffect(() => { toneRef.current = TONES[toneIdx] }, [toneIdx])

  function pickLineByTone() {
    const t = toneRef.current
    if (t === 'soft') return pick(MOTIVATE)
    if (t === 'hard') return pick(SPICY)
    return Math.random() < 0.5 ? pick(MOTIVATE) : pick(SPICY)
  }

  const loopOn = useRef(false)
  const timeoutRef = useRef(null)
  const countRef = useRef(0)
  const lastTauntAt = useRef(0)
  const startedOnceRef = useRef(false)
  const TAUNT_COOLDOWN_MS = 12000

  function speak(text, rate = 1.0) {
    return new Promise(resolve => {
      const opts = {
        language: 'ko-KR',
        rate,
        onDone: resolve,
        onStopped: resolve,
        onError: resolve,
      }
      if (voiceId) opts.voice = voiceId
      else opts.pitch = 0.85
      Speech.speak(text, opts)
    })
  }

  function clearTimer() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  async function loop() {
    if (!loopOn.current) return
    const next = countRef.current + 1
    setCount(next)
    countRef.current = next
    const t0 = Date.now()
    await speak(`${next}개`, 1.03)
    const t1 = Date.now()
    const numberDur = t1 - t0
    const now = Date.now()
    if (next % 12 === 0 && now - lastTauntAt.current > TAUNT_COOLDOWN_MS) {
      lastTauntAt.current = now
      await speak(pickLineByTone(), 1.0)
    }
    const rest = Math.max(0, intervalMs - numberDur)
    timeoutRef.current = setTimeout(loop, rest)
  }

  async function startAuto() {
    if (loopOn.current) return
    loopOn.current = true
    clearTimer()
    try { Speech.stop() } catch {}
    if (!startedOnceRef.current) {
      startedOnceRef.current = true
      await speak(buildGreeting(mode), 1.0)
      await speak('자동 카운트를 시작합니다.', 1.0)
    }
    loop()
    setRunning(true)
  }

  function stopAuto() {
    loopOn.current = false
    clearTimer()
    try { Speech.stop() } catch {}
    setRunning(false)
  }

  function cycleTone() {
    const next = (toneIdx + 1) % TONES.length
    setToneIdx(next)
    if (running) speak(`${TONE_LABEL[TONES[next]]} 톤으로 전환`, 1.0)
  }

  useEffect(() => {
    resolveVoice().then(setVoiceId)
    if (Platform.OS === 'android') {
      Speech.speak('', { language: 'ko-KR', onDone: () => Speech.stop() })
    }
    return () => { stopAuto() }
  }, [])

  return (
    <View style={S.wrap}>
      <View style={S.topCenter}>
        <View style={S.modePill}>
          <Text style={S.modeTxt}>{(MODE_LABEL_EN[mode] || mode).toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={cycleTone} style={S.tonePill}>
          <Text style={S.toneLabel}>톤</Text>
          <Text style={S.toneValue}>{TONE_LABEL[tone]}</Text>
        </TouchableOpacity>
      </View>
      <View style={S.charWrap}>
        <Image source={TA_IMG} style={S.charImg} resizeMode="contain" />
      </View>
      <View style={S.countWrap}>
        <Text style={S.countGlow}>{count}</Text>
        <Text style={S.count}>{count}</Text>
        <Text style={S.countUnit}>REPS</Text>
      </View>
      <View style={S.bottomRow}>
        <TouchableOpacity
          style={[S.ctrlBtn, S.resetBtn]}
          onPress={() => { stopAuto(); setCount(0); countRef.current = 0; startedOnceRef.current = false }}
        >
          <Text style={S.ctrlTxt}>RESET</Text>
        </TouchableOpacity>
        {running ? (
          <TouchableOpacity style={[S.ctrlBtn, S.pauseBtn]} onPress={stopAuto}>
            <Text style={S.ctrlTxt}>PAUSE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[S.ctrlBtn, S.startBtn]} onPress={startAuto}>
            <Text style={S.ctrlTxt}>START</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#05060a' },
  topCenter: { position: 'absolute', top: 28, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  modePill: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  modeTxt: {
    color: '#e8e8ea', fontSize: 22, letterSpacing: 4, fontFamily: 'DungGeunMo',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  tonePill: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)',
  },
  toneLabel: { color: '#c7d2fe', fontSize: 12, fontFamily: 'DungGeunMo', opacity: 0.9, letterSpacing: 1 },
  toneValue: {
    color: '#93c5fd', fontSize: 14, fontFamily: 'DungGeunMo', letterSpacing: 1,
    textShadowColor: 'rgba(147,197,253,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  charWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  charImg: { width: W * 0.78, height: Math.min(W * 0.9, H * 0.5) },
  countWrap: { position: 'absolute', left: 0, right: 0, bottom: 128, alignItems: 'center' },
  countGlow: {
    position: 'absolute', fontSize: 94, fontWeight: '900', fontFamily: 'DungGeunMo',
    color: 'transparent', textShadowColor: 'rgba(59,130,246,0.45)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 22,
  },
  count: {
    color: '#fff', fontSize: 86, fontWeight: '900', fontFamily: 'DungGeunMo', letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6,
  },
  countUnit: { marginTop: 8, color: '#cbd5e1', fontSize: 12, opacity: 0.9, fontFamily: 'DungGeunMo', letterSpacing: 2 },
  bottomRow: { position: 'absolute', left: 0, right: 0, bottom: 36, flexDirection: 'row', gap: 12, justifyContent: 'center' },
  ctrlBtn: {
    minWidth: 120, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    ...(Platform.OS === 'android' ? { elevation: 4 } : null),
  },
  ctrlTxt: { color: '#fff', fontWeight: '800', fontFamily: 'DungGeunMo', letterSpacing: 2 },
  startBtn: { backgroundColor: '#10b981', borderWidth: 1, borderColor: 'rgba(16,185,129,0.7)' },
  pauseBtn: { backgroundColor: '#334155', borderWidth: 1, borderColor: 'rgba(148,163,184,0.5)' },
  resetBtn: { backgroundColor: '#ef4444', borderWidth: 1, borderColor: 'rgba(239,68,68,0.7)' },
})
