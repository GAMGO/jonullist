import { apiPost } from "../config/api";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
// tesseract.js는 이제 사용하지 않으므로 import를 제거합니다.

/* ───── 공통 유틸 ───── */
async function toBase64Async(uri) {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
const round = (n) => Math.round(Number(n) || 0);
const safeInt = (v, def = 0) => (Number.isFinite(+v) ? round(+v) : def);
const clamp = (n, min, max) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));

function extractText(data) {
  const p = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(p)) return "";
  return p
    .map((x) => x?.text)
    .filter(Boolean)
    .join("\n");
}
function stripToJson(text) {
  if (!text) return "";
  let t = String(text)
    .replace(/```json|```/g, "")
    .trim();
  const s = t.indexOf("{"),
    e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1);
  return t;
}
function safeParse(text) {
  try {
    return JSON.parse(stripToJson(text));
  } catch {
    return null;
  }
}

function guessMime(uri = "") {
  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".bmp")) return "image/bmp";
  return "image/jpeg";
}

/* ───── 백엔드 API 호출 ───── */
/**
 * ✅ 수정됨: 새로운 MCP 백엔드 엔드포인트를 호출합니다.
 * @param {string} base64 - Base64 인코딩된 이미지 데이터
 * @returns {Promise<object>} - 백엔드에서 통합된 최종 결과
 */
async function callBackendMcpApi(base64) {
  try {
    const response = await apiPost("/api/gemini/analyze-food-mcp", {
      base64Image: base64,
    });
    return response;
  } catch (e) {
    if (__DEV__) console.warn("[callBackendMcpApi] error:", e?.message || e);
    throw new Error(`MCP 백엔드 호출 실패: ${e.message}`);
  }
}

/* ───── 공개 API ───── */
/**
 * ✅ 수정됨: 이미지 분석의 전체 로직을 백엔드에 위임합니다.
 * @param {string} uri - 이미지의 URI
 * @returns {Promise<object>} - 음식명, 칼로리 등 최종 분석 결과
 */
export async function analyzeFoodImage(uri) {
  try {
    const base64 = await toBase64Async(uri);
    // 백엔드의 MCP 엔드포인트에 요청을 보내고 결과를 기다립니다.
    const result = await callBackendMcpApi(base64);

    // 백엔드에서 통합된 최종 결과 반환
    return result;
  } catch (e) {
    if (__DEV__) console.warn("[analyzeFoodImage] error:", e?.message || e);
    return { dish: "알 수 없음", calories: 0 };
  }
}

export default { analyzeFoodImage };
