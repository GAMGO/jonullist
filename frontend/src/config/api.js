import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

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
  try { return new URL(u).hostname; } catch { return undefined; }
}
function getExtra() {
  return (
    (Constants.expoConfig && Constants.expoConfig.extra) ||
    (Constants.manifest && Constants.manifest.extra) ||
    {}
  );
}
function normalizeOrigin(v) {
  return v ? String(v).replace(/\/+$/, '') : v;
}

const EXTRA = getExtra();
// ★ 기본 포트 3000
const ENV_ORIGIN = normalizeOrigin(process.env.EXPO_PUBLIC_API_ORIGIN || EXTRA.apiOrigin || null);
const ENV_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? EXTRA.apiPort ?? 3000);

function getDevOrigin() {
  if (ENV_ORIGIN) return ENV_ORIGIN;
  const expoHost = getHostFromExpo();
  const metroHost = getHostFromScriptURL();
  let host;
  if (isPrivateIp(expoHost)) host = expoHost;
  else if (isPrivateIp(metroHost)) host = metroHost;
  else host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${ENV_PORT}`;
}

const PROD_ORIGIN = normalizeOrigin(EXTRA.apiProdOrigin || 'https://your-prod.example.com');

export const ORIGIN = __DEV__ ? getDevOrigin() : PROD_ORIGIN;
export const API_BASE_DEBUG = ORIGIN;

const join = (base, path) => `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

let CURRENT_TOKEN = null; // "Bearer xxx.yyy.zzz" or raw
export function setAuthToken(t) { CURRENT_TOKEN = t || null; }
export function clearAuthToken() { CURRENT_TOKEN = null; }

function withAuthHeaders(init) {
  const base = init?.headers || {};
  if (!CURRENT_TOKEN) return base;
  // 혹시 raw 토큰이 들어와도 한 번만 접두사 붙이도록 가드
  const auth = CURRENT_TOKEN.startsWith('Bearer ') ? CURRENT_TOKEN : `Bearer ${CURRENT_TOKEN}`;
  return { ...base, Authorization: auth };
}

export async function apiGet(path, init) {
  const url = join(ORIGIN, path);
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { ...(init || {}), method: 'GET', signal: ctrl.signal, headers: withAuthHeaders(init) });
    const text = await res.text();
    if (__DEV__) console.log('GET', url, '->', res.status, text);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);
    try { return JSON.parse(text); } catch { return text; }
  } finally { clearTimeout(to); }
}

export async function apiPost(path, body, init) {
  const url = join(ORIGIN, path);
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, {
      ...(init || {}),
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...withAuthHeaders(init) },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const text = await res.text();
    if (__DEV__) console.log('POST', url, '->', res.status, text);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);
    try { return JSON.parse(text); } catch { return text; }
  } finally { clearTimeout(to); }
}
