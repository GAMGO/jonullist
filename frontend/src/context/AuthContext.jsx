import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as atob } from 'base-64';
import {
  apiPost,
  setAuthToken as setApiAuthToken,
  clearAuthToken as clearApiAuthToken,
  isTokenExpiringSoon,
  autoRefreshToken,
  subscribeToken,
} from '../config/api';
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
