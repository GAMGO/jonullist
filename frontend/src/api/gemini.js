import { apiGet } from "../config/api"

// <<<<<<<<< Temporary merge branch 1
const GEMINI_API_KEY = "AIzaSyCCzNKTnjCLy6ifIHrKUIZrdRlu-ee3cCA"


/* ───────────────────── 공통 유틸 ───────────────────── */

function toBase64Async(uri) {
  return new Promise((resolve, reject) => {
    fetch(uri)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      .catch(reject)
  })
}

function extractText(data) {
  const p = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(p)) return ""
  return p.map(x => x?.text).filter(Boolean).join("\n")
}
function stripToJson(text) {
  if (!text) return ""
  let t = String(text).replace(/```json|```/g, "").trim()
  const s = t.indexOf("{")
  const e = t.lastIndexOf("}")
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1)
  return t
}
function safeParse(text) {
  try {
    return JSON.parse(stripToJson(text))
  } catch {
    try {
      const only = String(text).split("\n").filter(l => /["{}\[\]:]/.test(l)).join("\n")
      return JSON.parse(only)
    } catch {
      return null
    }
  }
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
const round = (n) => Math.round(Number(n) || 0)
const safeInt = (v, def = 0) => (Number.isFinite(+v) ? round(+v) : def)

/* ───────────────────── 프롬프트 ───────────────────── */

function visionPrompt() {
  return `
너는 영양 추정기다. 음식 사진 1장을 보고 JSON으로만 응답해.

목표:
- 사진 속 "실제 섭취 1회 분량"의 칼로리를 정확한 정수로 산출한다.
- 포장 식품(라벨/영양성분표)이 보이면, 라벨 숫자를 최우선으로 사용한다.
- 일반 음식(그릇/뚝배기/접시 등)은 사진에서 보이는 "1개/1그릇/1뚝배기"를 1회로 본다.

출력 형식(JSON만, 설명/단위/마크다운 금지):
{
  "dish": "한글 음식명",
  "context": "packaged" | "prepared",
  "portion": {
    "unit": "g" | "개" | "봉지" | "그릇" | "뚝배기",
    "count": 정수(>=1),
    "grams": 정수(>0)
  },
  "panel": {                       // 라벨이 보일 때만 채운다(없으면 생략)
    "net_weight_g": 정수,          // 총내용량(예: 39)
    "serving_size_g": 정수,        // 1회 제공량 g(예: 39)
    "servings_per_container": 정수,// 총 제공량 수(예: 1)
    "calories_per_serving": 정수,  // 1회 제공량당 kcal(예: 195)
    "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 }
  },
  "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 }, // 라벨 없으면 상식 기반 추정
  "output": {
    "portion_grams": 정수(1~2000), // 실제 사진에서 먹는 양
    "calories": 정수               // 실제 사진에서 먹는 양 기준 최종 칼로리
  }
}

규칙:
1) dish는 반드시 한글 표기만 사용(외래어도 한글, 예: 파스타, 피자, 타코).
2) 라벨 보이면 우선순위:
   - calories_per_serving, serving_size_g가 보이면,
     실제 섭취 그램(= portion.grams)을 serving_size_g로 나눈 뒤 반올림해 섭취 서빙 수를 구하고
     calories = calories_per_serving × 섭취 서빙 수.
   - per100g와 net_weight_g만 보이면
     calories = per100g.calories × (portion.grams / 100).
   - 모든 값은 반올림하여 정수.
3) 일반 음식(prepared):
   - portion.unit은 그릇/뚝배기/개 등 현실 단위를 사용.
   - count는 사진 기준 정수로 확정. grams는 1~2000g 내 합리적 정수로 확정.
   - per100g는 상식적 범위의 정수(칼로리 0~900, 단백질/지방/탄수 0~150).
   - output.calories = per100g.calories × (portion.grams / 100) 반올림 정수.
4) 어떤 경우에도 설명/코멘트/마크다운 금지, JSON만 출력.
5) 모든 숫자는 정수. 소수점, 단위 문자 금지.
6) 값이 애매하더라도 비워두지 말고 가장 그럴듯한 정수로 확정한다.

예시(포장 식품, 빼빼로 39g):
{
  "dish": "빼빼로",
  "context": "packaged",
  "portion": { "unit": "봉지", "count": 1, "grams": 39 },
  "panel": {
    "net_weight_g": 39,
    "serving_size_g": 39,
    "servings_per_container": 1,
    "calories_per_serving": 195,
    "per100g": { "calories": 500, "protein": 6, "fat": 25, "carbs": 65 }
  },
  "per100g": { "calories": 500, "protein": 6, "fat": 25, "carbs": 65 },
  "output": { "portion_grams": 39, "calories": 195 }
}

예시(일반 음식, 순두부찌개 한 뚝배기):
{
  "dish": "순두부찌개",
  "context": "prepared",
  "portion": { "unit": "뚝배기", "count": 1, "grams": 500 },
  "per100g": { "calories": 90, "protein": 7, "fat": 5, "carbs": 4 },
  "output": { "portion_grams": 500, "calories": 450 }
}
`.trim()
}

/* ───────────────────── Gemini 호출 ───────────────────── */

async function callGemini(base64, text) {
  const body = {
    contents: [{ parts: [{ text }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] }],
    generationConfig: { temperature: 0.1 }
  }
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(`Gemini 호출 실패: ${res.status} ${t}`)
  }
  const data = await res.json()
  return extractText(data)
}

/* ───────────────────── 스키마 보정 & 검증 ───────────────────── */

function coerceSchema(obj) {
  const dish = String(obj?.dish || "").trim()
  const context = (obj?.context === "packaged" || obj?.context === "prepared") ? obj.context : "prepared"

  const portion = {
    unit: String(obj?.portion?.unit || "").trim() || "개",
    count: safeInt(obj?.portion?.count, 1),
    grams: clamp(safeInt(obj?.portion?.grams, 0), 1, 2000),
  }

  const panel = obj?.panel ? {
    net_weight_g: safeInt(obj.panel.net_weight_g, 0),
    serving_size_g: safeInt(obj.panel.serving_size_g, 0),
    servings_per_container: safeInt(obj.panel.servings_per_container, 0),
    calories_per_serving: safeInt(obj.panel.calories_per_serving, 0),
    per100g: {
      calories: safeInt(obj.panel?.per100g?.calories, 0),
      protein: safeInt(obj.panel?.per100g?.protein, 0),
      fat: safeInt(obj.panel?.per100g?.fat, 0),
      carbs: safeInt(obj.panel?.per100g?.carbs, 0),
    }
  } : null

  const per100g = {
    calories: clamp(safeInt(obj?.per100g?.calories, panel?.per100g?.calories || 0), 0, 900),
    protein: clamp(safeInt(obj?.per100g?.protein, panel?.per100g?.protein || 0), 0, 150),
    fat: clamp(safeInt(obj?.per100g?.fat, panel?.per100g?.fat || 0), 0, 150),
    carbs: clamp(safeInt(obj?.per100g?.carbs, panel?.per100g?.carbs || 0), 0, 150),
  }

  const output = {
    portion_grams: clamp(safeInt(obj?.output?.portion_grams, portion.grams), 1, 2000),
    calories: clamp(safeInt(obj?.output?.calories, 0), 0, 2500),
  }

  return { dish, context, portion, panel, per100g, output }
}

function hasLabelNumbers(s) {
  const p = s.panel
  if (!p) return false
  const A = p.calories_per_serving > 0 && p.serving_size_g > 0
  const B = p.per100g?.calories > 0 && (p.net_weight_g > 0 || s.portion?.grams > 0)
  return A || B
}

/* ───────────────────── 최종 칼로리 재계산 ───────────────────── */

function computeCalories(schema) {
  const s = coerceSchema(schema)

  // 우선 실제 섭취 그램 확정
  const portionGrams = clamp(s.portion?.grams || s.output?.portion_grams || 0, 1, 2000)

  let calories = 0

  // 1) 라벨 우선
  if (s.context === "packaged" && hasLabelNumbers(s)) {
    const p = s.panel
    if (p.calories_per_serving > 0 && p.serving_size_g > 0) {
      // 섭취 서빙 수 = 섭취그램 / 1회 제공량 g
      const servings = Math.max(1, round(portionGrams / p.serving_size_g))
      calories = round(p.calories_per_serving * servings)
    } else if (p.per100g?.calories > 0) {
      // per100g만 있을 때
      calories = round(p.per100g.calories * (portionGrams / 100))
    }
  }

  // 2) 일반 음식 or 라벨 불충분 → per100g로 계산
  if (calories <= 0) {
    const c100 = s.per100g?.calories || 0
    calories = round(c100 * (portionGrams / 100))
  }

  calories = clamp(calories, 0, 2500)

  return {
    dish: s.dish || "알 수 없음",
    portion_grams: portionGrams,
    calories
  }
}

/* ───────────────────── 분석 파이프라인 ───────────────────── */

async function analyzeWithVision(uri) {
  const base64 = await toBase64Async(uri)
  const text = await callGemini(base64, visionPrompt())
  const parsed = safeParse(text)
  if (!parsed) return { dish: "알 수 없음", calories: 0 }
  return computeCalories(parsed)
}

/* ───────────────────── (옵션) 백엔드 검색 보조 ─────────────────────
   - 라벨이 불명확하거나 per100g 추정이 불안정한 경우,
     네가 이미 가진 공개 검색 API로 보정하고 싶을 때 사용.
   - 기본 흐름은 Vision만으로 충분하니 필요 없으면 제거해도 됨.
──────────────────────────────────────────────────────── */

async function searchFoodByName(name, page = 1, perPage = 10) {
  const path = `/api/food/public/search?name=${encodeURIComponent(name)}&page=${page}&perPage=${perPage}`
  return apiGet(path) // -> [{ foodNm, enerc }]
}
function pickBestMatch(name, list) {
  if (!Array.isArray(list) || list.length === 0) return null
  const q = String(name || "").replace(/\s+/g, "").toLowerCase()
  const m = list.find(x => String(x.foodNm || "").replace(/\s+/g, "").toLowerCase().includes(q))
  return m || list[0]
}

/* ───────────────────── 공개 API ─────────────────────
   이미지에서 "칼로리만" 계산해서 { dish, calories } 반환.
   1) Vision(JSON) → 라벨 우선 계산
   2) (선택) Vision dish 기반 백엔드 검색으로 보정 시도
   3) 실패 시 0
──────────────────────────────────────────────────── */

export async function analyzeFoodImage(uri) {
  try {
    // 1차: Vision에서 dish/portion/라벨/100g를 모두 받아 계산
    const v = await analyzeWithVision(uri)
    if (v?.dish && v?.calories > 0) return { dish: v.dish, calories: v.calories }

    // 2차: (선택) 백엔드 검색으로 보정
    if (v?.dish) {
      try {
        const candidates = await searchFoodByName(v.dish, 1, 10)
        const item = pickBestMatch(v.dish, candidates)
        if (item && Number.isFinite(+item.enerc)) {
          // 백엔드 kcal가 1회 제공 kcal로 수록되어 있다면 그대로 사용
          return { dish: item.foodNm || v.dish, calories: round(+item.enerc) }
        }
      } catch (_) {}
    }

    return { dish: v?.dish || "알 수 없음", calories: 0 }
  } catch (e) {
    if (__DEV__) console.warn("[analyzeFoodImage] error:", e?.message || e)
    return { dish: "알 수 없음", calories: 0 }
  }
}
