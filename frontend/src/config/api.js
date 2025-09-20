import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------- IP/Origin Utils ---------- */
function isPrivateIp(h) {
  return !!h && /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(h);
}
function getHostFromExpo() {
  const c = Constants || {};
  const uri =
    (c.expoConfig && c.expoConfig.hostUri) ||
    (c.manifest2 && c.manifest2.extra && c.manifest2.extra.expoClient && c.manifest2.extra.expoClient.hostUri) ||
    (c.manifest && c.manifest.hostUri);
  if (!uri) return undefined;
  const m = String(uri).match(/^([^:\/?#]+)(?::\d+)?/);
  return m ? m[1] : undefined;
}
function getHostFromScriptURL() {
  const u = NativeModules?.SourceCode?.scriptURL;
  if (!u) return undefined;
  try { return new URL(u).hostname } catch { return undefined }
}
function getExtra() {
  return (
    (Constants.expoConfig && Constants.expoConfig.extra) ||
    (Constants.manifest && Constants.manifest.extra) ||
    {}
  );
}
function normalizeOrigin(v) { return v ? String(v).replace(/\/+$/, '') : v; }
const EXTRA = getExtra();
const ENV_ORIGIN = normalizeOrigin(process.env.EXPO_PUBLIC_API_ORIGIN || EXTRA.apiOrigin || null);
const ENV_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? EXTRA.apiPort ?? 3000);

function pickFirst(...vals) { return vals.find(v => v != null && v !== '') }

function getDevOrigin() {

  if (ENV_ORIGIN) return ENV_ORIGIN;

  if (Platform.OS === 'android') {
    const host = pickFirst(getHostFromExpo(), getHostFromScriptURL());
    if (!host || !isPrivateIp(host)) {
      return `http://10.0.2.2:${ENV_PORT}`; // 혹시라도 안 되면 이걸 의심하시길

    }
  }
  if (Platform.OS === 'ios') {
    const host = pickFirst(getHostFromExpo(), getHostFromScriptURL());
    if (!host || !isPrivateIp(host)) {
      return `http://127.0.0.1:${ENV_PORT}`; // 아이폰은 갤럭시로 바꾸시길 우헤헤
    }
  }

  const expoHost = getHostFromExpo();
  const metroHost = getHostFromScriptURL();
  const host = isPrivateIp(expoHost) ? expoHost : (isPrivateIp(metroHost) ? metroHost : null);

  const fallbackHost = pickFirst(
    host,
    EXTRA.devHost,
    process.env.EXPO_PUBLIC_DEV_HOST,
    '192.168.0.13'
  );
  return `http://${fallbackHost}:${ENV_PORT}`;
}

const PROD_ORIGIN = normalizeOrigin(EXTRA.apiProdOrigin || 'https://your-prod.example.com');
export const ORIGIN = __DEV__ ? getDevOrigin() : PROD_ORIGIN;
export const API_BASE_DEBUG = ORIGIN;

/* ---------- Auth Header Handling ---------- */
let CURRENT_TOKEN = null;

// 토큰 변경 브로드캐스트 (AuthContext가 구독함)
const tokenListeners = new Set();
export function subscribeToken(listener) {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}
function emitToken(t) { tokenListeners.forEach(fn => { try { fn(t); } catch {} }); }

function normalizeAuthHeader(raw) {
  if (!raw) return null;
  const v = String(raw).trim();
  return /^(Bearer|Basic|Token)\s+/i.test(v) ? v : `Bearer ${v}`;
}
export async function setAuthToken(t, opts = { persist: false }) {
  CURRENT_TOKEN = normalizeAuthHeader(t);
  if (opts.persist && CURRENT_TOKEN) {
    try { await SecureStore.setItemAsync('accessToken', CURRENT_TOKEN); } catch {}
  }
  emitToken(CURRENT_TOKEN);
}
export async function clearAuthToken() {
  CURRENT_TOKEN = null;
  try { await SecureStore.deleteItemAsync('accessToken'); } catch {}
  try { await AsyncStorage.multiRemove(['token','authToken','accessToken','@auth/token']); } catch {}
  emitToken(null);
}

async function getAuthHeaderObject() {
  if (!CURRENT_TOKEN) {
    try {
      const raw = await SecureStore.getItemAsync('accessToken');
      if (raw) CURRENT_TOKEN = normalizeAuthHeader(raw);
    } catch {}
  }
  const auth = CURRENT_TOKEN ? { Authorization: CURRENT_TOKEN } : {};
  if (__DEV__) console.log('🔑 Auth header ->', auth);
  return auth;
}

/* ---------- JWT helpers ---------- */
function safeParseJwt(tokenWithPrefix) {
  try {
    const raw = String(tokenWithPrefix || '').replace(/^Bearer\s+/i, '');
    const payload = raw.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(global.atob ? atob(payload.replace(/-/g, '+').replace(/_/g, '/')) :
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return json;
  } catch { return null; }
}
export function isTokenExpiringSoon(token, skewMs = 300000) {
  const p = safeParseJwt(token);
  if (!p?.exp) return false;
  const expiryMs = p.exp * 1000;
  return expiryMs - Date.now() < skewMs;
}

/* ---------- Refresh ---------- */
/** 서버에 /api/auth/refresh 호출해서 새 토큰을 받아 저장 */
export async function autoRefreshToken() {
  const auth = await getAuthHeaderObject();
  if (!auth.Authorization) return null;
  try {
    const res = await fetch(`${ORIGIN}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...auth,
      },
      body: '{}',
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    const data = JSON.parse(text || '{}');
    const newToken = data.tokenType ? `${data.tokenType} ${data.token}` : (data.token ?? null);
    if (!newToken) throw new Error('No token in refresh response');
    await setAuthToken(newToken, { persist: true });
    if (__DEV__) console.log('🔄 token refreshed');
    return newToken;
  } catch (e) {
    if (__DEV__) console.warn('🔄 token refresh failed:', e?.message || e);
    return null;
  }
}

/* ---------- Core Fetch (with 401/403 1회 재시도) ---------- */
const join = (base, path) => `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

async function request(method, path, { body, headers, timeoutMs } = {}) {
  const url = join(ORIGIN, path);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs ?? 25000);

  const doFetch = async () => {
    const auth = await getAuthHeaderObject();
    const finalHeaders = {
      Accept: 'application/json',
      ...(method !== 'GET' && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
      ...auth,
    };
    if (__DEV__) console.log(`${method}`, url, { headers: finalHeaders, body });

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      signal: ctrl.signal,
      ...(body != null ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
    });
    return res;
  };

  try {
    let res = await doFetch();

    // 만료/권한 문제 시 한 번만 자동 갱신 + 재시도
    if (res.status === 401 || res.status === 403) {
      const refreshed = await autoRefreshToken();
      if (refreshed) {
        res = await doFetch();
      }
    }

    const text = await res.text();
    if (__DEV__) console.log(`${method} <-`, res.status, text);

    if (!res.ok) {
      throw new Error(text || `HTTP ${res.status}`);
    }
    try { return JSON.parse(text) } catch { return text }
  } finally {
    clearTimeout(to);
  }
}

/* ---------- Public APIs ---------- */
export async function apiGet(path, init) {
  return request('GET', path, { headers: init?.headers, timeoutMs: init?.timeoutMs });
}
export async function apiPost(path, body, init) {
  return request('POST', path, { body, headers: init?.headers, timeoutMs: init?.timeoutMs });
}
export async function apiDelete(path, init) {
  return request('DELETE', path, { headers: init?.headers, timeoutMs: init?.timeoutMs });
}
