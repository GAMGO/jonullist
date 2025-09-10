import { apiGet, apiPost } from "../config/api"
import * as FileSystem from "expo-file-system"
import * as SecureStore from "expo-secure-store"
import Tesseract from "tesseract.js"

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

/* ───── 백엔드 API 호출 ───── */
async function callBackendGeminiApi(base64, action) {
  try {
    // config/api.js의 apiPost 함수를 사용하여 백엔드 호출
    const response = await apiPost("/api/gemini/analyze-food", { base64Image: base64, action });
    return response;
  } catch (e) {
    if (__DEV__) console.warn("[callBackendGeminiApi] error:", e?.message || e)
    throw new Error(`백엔드 API 호출 실패: ${e.message}`);
  }
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
  const text = await callBackendGeminiApi(base64, "classify")
  const parsed = safeParse(text)
  return parsed || { dish: "알 수 없음", context: "prepared" }
}

// 1) 가공식품 분석
async function analyzePackaged(uri, hintDish) {
  const base64 = await toBase64Async(uri)
  const txt = await callBackendGeminiApi(base64, "packaged")
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
  const txt = await callBackendGeminiApi(base64, "prepared")
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
