import * as FileSystem from "expo-file-system";
import Tesseract from "tesseract.js";

// 더 이상 클라이언트 코드에서 API 키를 직접 사용하지 않습니다.
// const GEMINI_API_KEY = Constants.expoConfig.extra.GEMINI_API_KEY

/* ───── 공통 유틸 ───── */
async function toBase64Async(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function guessMime(uri = "") {
  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".bmp")) return "image/bmp";
  return "image/jpeg";
}

// 백엔드 API 호출용으로 수정
async function fetchWithTimeout(url, opt = {}, ms = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opt, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function callBackendApi(endpoint, base64, mime = "image/jpeg") {
  const body = {
    imageData: base64,
    mimeType: mime,
  };
  
  // prompt 필드를 삭제하고, 엔드포인트에 따라 백엔드에서 프롬프트가 결정되도록 변경
  const res = await fetchWithTimeout(
    `http://localhost:3000/api/gemini-proxy/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    30000 // 타임아웃 30초로 연장
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`백엔드 API 호출 실패: ${res.status} ${t}`);
  }
  return await res.text();
}

/* ───── Tesseract OCR ───── */
async function ocrWithTesseract(uri) {
  try {
    const base64 = await toBase64Async(uri);
    const dataUrl = `data:${guessMime(uri)};base64,${base64}`;
    const { data: { text } } = await Tesseract.recognize(
      dataUrl, "kor+eng",
      { logger: m => __DEV__ && console.log("[tesseract]", m?.status || m) }
    );
    return String(text || "");
  } catch (e) {
    if (__DEV__) console.warn("[tesseract] error:", e?.message || e);
    return "";
  }
}

/* ───── API 호출 파이프라인 ───── */
async function classifyImage(uri) {
  const base64 = await toBase64Async(uri);
  const text = await callBackendApi("classify", base64, guessMime(uri));
  return JSON.parse(text);
}

async function analyzePackaged(uri) {
  const base64 = await toBase64Async(uri);
  const text = await callBackendApi("packaged", base64, guessMime(uri));
  const result = JSON.parse(text);

  // Gemini 응답에 필요한 값이 없을 경우, Tesseract OCR을 통한 보정 로직
  if (result.output?.calories === 0 && result.panel?.net_weight_g === 0) {
    const ocrText = await ocrWithTesseract(uri);
    const body = {
      imageData: base64,
      mimeType: guessMime(uri),
      prompt: `텍스트 분석 결과를 활용하여 JSON을 다시 생성해줘: ${ocrText}`
    };

    const res = await fetchWithTimeout(`http://localhost:3000/api/gemini-proxy/packaged`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 30000);
    const text2 = await res.text();
    return JSON.parse(text2);
  }
  return result;
}

async function analyzePrepared(uri) {
  const base64 = await toBase64Async(uri);
  const text = await callBackendApi("prepared", base64, guessMime(uri));
  return JSON.parse(text);
}

// 메인 함수
export async function analyzeFoodImage(uri) {
  try {
    const { context } = await classifyImage(uri);
    if (context === "packaged") {
      const result = await analyzePackaged(uri);
      return result.output;
    } else {
      const result = await analyzePrepared(uri);
      if (result.output?.calories > 0) {
        return result.output;
      }
      // 조리식품으로 분석 실패 시 포장 식품으로 다시 시도
      const packagedResult = await analyzePackaged(uri);
      return packagedResult.output;
    }
  } catch (e) {
    if (__DEV__) console.warn("[analyzeFoodImage] error:", e?.message || e);
    throw e;
  }
}

export default { analyzeFoodImage };
