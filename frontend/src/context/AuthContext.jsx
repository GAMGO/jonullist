import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as atob } from 'base-64';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  apiPost,
  setAuthToken as setApiAuthToken,
  clearAuthToken as clearApiAuthToken,
  isTokenExpiringSoon,
  autoRefreshToken,
  subscribeToken,
} from '../config/api';
import { registerPushToken, deletePushToken } from '../api/alarm';
import { useI18n } from '../i18n/I18nContext';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const goalKey = (userId) => `goalsetup_${String(userId || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

export default function AuthProvider({ children }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [needsGoalSetup, setNeedsGoalSetup] = useState(false);
  const [authToken, setAuthTokenState] = useState(null);

  const parseJwt = (tokenWithPrefix) => {
    try {
      const raw = String(tokenWithPrefix || '').replace(/^Bearer\s+/i, '');
      const payload = raw.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return json || {};
    } catch { return {}; }
  };

  const loadGoalFlag = async (userId) => {
    if (!userId) return false;
    const v = await SecureStore.getItemAsync(goalKey(userId));
    return v !== '1';
  };

  const wipeLegacyTokens = async () => {
    try { await AsyncStorage.multiRemove(['token','authToken','accessToken','@auth/token']); } catch {}
  };

  // ✅ 현재 기기의 Expo Push Token 가져와 서버에 등록
  const tryRegisterDevicePushToken = async () => {
    try {
      // 권한 확인/요청 (로그인 직후에도 안전)
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') return;
      }

      // Android 채널 보장 (헤드업)
      // 채널 존재 시 재설정해도 무해
      // 중요: 실제 알림 발송은 서버에서 하므로 이건 포그라운드/테스트용
      // (앱 단에서도 채널 없으면 토스트만 보일 수 있음)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 200, 120, 200],
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // projectId가 설정되어 있어야 최신 SDK에서 안정적
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      const tokenResp = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoToken = tokenResp?.data;
      if (!expoToken) return;

      await registerPushToken({
        token: expoToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      // console.log('Push token registered:', expoToken);
    } catch (e) {
      // 서버 인증 전이거나 일시적 네트워크 이슈면 무시해도 됨
      // console.warn('register token skipped:', e?.message);
    }
  };

  // ✅ 현재 기기의 Expo Push Token을 서버에서 삭제
  const tryDeleteDevicePushToken = async () => {
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      const tokenResp = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoToken = tokenResp?.data;
      if (!expoToken) return;
      await deletePushToken(expoToken);
    } catch (e) {
      // 로그아웃 진행은 계속
      // console.warn('delete token skipped:', e?.message);
    }
  };

  // api.js가 토큰을 갱신했을 때 로컬 state 동기화
  useEffect(() => {
    const unsub = subscribeToken((next) => setAuthTokenState(next));
    return unsub;
  }, []);

  // 초기 부팅: 토큰 있으면 검증하고 필요 시 즉시 갱신
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await wipeLegacyTokens();

        const stored = await SecureStore.getItemAsync('accessToken');
        if (!mounted) return;

        if (stored) {
          setApiAuthToken(stored);
          setAuthTokenState(stored);

          // 만료 임박 시 즉시 갱신 시도
          let workingToken = stored;
          if (isTokenExpiringSoon(stored, 60_000)) {
            const refreshed = await autoRefreshToken();
            if (refreshed) workingToken = refreshed;
          }

          let uid = null;
          try { uid = parseJwt(workingToken).sub ?? null; } catch {}
          if (!mounted) return;

          setUser({ id: uid });
          setAuthed(true);
          try { await AsyncStorage.setItem('last_user_id', String(uid || '')); } catch {}
          try {
            const need = await loadGoalFlag(uid);
            if (mounted) setNeedsGoalSetup(need);
          } catch {}

          // ✅ 앱을 다시 켰는데 이미 로그인 상태였다면 이 시점에 토큰 등록 보장
          await tryRegisterDevicePushToken();
        }
      } catch {
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 주기적 사전 체크(1분마다, 5분 이내 만료면 갱신)
  useEffect(() => {
    if (!authToken) return;
    const timer = setInterval(async () => {
      try {
        if (isTokenExpiringSoon(authToken, 5 * 60_000)) {
          await autoRefreshToken();
        }
      } catch {}
    }, 60_000);
    return () => clearInterval(timer);
  }, [authToken]);

  const login = async (id, password) => {
    try {
      const res = await apiPost('/api/auth/login', { id, password });
      const token = res.tokenType ? `${res.tokenType} ${res.token}` : `Bearer ${res.token}`;

      await SecureStore.setItemAsync('accessToken', token);
      await wipeLegacyTokens();
      await setApiAuthToken(token, { persist: false }); // 이미 SecureStore에 저장함
      setAuthTokenState(token);

      const userId = res.id ?? parseJwt(token).sub ?? id;
      setUser({ id: userId });
      setAuthed(true);

      try { await AsyncStorage.setItem('last_user_id', String(userId)); } catch {}
      setNeedsGoalSetup(await loadGoalFlag(userId));

      // ✅ 로그인 성공 직후 토큰 등록
      await tryRegisterDevicePushToken();

      return true;
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('401') || /Invalid credentials|Unauthorized/i.test(msg)) {
        throw new Error(t('INVALID_CREDENTIALS'));
      }
      throw e;
    }
  };

  const logout = async () => {
    try {
      // ✅ 서버에서 현재 기기 푸시 토큰 제거 (가능하면 먼저)
      await tryDeleteDevicePushToken();
    } catch {}
    try { await apiPost('/api/auth/logout', {}); } catch {}
    try { await SecureStore.deleteItemAsync('accessToken'); } catch {}
    await wipeLegacyTokens();
    try { await AsyncStorage.removeItem('last_user_id'); } catch {}
    await clearApiAuthToken();
    setUser(null);
    setAuthed(false);
    setNeedsGoalSetup(false);
    setAuthTokenState(null);
  };

  const markGoalDone = async () => {
    const uid = user?.id;
    if (!uid) return;
    await SecureStore.setItemAsync(goalKey(uid), '1');
    setNeedsGoalSetup(false);
  };

  const value = useMemo(() => ({
    ready,
    isAuthenticated,
    user,
    needsGoalSetup,
    login,
    logout,
    markGoalDone,
    token: authToken,
  }), [ready, isAuthenticated, user, needsGoalSetup, authToken]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
