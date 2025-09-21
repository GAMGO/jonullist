import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAlarmSettings, saveAlarmSettings, updateAlarmSettings } from '../api/alarm';
import { useFonts } from 'expo-font';
import { useAuth } from '../context/AuthContext';
import { autoRefreshToken } from '../config/api';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT = 'DungGeunMo';
const STORAGE_KEY = 'barbelmon.mealAlarm.schedules';
const DAYS_AHEAD = 7;

function normalizeTime(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return new Date(2000, 0, 1, d.getHours(), d.getMinutes(), 0, 0);
}
function makeTime(h, m) {
  return new Date(2000, 0, 1, Number(h ?? 0), Number(m ?? 0), 0, 0);
}
const pad2 = (n) => String(n).padStart(2, '0');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: '바벨몬 알림',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22c55e',
    sound: 'default',
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}
async function ensurePermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function readScheduleIds() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
async function writeScheduleIds(obj) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
  } catch {}
}
async function cancelAllScheduled(idsObj) {
  const values = Object.values(idsObj || {});
  const flat = values.flat ? values.flat() : values.reduce((a, v) => a.concat(v), []);
  await Promise.all(flat.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => null)));
  await writeScheduleIds({});
}

function buildMessage(slot, hour, minute) {
  const titleMap = { morning: '🍳 아침 알림', lunch: '🍱 점심 알림', dinner: '🍽️ 저녁 알림' };
  const bodyMap = {
    morning: `지금은 ${pad2(hour)}:${pad2(minute)}. 가벼운 아침으로 스타트!`,
    lunch:   `지금은 ${pad2(hour)}:${pad2(minute)}. 점심으로 에너지 채우자!`,
    dinner:  `지금은 ${pad2(hour)}:${pad2(minute)}. 오늘도 수고했어, 저녁 맛있게!`,
  };
  return {
    title: titleMap[slot] || '바벨몬 알림',
    body: bodyMap[slot] || '바벨몬에서 알림이 도착했어요.',
  };
}

function nextDates(hour, minute, count) {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    d.setDate(d.getDate() + i);
    if (d.getTime() <= now.getTime() + 30 * 1000) d.setDate(d.getDate() + 1);
    dates.push(d);
  }
  return dates;
}

async function scheduleOneShotSeries(slot, hour, minute) {
  const ids = [];
  const msg = buildMessage(slot, hour, minute);
  const dates = nextDates(hour, minute, DAYS_AHEAD);
  for (const date of dates) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: 'default',
        data: { type: 'meal', slot, scheduled: `${pad2(hour)}:${pad2(minute)}`, iso: date.toISOString() },
      },
      trigger: date,
    });
    ids.push(id);
  }
  return ids;
}

async function rescheduleAll({ morningHour, morningMinute, lunchHour, lunchMinute, dinnerHour, dinnerMinute }) {
  await ensureAndroidChannel();
  const granted = await ensurePermissions();
  if (!granted) throw new Error('알림 권한이 거부되어 예약할 수 없습니다.');
  const prev = await readScheduleIds();
  await cancelAllScheduled(prev);
  const ids = {};
  ids.morning = await scheduleOneShotSeries('morning', morningHour, morningMinute);
  ids.lunch   = await scheduleOneShotSeries('lunch',   lunchHour,   lunchMinute);
  ids.dinner  = await scheduleOneShotSeries('dinner',  dinnerHour,  dinnerMinute);
  await writeScheduleIds(ids);
  return ids;
}

function TimeButton({ label, time, onPress, disabled }) {
  return (
    <Pressable style={[styles.timeBtn, disabled && { opacity: 0.6 }]} onPress={onPress} disabled={disabled}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{pad2(time.getHours())}:{pad2(time.getMinutes())}</Text>
    </Pressable>
  );
}

