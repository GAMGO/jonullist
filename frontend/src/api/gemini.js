import { apiGet } from "../config/api"
import * as FileSystem from "expo-file-system"
import * as SecureStore from "expo-secure-store"
import Tesseract from "tesseract.js"


const FALLBACK_GEMINI_API_KEY = "AIzaSyAvca1r-SMD32rBnQ8S7f6o28FN1YpxfqU"

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

/* ───── 프롬프트 (3종) ───── */
// 0) 분류
function classifyPrompt() {
  return `
너는 음식 사진 1장을 보고 아래 JSON으로만 응답한다.
{
  "dish": "한글 음식명",
  "context": "packaged" | "prepared"
}`.trim()
}

// 1) 가공식품 전용
function packagedPrompt() {
  return `
너는 "포장 식품 라벨 분석기"다. 사진 1장을 보고 라벨의 수치를 최대한 활용하여 아래 JSON으로만 응답한다.
규칙:
- dish는 전면 표기의 제품명을 한글로 간단히.
- 먼저 라벨 텍스트에서 칼로리를 직접 산출한다. 없을 경우 per100g 정보를 채워 둔다(후속 계산용).
- portion.grams는 net_weight_g > serving_size_g > 100 우선.
- 모든 수치는 정수 반올림.

출력(JSON만):
{
  "dish": "한글 음식명",
  "context": "packaged",
  "portion": { "unit": "봉지" | "개" | "g", "count": 정수(>=1), "grams": 정수(>0) },
  "panel": {
    "net_weight_g": 정수,
    "serving_size_g": 정수,
    "servings_per_container": 정수,
    "calories_per_serving": 정수,
    "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 }
  },
  "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 },
  "output": { "portion_grams": 정수(1~2000), "calories": 정수 }
}`.trim()
}

// 2) 조리식품 전용
function preparedPrompt() {
  return `
너는 "조리식품 1인분 g 추정 + 100g당 영양 추정기"다. 사진 1장을 보고 아래 JSON으로만 응답한다.
규칙:
- dish는 한글 간단명(예: 김치찌개, 순두부찌개, 비빔밥, 라면, 불고기덮밥 등).
- portion.grams는 용기(뚝배기/그릇/접시/일회용 용기 크기), 가득/절반, 재료 밀도를 고려하여 추정한다.
  (뚝배기: 소 350~450ml, 중 500~700ml 가정. 국/찌개 1.0g/ml, 밥/면 0.9~1.05g/ml, 죽/스프 0.9g/ml.)
- per100g.* 는 해당 음식의 일반적인 평균값을 정수로 제공한다(못 찾으면 calories만 정수 근사).
- 최종 output.calories = per100g.calories × (portion.grams / 100) (정수 반올림).
- 오직 JSON만.

출력(JSON만):
{
  "dish": "한글 음식명",
  "context": "prepared",
  "portion": { "unit": "인분", "count": 1, "grams": 정수(150~900 권장) },
  "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 },
  "output": { "portion_grams": 정수, "calories": 정수 }
}`.trim()
}

/* ───── Gemini 호출 ───── */
async function callGemini(base64, text, mime = "image/jpeg") {
  const key = await getGeminiKey()
  const body = {
    contents: [{ parts: [{ text }, { inlineData: { mimeType: mime, data: base64 } }] }],
    generationConfig: { temperature: 0.1 }
  }
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    20000
  )
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(`Gemini 실패: ${res.status} ${t}`)
  }
  const data = await res.json()
  return extractText(data)
}

/* ───── Tesseract OCR ───── */
async function ocrWithTesseract(uri) {
  try {
    const base64 = await toBase64Async(uri)
    const dataUrl = `data:${guessMime(uri)};base64,${base64}`
    const { data: { text } } = await Tesseract.recognize(
      dataUrl, "kor+eng",
      { logger: m => __DEV__ && console.log("[tesseract]", m?.status || m) }
    )
    return String(text || "")
  } catch (e) {
    if (__DEV__) console.warn("[tesseract] error:", e?.message || e)
    return ""
  }
}

