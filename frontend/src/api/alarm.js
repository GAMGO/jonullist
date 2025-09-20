import { apiGet, apiPost, apiPut, apiDelete } from '../config/api';

/**
 * 알림 설정 저장 (신규)
 * POST /api/alarm/settings
 */
export async function saveAlarmSettings(payload) {
  try {
    return await apiPost('/api/alarm/settings', payload);
  } catch (e) {
    console.warn('[Alarm] save failed', e?.message || e);
    throw e;
  }
}

/**
 * 알림 설정 조회
 * GET /api/alarm/settings
 */
export async function getAlarmSettings() {
  try {
    return await apiGet('/api/alarm/settings');
  } catch (e) {
    console.warn('[Alarm] get failed', e?.message || e);
    throw e;
  }
}

/**
 * 알림 설정 갱신 (기존 레코드 수정)
 * PUT /api/alarm/settings
 */
export async function updateAlarmSettings(payload) {
  try {
    return await apiPut('/api/alarm/settings', payload);
  } catch (e) {
    console.warn('[Alarm] update failed', e?.message || e);
    throw e;
  }
}

/**
 * Expo Push Token 등록
 * POST /api/alarm/tokens
 */
export async function registerPushToken({ token, platform }) {
  try {
    return await apiPost('/api/alarm/tokens', { token, platform });
  } catch (e) {
    console.warn('[Alarm] register token failed', e?.message || e);
    throw e;
  }
}

/**
 * 등록된 Push Token 목록 조회
 * GET /api/alarm/tokens
 */
export async function listPushTokens() {
  try {
    return await apiGet('/api/alarm/tokens');
  } catch (e) {
    console.warn('[Alarm] list tokens failed', e?.message || e);
    throw e;
  }
}

/**
 * Push Token 삭제
 * DELETE /api/alarm/tokens?token=...
 */
export async function deletePushToken(token) {
  try {
    return await apiDelete(`/api/alarm/tokens?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.warn('[Alarm] delete token failed', e?.message || e);
    throw e;
  }
}
