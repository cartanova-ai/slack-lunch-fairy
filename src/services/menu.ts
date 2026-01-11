import { db } from '../db/index.js';
import { menuPosts, menuMessages, type MenuPost } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { fetchLatestMenu, formatMenuContent } from '../scraper/jinhansikdang.js';
import { app } from '../slack/app.js';
import { createReactionButtons } from './reactions.js';

/**
 * 메뉴 포스트 가져오기 (DB 우선, 없으면 fetch)
 * @param dateStr "01월09일" 형식. null이면 최신 메뉴 fetch
 */
export async function getOrFetchMenuPost(dateStr?: string): Promise<MenuPost | null> {
  // 특정 날짜가 지정된 경우 DB에서 먼저 확인
  if (dateStr) {
    const existing = db
      .select()
      .from(menuPosts)
      .where(eq(menuPosts.date, dateStr))
      .get();

    if (existing) {
      return existing;
    }
  }

  // DB에 없으면 fetch
  const fetched = await fetchLatestMenu();
  if (!fetched) {
    return null;
  }

  // fetch한 날짜가 DB에 이미 있는지 확인
  const existingByFetchedDate = db
    .select()
    .from(menuPosts)
    .where(eq(menuPosts.date, fetched.date))
    .get();

  if (existingByFetchedDate) {
    return existingByFetchedDate;
  }

  // 새로운 메뉴 포스트 저장
  const result = db
    .insert(menuPosts)
    .values({
      date: fetched.date,
      menuText: fetched.content,
    })
    .returning()
    .get();

  console.log(`메뉴 포스트 저장됨: ${fetched.date}`);
  return result;
}

/**
 * 오늘 날짜 문자열 생성
 */
export function getTodayDateStr(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${month}월${day}일`;
}

/**
 * 메뉴 날짜와 오늘 날짜를 비교해서 상대 표현 반환
 */
export function getRelativeDateLabel(menuDateStr: string): string {
  const now = new Date();
  const currentYear = now.getFullYear();

  const match = menuDateStr.match(/(\d{2})월(\d{2})일/);
  if (!match) return '';

  const menuMonth = parseInt(match[1], 10) - 1;
  const menuDay = parseInt(match[2], 10);

  const menuDate = new Date(currentYear, menuMonth, menuDay);
  const today = new Date(currentYear, now.getMonth(), now.getDate());

  const diffDays = Math.floor((today.getTime() - menuDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '';
  if (diffDays === 1) return ' (어제)';
  if (diffDays === 2) return ' (그제)';
  if (diffDays === 3) return ' (엊그제)';
  if (diffDays > 3) return ` (${diffDays}일 전)`;

  return '';
}

/**
 * 메뉴 메시지 포맷팅
 */
export function formatMenuMessage(menuPost: MenuPost): string {
  const formattedContent = formatMenuContent(menuPost.menuText);
  const relativeLabel = getRelativeDateLabel(menuPost.date);
  return `🍽️ *${menuPost.date} 점심 메뉴${relativeLabel}* 🍽️\n\n${formattedContent}`;
}

/**
 * 메뉴 메시지용 Block Kit 생성
 */
export function createMenuBlocks(menuPost: MenuPost): object[] {
  const message = formatMenuMessage(menuPost);
  const buttons = createReactionButtons(menuPost.id);

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
    ...buttons,
  ];
}

/**
 * 메뉴 메시지 발송 및 DB 저장
 */
export async function sendMenuMessage(
  menuPost: MenuPost,
  channelId: string
): Promise<{ messageTs: string; menuMessageId: number } | null> {
  try {
    const message = formatMenuMessage(menuPost);
    const blocks = createMenuBlocks(menuPost);

    const result = await app.client.chat.postMessage({
      channel: channelId,
      text: message, // fallback
      blocks,
    });

    if (!result.ts) {
      console.error('메시지 발송 실패: ts 없음');
      return null;
    }

    // 메뉴 메시지 DB 저장
    const menuMessage = db
      .insert(menuMessages)
      .values({
        menuPostId: menuPost.id,
        channelId,
        messageTs: result.ts,
      })
      .returning()
      .get();

    console.log(`메뉴 메시지 발송됨: 채널=${channelId}, ts=${result.ts}`);
    return { messageTs: result.ts, menuMessageId: menuMessage.id };
  } catch (error) {
    console.error('메뉴 메시지 발송 실패:', error);
    return null;
  }
}
