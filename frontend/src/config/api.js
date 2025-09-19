import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
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

  // Emulator/simulator shortcuts
  if (Platform.OS === 'android') {
    // Android 에뮬레이터가 PC의 localhost 접근할 때
    const host = pickFirst(getHostFromExpo(), getHostFromScriptURL());
    if (!host || !isPrivateIp(host)) {
      // 에뮬레이터 사용 시 백엔드가 같은 PC에서 돌면 10.0.2.2
      return `http://10.0.2.2:${ENV_PORT}`;
    }
  }
  if (Platform.OS === 'ios') {
    // iOS 시뮬레이터는 localhost 그대로 접근됨(백엔드가 같은 Mac)
    const host = pickFirst(getHostFromExpo(), getHostFromScriptURL());
    if (!host || !isPrivateIp(host)) {
      return `http://127.0.0.1:${ENV_PORT}`;
    }
  }

  const expoHost = getHostFromExpo();
  const metroHost = getHostFromScriptURL();
  const host = isPrivateIp(expoHost) ? expoHost : (isPrivateIp(metroHost) ? metroHost : null);

  // 로컬 네트워크 장치(실기기)에서 접속: 개발 PC의 사설 IP나 지정 IP를 한 번에 처리
  const fallbackHost = pickFirst(
    host,
    EXTRA.devHost,                           // app.json → extra.devHost 지원
    process.env.EXPO_PUBLIC_DEV_HOST,        // EAS env
    // ↓ 필요 시 여기 한 줄만 바꿔서 현장 IP 지정
    '192.168.0.13'
  );
  return `http://${fallbackHost}:${ENV_PORT}`;
}

const PROD_ORIGIN = normalizeOrigin(EXTRA.apiProdOrigin || 'https://your-prod.example.com');
export const ORIGIN = __DEV__ ? getDevOrigin() : PROD_ORIGIN;
export const API_BASE_DEBUG = ORIGIN;

/* ---------- Auth Header Handling ---------- */
let CURRENT_TOKEN = null;

function normalizeAuthHeader(raw) {
  if (!raw) return null;
  const v = String(raw).trim();
  return /^(Bearer|Basic|Token)\s+/i.test(v) ? v : `Bearer ${v}`;
}
export function setAuthToken(t) { CURRENT_TOKEN = normalizeAuthHeader(t) }
export function clearAuthToken() { CURRENT_TOKEN = null }

async function getAuthHeaderObject() {
  if (!CURRENT_TOKEN) {
    try {
      const raw = await AsyncStorage.getItem('@auth/token');
      if (raw) CURRENT_TOKEN = normalizeAuthHeader(raw);
    } catch {}
  }
  const auth = CURRENT_TOKEN ? { Authorization: CURRENT_TOKEN } : {};
  if (__DEV__) console.log('🔑 Auth header ->', auth);
  return auth;
}

/* ---------- Core Fetch ---------- */
const join = (base, path) => `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

async function request(method, path, { body, headers, timeoutMs } = {}) {
  const url = join(ORIGIN, path);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs ?? 25000);

  try {
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

    const text = await res.text();
    if (__DEV__) console.log(`${method} <-`, res.status, text);

    if (!res.ok) {
      // 백엔드 에러 바디 그대로 에러 메시지로 노출
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
  // Spring @DeleteMapping은 보통 쿼리스트링 사용. 바디 보내지 말자.
  return request('DELETE', path, { headers: init?.headers, timeoutMs: init?.timeoutMs });
}