/* ───── 가공식품 라벨 파싱(간단) ───── */
function parseNutritionFromText(src) {
  const text = String(src || "").replace(/\r/g, " ").replace(/\n+/g, " ").toLowerCase()
  const gi = (m, i = 1, d = 0) => (m && m[i] ? safeInt(m[i], d) : d)

  const mulA = text.match(/(\d{1,4})\s*g\s*[x×*]\s*(\d{1,3})/)
  const mulB = text.match(/(\d{1,3})\s*(?:개|봉|팩)\s*[x×*]\s*(\d{1,4})\s*g/)
  const mul = mulA ? gi(mulA,1)*gi(mulA,2) : (mulB ? gi(mulB,1)*gi(mulB,2) : 0)

  const netWeight =
    gi(text.match(/(?:총\s*내용량|내용량|순\s*중량|net\s*wt)[:\s-]*?(\d{2,5})\s*g/)) || (mul > 0 ? mul : 0)
  const servingSize =
    gi(text.match(/(?:1회\s*(?:제공량|분량)|serving\s*size)[:\s-]*?(\d{1,4})\s*g/)) ||
    gi(text.match(/(\d{1,4})\s*g[^0-9]{0,20}(?:칼로리|열량|에너지|kcal)/))
  const servingsPerContainer =
    gi(text.match(/총\s*(\d{1,3})\s*(?:회|서빙|servings)/)) ||
    (netWeight && servingSize ? Math.max(1, round(netWeight / Math.max(1, servingSize))) : 0)
  const calPerServing =
    gi(text.match(/(?:1회\s*(?:제공량|분량)|per\s*serving)[^0-9]{0,20}(\d{2,4})\s*k?\s?cal/)) ||
    gi(text.match(/(?:열량|칼로리|에너지)[^0-9]{0,20}(\d{2,4})\s*k?\s?cal/))
  const per100Cal = gi(text.match(/100\s*(?:g|그램)[^0-9]{0,20}(\d{2,4})\s*k?\s?cal/))

  return {
    panel: {
      net_weight_g: clamp(netWeight, 0, 3000),
      serving_size_g: clamp(servingSize, 0, 2000),
      servings_per_container: clamp(servingsPerContainer, 0, 60),
      calories_per_serving: clamp(calPerServing, 0, 2000),
      per100g: { calories: clamp(per100Cal, 0, 900), protein: 0, fat: 0, carbs: 0 }
    }
  }
}

/* ───── 스키마/계산 ───── */
function coerceSchema(obj) {
  const dish = String(obj?.dish || "").trim()
  const context = (obj?.context === "packaged" || obj?.context === "prepared") ? obj.context : "prepared"
  const portion = {
    unit: obj?.portion?.unit || (context === "prepared" ? "인분" : "개"),
    count: safeInt(obj?.portion?.count, 1),
    grams: clamp(safeInt(obj?.portion?.grams, 0), 1, 2000)
  }
  const panel = obj?.panel ?? {
    net_weight_g: 0,
    serving_size_g: 0,
    servings_per_container: 0,
    calories_per_serving: 0,
    per100g: { calories: 0, protein: 0, fat: 0, carbs: 0 }
  }
  const per100g = obj?.per100g || { calories: 0, protein: 0, fat: 0, carbs: 0 }
  const output = obj?.output || { portion_grams: portion.grams, calories: 0 }
  return { dish, context, portion, panel, per100g, output }
}

function computeCalories(schema) {
  const s = coerceSchema(schema)
  const grams = s.portion.grams
  let cal = 0
  if (s.context === "packaged") {
    if (s.panel?.calories_per_serving && s.panel?.serving_size_g) {
      const ratio = grams / Math.max(1, s.panel.serving_size_g)
      cal = round(s.panel.calories_per_serving * ratio)
    } else if (s.per100g?.calories) {
      cal = round(s.per100g.calories * (grams / 100))
    }
  } else {
    if (s.per100g?.calories) {
      cal = round(s.per100g.calories * (grams / 100))
    }
  }
  return { dish: s.dish || "알 수 없음", portion_grams: grams, calories: clamp(cal, 0, 2500) }
}

/* ───── 영양학 API (100g 기준) ───── */
async function searchFoodByName(name, page = 1, perPage = 10) {
  const path = `/api/food/public/search?name=${encodeURIComponent(name)}&page=${page}&perPage=${perPage}`
  return apiGet(path) // -> [{ foodNm, enerc }]
}
function pickBestMatch(name, list) {
  if (!Array.isArray(list) || list.length === 0) return null
  const q = String(name || "").replace(/\s+/g, "").toLowerCase()
  return list.find(x => String(x.foodNm || "").replace(/\s+/g, "").toLowerCase().includes(q)) || list[0]
}
async function apiCaloriesPer100g(name) {
  try {
    const list = await searchFoodByName(name, 1, 10)
    const item = pickBestMatch(name, list)
    if (item && Number.isFinite(+item.enerc)) return { name: item.foodNm || name, per100: round(+item.enerc) }
  } catch {}
  return null
}