export default function AlarmSettingsScreen() {
  const { isAuthenticated } = useAuth();
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') });

  const [enabled, setEnabled] = useState(true);
  const [morning, setMorning] = useState(() => makeTime(8, 0));
  const [lunch,   setLunch]   = useState(() => makeTime(12, 30));
  const [dinner,  setDinner]  = useState(() => makeTime(19, 0));

  const [pickerKey, setPickerKey] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ensureAndroidChannel();
        await ensurePermissions().catch(() => null);
        await autoRefreshToken().catch(() => null);
        if (!mounted) return;
        setLoading(true);
        const data = await getAlarmSettings();
        const settings = Array.isArray(data) ? data[0] : data;
        if (!settings || Object.keys(settings).length === 0) {
          setIsNew(true);
        } else {
          setIsNew(false);
          setEnabled(!!settings.alarmEnabled);
          setMorning(makeTime(settings.morningHour, settings.morningMinute));
          setLunch(makeTime(settings.lunchHour, settings.lunchMinute));
          setDinner(makeTime(settings.dinnerHour, settings.dinnerMinute));
        }
      } catch { setIsNew(true); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const payload = useMemo(() => ({
    morningHour: morning.getHours(),
    morningMinute: morning.getMinutes(),
    lunchHour:   lunch.getHours(),
    lunchMinute: lunch.getMinutes(),
    dinnerHour:  dinner.getHours(),
    dinnerMinute: dinner.getMinutes(),
    alarmEnabled: enabled,
  }), [morning, lunch, dinner, enabled]);

  async function onSave() {
    if (pickerKey) {
      setPickerKey(null);
      setTimeout(onSave, 50);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (!isAuthenticated) await autoRefreshToken().catch(() => null);
      try {
        if (isNew) { await saveAlarmSettings(payload); }
        else { await updateAlarmSettings(payload); }
      } catch (e) {
        const msg = String(e?.message || '');
        if (!isNew && /404/.test(msg)) { await saveAlarmSettings(payload); setIsNew(false); }
        else throw e;
      }
      if (enabled) {
        await rescheduleAll(payload);
      } else {
        const prev = await readScheduleIds();
        await cancelAllScheduled(prev);
      }
      Alert.alert('바벨몬', enabled ? '알림이 예약되었습니다.' : '알림이 해제되었습니다.');
    } catch (e) {
      console.warn('[Alarm] save/schedule failed:', e?.message || e);
      Alert.alert('오류', '알림 설정 저장 또는 예약에 실패했습니다.\n권한/시간 설정을 확인해주세요.');
    } finally { setSaving(false); }
  }

  function onChangeTime(_, selectedDate) {
    if (!selectedDate) return setPickerKey(null);
    const fixed = normalizeTime(selectedDate);
    if (pickerKey === 'morning') setMorning(fixed);
    if (pickerKey === 'lunch')   setLunch(fixed);
    if (pickerKey === 'dinner')  setDinner(fixed);
    setPickerKey(null);
  }

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={[styles.label, { marginTop: 12 }]}>불러오는 중…</Text>
      </View>
    );
  }

  const canSave = !saving && !pickerKey;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>식사 알림 설정</Text>
      <View style={styles.row}>
        <Text style={styles.label}>알림 사용</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
      <View style={styles.grid}>
        <TimeButton label="아침" time={morning} onPress={() => setPickerKey('morning')} />
        <TimeButton label="점심" time={lunch}   onPress={() => setPickerKey('lunch')} />
        <TimeButton label="저녁" time={dinner}  onPress={() => setPickerKey('dinner')} />
      </View>
      <Pressable style={[styles.saveBtn, !canSave && { opacity: 0.6 }]} onPress={onSave} disabled={!canSave}>
        <Text style={styles.saveText}>{saving ? '저장 중…' : '저장'}</Text>
      </Pressable>
      {pickerKey && (
        <DateTimePicker
          mode="time"
          value={pickerKey === 'morning' ? morning : pickerKey === 'lunch' ? lunch : dinner}
          onChange={onChangeTime}
          display="spinner"
          is24Hour={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 20, gap: 16 },
  title: { fontFamily: FONT, fontSize: 24, color: '#fff', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  label: { fontFamily: FONT, fontSize: 18, color: '#d1d5db' },
  grid: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  timeBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1f2937' },
  timeLabel: { fontFamily: FONT, color: '#9ca3af', marginBottom: 6 },
  timeValue: { fontFamily: FONT, color: '#fff', fontSize: 20 },
  saveBtn: { marginTop: 'auto', backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontFamily: FONT, color: '#0b1220', fontWeight: 'bold', fontSize: 18 },
});
