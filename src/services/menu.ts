import { db } from '../db/index.js';
import { menuPosts, menuMessages, type MenuPost } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { fetchLatestMenu, formatMenuContent } from '../scraper/jinhansikdang.js';
import { app } from '../slack/app.js';
import { createReactionButtons } from './reactions.js';
import { getKSTNow, getKSTDateStr } from '../utils/time.js';

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
 * 오늘 날짜 문자열 생성 (KST 기준)
 */
export function getTodayDateStr(): string {
  return getKSTDateStr();
}

/**
 * 메뉴 날짜와 오늘 날짜를 비교해서 며칠 전인지 반환 (KST 기준)
 * @param menuDateStr "01월09일" 형식의 날짜 문자열
 * @param createdAt 메뉴 포스트가 생성된 시점 (연도 결정에 사용)
 */
export function getDaysAgo(menuDateStr: string, createdAt: Date): number {
  const kstNow = getKSTNow();

  const match = menuDateStr.match(/(\d{2})월(\d{2})일/);
  if (!match) return 0;

  const menuMonth = parseInt(match[1], 10) - 1;
  const menuDay = parseInt(match[2], 10);

  // createdAt 기준으로 연도 결정 (연말/연초 경계 문제 방지)
  const createdYear = createdAt.getUTCFullYear();
  const menuDate = Date.UTC(createdYear, menuMonth, menuDay);
  const today = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate());

  return Math.floor((today - menuDate) / (1000 * 60 * 60 * 24));
}

/**
 * 메뉴 메시지 포맷팅
 * @param menuPost 메뉴 포스트 데이터
 * @param options.skipDaysAgoNotice true이면 "n일 전 정보입니다" 문구 생략 (리액션 업데이트 시 사용)
 */
export function formatMenuMessage(
  menuPost: MenuPost,
  options?: { skipDaysAgoNotice?: boolean }
): string {
  const formattedContent = formatMenuContent(menuPost.menuText);

  let noticeText = '';
  if (!options?.skipDaysAgoNotice) {
    const daysAgo = getDaysAgo(menuPost.date, menuPost.createdAt);
    if (daysAgo > 0) {
      noticeText = `> _${daysAgo}일 전 정보입니다. 오늘 메뉴는 아직 올라오지 않았어요._\n\n`;
    }
  }

  return `${noticeText}🍽️ *진한식당 ${menuPost.date} 점심 메뉴* 🍽️\n\n${formattedContent}`;
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