/* ───── 조리식품 grams 범위 보정 ───── */
function clampPreparedGramsByDish(dish, grams) {
  const d = (dish || "").toLowerCase()
  // 라면/면/비빔밥/덮밥/카레: 350~600
  if (/(라면|면|우동|소바|파스타|비빔밥|덮밥|카레)/.test(d)) {
    return clamp(grams, 350, 600)
  }
  // 찌개/국/탕: 300~700
  if (/(찌개|국|탕|스프)/.test(d)) {
    return clamp(grams, 300, 700)
  }
  // 기본 권장: 150~900
  return clamp(grams, 150, 900)
}

/* ───── 단계별 파이프라인 ───── */
// 0) 분류
async function classifyImage(uri) {
  const base64 = await toBase64Async(uri)
  const text = await callGemini(base64, classifyPrompt(), guessMime(uri))
  const parsed = safeParse(text)
  return parsed || { dish: "알 수 없음", context: "prepared" }
}

// 1) 가공식품 분석
async function analyzePackaged(uri, hintDish) {
  const base64 = await toBase64Async(uri)
  const txt = await callGemini(base64, packagedPrompt(), guessMime(uri))
  const parsed = safeParse(txt)

  let panel = parsed?.panel
  let per100g = parsed?.per100g
  let portion = parsed?.portion
  let dish = parsed?.dish || hintDish || "가공식품"

  if (!panel || (!panel.calories_per_serving && !per100g?.calories)) {
    const ocrRaw = await ocrWithTesseract(uri)
    const p2 = parseNutritionFromText(ocrRaw)
    panel = panel || p2.panel
    per100g = per100g || p2.panel?.per100g
    if (!portion || !portion.grams) {
      let grams = p2.panel.net_weight_g || p2.panel.serving_size_g || 100
      if (p2.panel.serving_size_g && p2.panel.servings_per_container) {
        grams = p2.panel.serving_size_g * p2.panel.servings_per_container
      }
      portion = { unit: "봉지", count: 1, grams }
    }
  }

  const gramsFromPanel =
    portion?.grams ||
    (panel?.serving_size_g && panel?.servings_per_container
      ? panel.serving_size_g * panel.servings_per_container
      : 0) ||
    panel?.net_weight_g ||
    100

  const grams = clamp(safeInt(gramsFromPanel, 100), 1, 2000)

  const direct = computeCalories({
    dish,
    context: "packaged",
    portion: { unit: portion?.unit || "봉지", count: 1, grams },
    panel,
    per100g
  })
  if (direct.calories > 0) return { dish: direct.dish, calories: direct.calories }

  const api = await apiCaloriesPer100g(dish)
  if (api) {
    const calories = round(api.per100 * (grams / 100))
    if (calories > 0) return { dish: api.name, calories }
  }
  return { dish, calories: 0 }
}

// 2) 조리식품 분석
async function analyzePrepared(uri, hintDish) {
  const base64 = await toBase64Async(uri)
  const txt = await callGemini(base64, preparedPrompt(), guessMime(uri))
  const parsed = safeParse(txt)

  const dish = parsed?.dish || hintDish || "조리식품"
  const gramsRaw = clamp(safeInt(parsed?.portion?.grams, 300), 1, 2000)
  const grams = clampPreparedGramsByDish(dish, gramsRaw)

  const api = await apiCaloriesPer100g(dish)
  if (api) {
    const calories = round(api.per100 * (grams / 100))
    if (calories > 0) return { dish: api.name, calories }
  }

  const fromGem = computeCalories({
    dish,
    context: "prepared",
    portion: { unit: "인분", count: 1, grams },
    per100g: parsed?.per100g || { calories: 0, protein: 0, fat: 0, carbs: 0 }
  })
  return { dish: fromGem.dish, calories: fromGem.calories }
}

/* ───── 공개 API ───── */
export async function analyzeFoodImage(uri) {
  try {
    const { dish, context } = await classifyImage(uri)
    if (context === "packaged") {
      return await analyzePackaged(uri, dish)
    } else {
      const r = await analyzePrepared(uri, dish)
      if (r.calories > 0) return r
      return await analyzePackaged(uri, dish)
    }
  } catch (e) {
    if (__DEV__) console.warn("[analyzeFoodImage] error:", e?.message || e)
    return { dish: "알 수 없음", calories: 0 }
  }
}

export default { analyzeFoodImage }
