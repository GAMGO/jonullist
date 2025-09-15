import { Platform, NativeModules } from 'react-native'
import Constants from 'expo-constants'

function isPrivateIp(h) {
  return !!h && /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(h)
}

function getHostFromExpo() {
  const c = Constants || {}
  const uri =
    (c.expoConfig && c.expoConfig.hostUri) ||
    (c.manifest2 && c.manifest2.extra && c.manifest2.extra.expoClient && c.manifest2.extra.expoClient.hostUri) ||
    (c.manifest && c.manifest.hostUri)
  if (!uri) return undefined
  const m = String(uri).match(/^([^:\/?#]+)(?::\d+)?/)
  return m ? m[1] : undefined
}

function getHostFromScriptURL() {
  const u = NativeModules?.SourceCode?.scriptURL
  if (!u) return undefined
  try { return new URL(u).hostname } catch { return undefined }
}

function getExtra() {
  return (
    (Constants.expoConfig && Constants.expoConfig.extra) ||
    (Constants.manifest && Constants.manifest.extra) ||
    {}
  )
}

function normalizeOrigin(v) {
  return v ? String(v).replace(/\/+$/, '') : v
}

const EXTRA = getExtra()
const ENV_ORIGIN = normalizeOrigin(process.env.EXPO_PUBLIC_API_ORIGIN || EXTRA.apiOrigin || null)
const ENV_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? EXTRA.apiPort ?? 3000)

function getDevOrigin() {
  if (ENV_ORIGIN) return ENV_ORIGIN
  const expoHost = getHostFromExpo()
  const metroHost = getHostFromScriptURL()
  let host
  if (isPrivateIp(expoHost)) {
    host = expoHost
  } else if (isPrivateIp(metroHost)) {
    host = metroHost
  } else {
    // ip 1개 지정 후 주석 풀고 사용
    if (Platform.OS === 'android') {
      // host = '192.168.0.28' // << 학원 ip
      // host = '172.30.1.6' // << 준우님 ip
      host = '172.30.1.64' // << 메가커피 ip
    } else if (Platform.OS === 'ios') {
      // host = '192.168.0.28'
      // host = '172.30.1.6'
      host = '172.30.1.64'
    } else {
      host = 'localhost'
    }
  }
  return `http://${host}:${ENV_PORT}`
}

const PROD_ORIGIN = normalizeOrigin(EXTRA.apiProdOrigin || 'https://your-prod.example.com')

export const ORIGIN = __DEV__ ? getDevOrigin() : PROD_ORIGIN
export const API_BASE_DEBUG = ORIGIN

let CURRENT_TOKEN = null

function normalizeAuthHeader(raw) {
  if (!raw) return null
  const v = String(raw).trim()
  return /^(Bearer|Basic|Token)\s+/i.test(v) ? v : `Bearer ${v}`
}

export function setAuthToken(t) {
  CURRENT_TOKEN = normalizeAuthHeader(t)
}

export function clearAuthToken() {
  CURRENT_TOKEN = null
}

function withAuthHeaders(customHeaders = {}) {
  const auth = CURRENT_TOKEN ? { Authorization: CURRENT_TOKEN } : {}
  return { ...customHeaders, ...auth }
}

const join = (base, path) =>
  `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`

export async function apiGet(path, init) {
  const url = join(ORIGIN, path)
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(url, {
      ...(init || {}),
      method: 'GET',
      signal: ctrl.signal,
      headers: withAuthHeaders(init?.headers),
    })
    const text = await res.text()
    if (__DEV__) console.log('GET', url, '->', res.status, text)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`)
    try { return JSON.parse(text) } catch { return text }
  } finally {
    clearTimeout(to)
  }
}

export async function apiPost(path, body, init) {
  const url = join(ORIGIN, path)
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 25000)
  try {
    const baseHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' }
    const res = await fetch(url, {
      ...(init || {}),
      method: 'POST',
      headers: withAuthHeaders({ ...baseHeaders, ...(init?.headers || {}) }),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (__DEV__) console.log('POST', url, '->', res.status, text)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`)
    try { return JSON.parse(text) } catch { return text }
  } finally {
    clearTimeout(to)
  }
}

export async function apiDelete(path, body, init) {
  const url = join(ORIGIN, path)
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(url, {
      ...(init || {}),
      method: 'DELETE',
      headers: withAuthHeaders(init?.headers),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (__DEV__) console.log('DELETE', url, '->', res.status, text)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`)
    try { return JSON.parse(text) } catch { return text }
  } finally {
    clearTimeout(to)
  }
}

