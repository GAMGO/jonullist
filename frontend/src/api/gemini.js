import * as FileSystem from "expo-file-system";
import Tesseract from "tesseract.js";
import { ORIGIN } from "../config/api";

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
  
  const res = await fetchWithTimeout(
    `${ORIGIN}/api/gemini/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    30000
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`백엔드 API 호출 실패: ${res.status} ${t}`);
  }
  // 백엔드에서 JSON 문자열을 반환하므로 .text()로 받은 뒤 다시 파싱
  const text = await res.text();
  return JSON.parse(text);
}

/* ───── API 호출 파이프라인 ───── */
async function classifyImage(uri) {
  const base64 = await toBase64Async(uri);
  // classify 엔드포인트는 이미지를 백엔드로 전송하고, 백엔드에서 프롬프트를 붙여서 Gemini 호출
  const result = await callBackendApi("classify", base64, guessMime(uri));
  console.log('LOG  ➡️ 분류 결과:', result);
  return result;
}

async function analyzePackaged(uri) {
  const base64 = await toBase64Async(uri);
  const result = await callBackendApi("packaged", base64, guessMime(uri));

  if (result.output?.calories === 0 && result.panel?.net_weight_g === 0) {
    const ocrText = await ocrWithTesseract(uri);
    const body = {
      imageData: base64,
      mimeType: guessMime(uri),
      prompt: `텍스트 분석 결과를 활용하여 JSON을 다시 생성해줘: ${ocrText}`
    };

    const res = await fetchWithTimeout(`${ORIGIN}/api/gemini/packaged`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 30000);
    const result2 = await res.text();
    return JSON.parse(result2);
  }
  return result;
}

async function analyzePrepared(uri) {
  const base64 = await toBase64Async(uri);
  const result = await callBackendApi("prepared", base64, guessMime(uri));
  return result;
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
      return null;
    }
  } catch (err) {
    console.warn("[analyzeFoodImage] error:", err.message);
    return null;
  }
}

// Tesseract OCR 함수 (필요한 경우 구현)
async function ocrWithTesseract(uri) {
  const { data: { text } } = await Tesseract.recognize(uri, 'eng+kor');
  return text;
}