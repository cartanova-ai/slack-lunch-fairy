import type { MenuPost } from '../db/schema.js';
import { getKSTNow } from '../utils/time.js';

/**
 * 메뉴 텍스트 정리 및 포맷팅
 * - 첫 줄 (날짜+제목) 제외
 * - 📍 이전까지만 (식당 정보 제외)
 * - 이모지 기준으로 bullet 리스트
 */
export function formatMenuContent(rawContent: string): string {
  let menuPart = rawContent;
  const titleLinePattern = /^\d{2}월\d{2}일\([월화수목금토일]요일\)[^\n]*/;
  menuPart = menuPart.replace(titleLinePattern, '').trim();

  menuPart = menuPart.split('📍')[0].trim();
  menuPart = menuPart.split(':round_pushpin:')[0].trim();

  const menuPattern = /([\p{Emoji}\u{FE0F}]+)\s*([^[\p{Emoji}]+)/gu;
  const matches = [...menuPart.matchAll(menuPattern)];

  const menuItems: string[] = [];
  for (const match of matches) {
    const emoji = match[1];
    const text = match[2]?.trim();
    if (emoji && text) {
      menuItems.push(`• ${emoji} ${text}`);
    }
  }

  return menuItems.join('\n');
}

/**
 * 메뉴 날짜와 특정 시점을 비교해서 며칠 전인지 반환 (KST 기준)
 */
function getDaysAgo(menuDateStr: string, referenceDate?: Date, yearHint?: Date): number {
  const refDate = referenceDate ? new Date(referenceDate.getTime() + 9 * 60 * 60 * 1000) : getKSTNow();

  const match = menuDateStr.match(/(\d{2})월(\d{2})일/);
  if (!match) return 0;

  const menuMonth = parseInt(match[1], 10) - 1;
  const menuDay = parseInt(match[2], 10);

  const hintDate = yearHint || refDate;
  const year = hintDate.getUTCFullYear();
  const menuDate = Date.UTC(year, menuMonth, menuDay);
  const refDateUTC = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate());

  return Math.floor((refDateUTC - menuDate) / (1000 * 60 * 60 * 24));
}

/**
 * 메뉴 메시지 포맷팅
 */
export function formatMenuMessage(
  menuPost: MenuPost,
  options?: { sentAt?: Date }
): string {
  const formattedContent = formatMenuContent(menuPost.menuText);

  const daysAgo = getDaysAgo(menuPost.date, options?.sentAt, menuPost.createdAt);

  let noticeText = '';
  if (daysAgo > 0) {
    noticeText = `> _${daysAgo}일 전 정보입니다. 오늘 메뉴는 아직 올라오지 않았어요._\n\n`;
  }

  return `${noticeText}🍽️ *진한식당 ${menuPost.date} 점심 메뉴* 🍽️\n\n${formattedContent}`;
}
