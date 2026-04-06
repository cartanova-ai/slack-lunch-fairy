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
 * 현재 KST 날짜 문자열 (MM월DD일)
 */
export function getKSTDateStr(): string {
  const kst = getKSTNow();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${month}월${day}일`;
}

/**
 * 텍스트에서 날짜를 추출하고 MM월DD일 형식으로 정규화
 * "4월6일", "04월06일", "12월25일" 등 다양한 형식 지원
 */
export function extractDateFromText(text: string): string | null {
  const match = text.match(/(\d{1,2})월(\d{1,2})일/);
  if (!match) return null;
  const month = match[1].padStart(2, '0');
  const day = match[2].padStart(2, '0');
  return `${month}월${day}일`;
}

/**
 * KST 기준 YYYY-MM-DD 형식
 */
export function getKSTDateISO(): string {
  const kst = getKSTNow();
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}
