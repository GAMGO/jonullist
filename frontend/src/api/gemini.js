import { apiGet } from "../config/api"
import * as FileSystem from "expo-file-system"
import * as SecureStore from "expo-secure-store"

const FALLBACK_GEMINI_API_KEY = "AIzaSyAvca1r-SMD32rBnQ8S7f6o28FN1YpxfqU"
import { API_BASE_DEBUG } from "../config/api"

/* ───── 공통 유틸 ───── */
async function toBase64Async(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
}
const round = n => Math.round(Number(n) || 0)
const safeInt = (v, def = 0) => (Number.isFinite(+v) ? round(+v) : def)
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))

function extractText(data) {
  const p = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(p)) return ""
  return p.map(x => x?.text).filter(Boolean).join("\n")
}
function stripToJson(text) {
  if (!text) return ""
  let t = String(text).replace(/```json|```/g, "").trim()
  const s = t.indexOf("{"), e = t.lastIndexOf("}")
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1)
  return t
}
function safeParse(text) {
  try { return JSON.parse(stripToJson(text)) } catch { return null }
}

function guessMime(uri = "") {
  const u = uri.toLowerCase()
  if (u.endsWith(".png")) return "image/png"
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic"
  if (u.endsWith(".webp")) return "image/webp"
  if (u.endsWith(".bmp")) return "image/bmp"
  return "image/jpeg"
}

async function fetchWithTimeout(url, opt = {}, ms = 15000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...opt, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

async function getGeminiKey() {
  try {
    const k = await SecureStore.getItemAsync("GEMINI_API_KEY")
    if (k) return k
  } catch {}
  return FALLBACK_GEMINI_API_KEY
}

// ───── 프롬프트 (3종)은 백엔드로 이주하였습니다.(/src/main/entity/GeminiPrompts.java) ───── 

/* ───── 공개 API ───── */
// 기존 analyzeFoodImage 함수를 아래 코드로 교체합니다.
export async function analyzeFoodImage(uri) {
  try {
    const base64Image = await toBase64Async(uri);
    
    // 백엔드의 MCP 엔드포인트로 요청을 보냅니다.
    const url = `${API_BASE_DEBUG}/api/gemini/analyze-food-mcp`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // 백엔드가 요구하는 JSON 형식에 맞춰 데이터를 전송합니다.
      body: JSON.stringify({ base64Image, action: "prepared" }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`백엔드 API 호출 실패: ${response.status} - ${errorText}`);
    }

    const resultJson = await response.json();
    
    // 백엔드에서 이미 통합된 결과를 반환하므로, 그대로 사용합니다.
    return resultJson; 
  } catch (e) {
    if (__DEV__) console.warn("[analyzeFoodImage] error:", e?.message || e);
    // 오류 발생 시 기본값 반환
    return { dish: "알 수 없음", calories: 0 };
  }
}

export default { analyzeFoodImage };