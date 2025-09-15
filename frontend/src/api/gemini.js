import * as FileSystem from "expo-file-system/legacy"
import Tesseract from "tesseract.js"
import { ORIGIN } from "../config/api"

async function toBase64Async(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: "base64" })
}

function guessMime(uri = "") {
  const u = uri.toLowerCase()
  if (u.endsWith(".png")) return "image/png"
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic"
  if (u.endsWith(".webp")) return "image/webp"
  if (u.endsWith(".bmp")) return "image/bmp"
  return "image/jpeg"
}

async function fetchWithTimeout(url, opt = {}, ms = 60000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...opt, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

async function callBackendApi(endpoint, base64, mime = "image/jpeg") {
  const body = { imageData: base64, mimeType: mime }
  const res = await fetchWithTimeout(`${ORIGIN}/api/gemini/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, 60000)
  const txt = await res.text().catch(() => "")
  if (!res.ok) throw new Error(`백엔드 API 호출 실패: ${res.status} ${txt}`)
  try {
    return JSON.parse(txt)
  } catch {
    throw new Error(`백엔드 응답 JSON 파싱 실패: ${txt?.slice(0, 200)}`)
  }
}

async function classifyImage(uri) {
  const base64 = await toBase64Async(uri)
  return callBackendApi("classify", base64, guessMime(uri))
}

async function analyzePackaged(uri) {
  const base64 = await toBase64Async(uri)
  let result = await callBackendApi("packaged", base64, guessMime(uri))
  if ((result?.output?.calories ?? 0) === 0 && (result?.panel?.net_weight_g ?? 0) === 0) {
    let ocrText = ""
    try {
      ocrText = await ocrWithTesseract(uri)
    } catch (e) {
      console.warn("OCR 실패:", e)
    }
    const res = await fetchWithTimeout(`${ORIGIN}/api/gemini/packaged`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageData: base64,
        mimeType: guessMime(uri),
        prompt: ocrText ? `텍스트 분석 결과를 활용하여 JSON을 다시 생성해줘: ${ocrText}` : undefined,
      }),
    }, 60000)
    const txt = await res.text()
    try {
      result = JSON.parse(txt)
    } catch {
      throw new Error(`packaged 재시도 응답 JSON 파싱 실패: ${txt?.slice(0, 200)}`)
    }
  }
  return result
}

async function analyzePrepared(uri) {
  const base64 = await toBase64Async(uri)
  return callBackendApi("prepared", base64, guessMime(uri))
}

export async function analyzeFoodImage(uri) {
  const classification = await classifyImage(uri)
  const ctx = classification?.context
  if (ctx === "packaged") return analyzePackaged(uri)
  return analyzePrepared(uri)
}

async function ocrWithTesseract(uri) {
  const { data: { text } } = await Tesseract.recognize(uri, "eng+kor")
  return text || ""
}
