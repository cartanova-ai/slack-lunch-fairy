/**
 * KST (한국 표준시) 기준 시간 유틸리티
 */

const KST_OFFSET = 9 * 60 * 60 * 1000; // UTC+9

/**
 * 현재 KST 시간 반환
 */
export function getKSTNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + KST_OFFSET);
}

/**
 * 현재 KST 시간 문자열 (HH:mm)
 */
export function getKSTTimeStr(): string {
  const kst = getKSTNow();
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * 현재 KST 날짜 문자열 (MM월DD일)
 */
export function getKSTDateStr(): string {
  const kst = getKSTNow();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${month}월${day}일`;
}

/**
 * 현재 KST 요일 반환 (0=일요일, 1=월요일, ..., 6=토요일)
 */
export function getKSTDayOfWeek(): number {
  return getKSTNow().getUTCDay();
}

/**
 * KST 기준 YYYY-MM-DD 형식
 */
export function getKSTDateISO(): string {
  const kst = getKSTNow();
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}
