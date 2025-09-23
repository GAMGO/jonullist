// 거의 안 쓴다고 봐도 됨
import AsyncStorage from '@react-native-async-storage/async-storage'

const norm = (id) => String(id || 'anon').replace(/[^a-zA-Z0-9._-]/g, '_')
const keysFor = (uid) => ({
  date: `cal_${uid}_date`,
  current: `cal_${uid}_current`,
  target: `cal_${uid}_target`,
})

const todayKey = () => new Date().toISOString().split('T')[0]

async function resolveUid(userId) {
  if (userId != null && userId !== '') return norm(userId)
  const last = await AsyncStorage.getItem('last_user_id')
  return norm(last || 'anon')
}

export async function initCalorieData(userId) {
  const uid = await resolveUid(userId)
  const k = keysFor(uid)

  const legacyTarget = await AsyncStorage.getItem('calorie_target')
  if (legacyTarget && !(await AsyncStorage.getItem(k.target))) {
    await AsyncStorage.setItem(k.target, legacyTarget)
    await AsyncStorage.removeItem('calorie_target')
  }
  const legacyCurrent = await AsyncStorage.getItem('calorie_current')
  const legacyDate = await AsyncStorage.getItem('calorie_date')
  if (legacyCurrent && legacyDate && !(await AsyncStorage.getItem(k.current))) {
    await AsyncStorage.setItem(k.current, legacyCurrent)
    await AsyncStorage.setItem(k.date, legacyDate)
    await AsyncStorage.multiRemove(['calorie_current', 'calorie_date'])
  }

  const today = todayKey()
  const storedDate = await AsyncStorage.getItem(k.date)
  if (storedDate !== today) {
    await AsyncStorage.setItem(k.date, today)
    await AsyncStorage.setItem(k.current, '0')
  }

  const storedCurrent = await AsyncStorage.getItem(k.current)
  const storedTarget = await AsyncStorage.getItem(k.target)
  const current = storedCurrent ? Number(storedCurrent) : 0
  const target = storedTarget ? Number(storedTarget) : 1200
  return { current, target }
}

export async function addCalories(value, userId) {
  const uid = await resolveUid(userId)
  const k = keysFor(uid)
  const today = todayKey()
  const storedDate = await AsyncStorage.getItem(k.date)
  if (storedDate !== today) {
    await AsyncStorage.setItem(k.date, today)
    await AsyncStorage.setItem(k.current, '0')
  }
  const stored = await AsyncStorage.getItem(k.current)
  const current = stored ? Number(stored) : 0
  const updated = current + Number(value)
  await AsyncStorage.setItem(k.current, String(updated))
  return updated
}

export async function setTargetCalories(value, userId) {
  const uid = await resolveUid(userId)
  const k = keysFor(uid)
  await AsyncStorage.setItem(k.target, String(value))
}


// 칼로리 차감 함수
export async function subtractCalories(value, userId) {
  const uid = await resolveUid(userId)
  const k = keysFor(uid)
  const today = todayKey()
  const storedDate = await AsyncStorage.getItem(k.date)
  if (storedDate !== today) {
    await AsyncStorage.setItem(k.date, today)
    await AsyncStorage.setItem(k.current, '0')
  }
  const stored = await AsyncStorage.getItem(k.current)
  const current = stored ? Number(stored) : 0
  const updated = Math.max(0, current - Number(value)) // 음수 방지
  await AsyncStorage.setItem(k.current, String(updated))
  return updated
}

// 현재 칼로리 값 불러오기
export async function getCalories(userId) {
  const uid = await resolveUid(userId)
  const k = keysFor(uid)
  const stored = await AsyncStorage.getItem(k.current)
  return stored ? Number(stored) : 0
}