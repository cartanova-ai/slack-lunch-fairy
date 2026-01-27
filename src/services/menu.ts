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
 * 메뉴 날짜와 특정 시점을 비교해서 며칠 전인지 반환 (KST 기준)
 * @param menuDateStr "01월09일" 형식의 날짜 문자열
 * @param referenceDate 비교 기준 시점 (기본값: 현재 KST 시간)
 * @param yearHint 연도 결정을 위한 힌트 (기본값: referenceDate의 연도)
 */
export function getDaysAgo(menuDateStr: string, referenceDate?: Date, yearHint?: Date): number {
  // referenceDate가 없으면 현재 KST 시간 사용
  const refDate = referenceDate ? new Date(referenceDate.getTime() + 9 * 60 * 60 * 1000) : getKSTNow();

  const match = menuDateStr.match(/(\d{2})월(\d{2})일/);
  if (!match) return 0;

  const menuMonth = parseInt(match[1], 10) - 1;
  const menuDay = parseInt(match[2], 10);

  // yearHint 또는 referenceDate 기준으로 연도 결정 (연말/연초 경계 문제 방지)
  const hintDate = yearHint || refDate;
  const year = hintDate.getUTCFullYear();
  const menuDate = Date.UTC(year, menuMonth, menuDay);
  const refDateUTC = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate());

  return Math.floor((refDateUTC - menuDate) / (1000 * 60 * 60 * 24));
}

/**
 * 메뉴 메시지 포맷팅
 * @param menuPost 메뉴 포스트 데이터
 * @param options.sentAt 메시지 발송 시점 (이 시점 기준으로 "n일 전 정보" 계산). 없으면 현재 시점 사용.
 */
export function formatMenuMessage(
  menuPost: MenuPost,
  options?: { sentAt?: Date }
): string {
  const formattedContent = formatMenuContent(menuPost.menuText);

  // 메시지 발송 시점(sentAt) 기준으로 메뉴가 며칠 전인지 계산
  // sentAt이 제공되면 그 시점 기준, 아니면 현재 시점 기준
  const daysAgo = getDaysAgo(menuPost.date, options?.sentAt, menuPost.createdAt);

  let noticeText = '';
  if (daysAgo > 0) {
    noticeText = `> _${daysAgo}일 전 정보입니다. 오늘 메뉴는 아직 올라오지 않았어요._\n\n`;
  }

  return `${noticeText}🍽️ *진한식당 ${menuPost.date} 점심 메뉴* 🍽️\n\n${formattedContent}`;
}

/**
 * 메뉴 메시지용 Block Kit 생성
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMenuBlocks(menuPost: MenuPost): any[] {
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

/**
 * 수동 메뉴 입력 처리
 * 텍스트에서 날짜를 추출하고 DB에 저장
 * @param menuText 전체 메뉴 텍스트 (날짜 포함)
 * @returns 성공 여부와 날짜 또는 에러 메시지
 */
export function insertManualMenu(menuText: string): { success: true; date: string } | { success: false; error: string } {
  // 날짜 추출: "01월26일" 형식
  const dateMatch = menuText.match(/(\d{2}월\d{2}일)/);
  if (!dateMatch) {
    return { success: false, error: '날짜를 찾을 수 없습니다. "01월26일" 형식의 날짜가 필요합니다.' };
  }

  const date = dateMatch[1];

  // 이미 해당 날짜가 DB에 있는지 확인
  const existing = db
    .select()
    .from(menuPosts)
    .where(eq(menuPosts.date, date))
    .get();

  if (existing) {
    return { success: false, error: `${date} 메뉴가 이미 존재합니다. 기존 데이터를 덮어쓰려면 먼저 삭제해주세요.` };
  }

  // DB에 저장 (스크래핑한 것처럼 menuText 저장)
  db.insert(menuPosts)
    .values({
      date,
      menuText,
    })
    .run();

  console.log(`[수동 입력] 메뉴 저장됨: ${date}`);
  return { success: true, date };
}
