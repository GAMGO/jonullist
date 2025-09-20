import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAlarmSettings, saveAlarmSettings, updateAlarmSettings } from '../api/alarm';
import { useFonts } from 'expo-font';
import { useAuth } from '../context/AuthContext';
import { autoRefreshToken } from '../config/api'; // 세션 재발급

const FONT = 'DungGeunMo';

// ✅ 타임존/일자 영향 제거: 고정 기준일(2000-01-01)로 시간만 보존
function normalizeTime(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return new Date(2000, 0, 1, d.getHours(), d.getMinutes(), 0, 0);
}
function makeTime(h, m) {
  return new Date(2000, 0, 1, Number(h ?? 0), Number(m ?? 0), 0, 0);
}

function TimeButton({ label, time, onPress, disabled }) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <Pressable style={[styles.timeBtn, disabled && { opacity: 0.6 }]} onPress={onPress} disabled={disabled}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{pad(time.getHours())}:{pad(time.getMinutes())}</Text>
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

  const [pickerKey, setPickerKey] = useState(null); // 'morning' | 'lunch' | 'dinner'
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 공통: 서버에서 설정 로드(+배열 대응)
  const loadSettings = async () => {
    const data = await getAlarmSettings();
    const settings = Array.isArray(data) ? data[0] : data; // ✅ 리스트면 0번만 사용
    if (!settings || Object.keys(settings).length === 0) {
      setIsNew(true);
      return null;
    }
    setIsNew(false);
    setEnabled(!!settings.alarmEnabled);
    setMorning(makeTime(settings.morningHour, settings.morningMinute));
    setLunch(makeTime(settings.lunchHour, settings.lunchMinute));
    setDinner(makeTime(settings.dinnerHour, settings.dinnerMinute));
    return settings;
  };

  // 화면 진입 시 세션 미리 갱신 + 현재 설정 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await autoRefreshToken().catch(() => null); // 선제 갱신(조용히 실패 무시)
        setLoading(true);
        if (!mounted) return;
        await loadSettings();
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('404') || /Not\s*Found/i.test(msg)) {
          setIsNew(true);
        } else {
          Alert.alert('오류', '알림 설정 조회에 실패했습니다.\n다시 시도해주세요.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const payload = useMemo(() => ({
    morningHour: morning.getHours(),
    morningMinute: morning.getMinutes(),
    lunchHour:   lunch.getHours(),
    lunchMinute: lunch.getMinutes(),
    dinnerHour:  dinner.getHours(),
    dinnerMinute:dinner.getMinutes(),
    alarmEnabled: enabled,
  }), [morning, lunch, dinner, enabled]);

  // 텍스트로 온 에러에서 HTTP 코드 뽑기
  const extractCode = (raw) => {
    try {
      if (typeof raw !== 'string') raw = String(raw ?? '');
      const m = raw.match(/HTTP\s+(\d{3})/i);
      if (m?.[1]) return Number(m[1]);
      if (/403/.test(raw)) return 403;
      if (/401/.test(raw)) return 401;
      if (/404/.test(raw)) return 404;
      if (/409/.test(raw)) return 409;
    } catch {}
    return null;
  };

  // 저장(탄탄한 재시도 전략)
  const saveRobust = async () => {
    const callCreate = () => saveAlarmSettings(payload);
    const callUpdate = () => updateAlarmSettings(payload);

    // 1차 시도: 현재 플래그대로
    try {
      console.log('[Alarm] save start', { isNew, payload });
      await (isNew ? callCreate() : callUpdate());
      return true;
    } catch (e1) {
      const r1 = String(e1?.message || '');
      const c1 = extractCode(r1);
      console.warn('[Alarm] first attempt failed:', c1, r1);

      // 세션 문제면 한 번 갱신 후 동일 방식 재시도
      if (c1 === 401 || c1 === 403) {
        const refreshed = await autoRefreshToken();
        if (refreshed) {
          try {
            await (isNew ? callCreate() : callUpdate());
            return true;
          } catch (e2) {
            const r2 = String(e2?.message || '');
            const c2 = extractCode(r2);
            console.warn('[Alarm] retry after refresh failed:', c2, r2);
            // 아래 fallback 로직으로 이어감
          }
        }
      }

      // 자주 나오는 상태 뒤집기 처리:
      // - PUT인데 서버엔 없음(404) → POST로 재시도
      // - POST인데 이미 있음(409, 혹은 400 특정 메시지) → PUT으로 재시도
      if (!isNew && (c1 === 404)) {
        console.log('[Alarm] fallback: PUT→POST');
        await callCreate();
        setIsNew(false);
        return true;
      }
      if (isNew && (c1 === 409 || /already|exists/i.test(r1))) {
        console.log('[Alarm] fallback: POST→PUT');
        await callUpdate();
        setIsNew(false);
        return true;
      }

      throw e1; // 그래도 실패면 밖에서 처리
    }
  };

  async function onSave() {
    // 피커 열려 있으면 닫고 저장
    if (pickerKey) {
      setPickerKey(null);
      setTimeout(onSave, 50);
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      if (!isAuthenticated) {
        // 세션 재발급 한 번 시도 (소셜/서버 세션이 살아있는 케이스 커버)
        await autoRefreshToken().catch(() => null);
      }

      await saveRobust();
      setIsNew(false);

      // ✅ 저장 직후 재조회해서 로컬 상태를 서버와 강제 싱크
      try {
        const fresh = await loadSettings();
        if (!fresh) console.log('[Alarm] saved but no settings from server');
      } catch (e) {
        console.warn('[Alarm] refetch after save failed:', e?.message || e);
      }

      Alert.alert('바벨몬', '알림 설정이 저장되었습니다.');
    } catch (e) {
      const raw = String(e?.message || '');
      let detail = '알림 설정 저장에 실패했습니다.';
      try {
        if (raw.trim().startsWith('{')) {
          const obj = JSON.parse(raw);
          if (obj?.message) detail += `\n(${obj.message})`;
        } else {
          const code = extractCode(raw);
          if (code) detail += `\n(HTTP ${code})`;
          if (code === 401 || code === 403) {
            detail += '\n세션이 만료되었을 수 있어요. 다시 로그인 후 시도해주세요.';
          }
        }
      } catch {}
      console.warn('[Alarm] save failed:', raw);
      Alert.alert('오류', detail);
    } finally {
      setSaving(false);
    }
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
          display="spinner" // 숫자 스피너
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
