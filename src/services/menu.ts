import { db } from '../db/index.js';
import { menuPosts, menuMessages, subscriptions, type MenuPost } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { app } from '../slack/app.js';
import { createReactionButtons } from './reactions.js';
import { getKSTNow, getKSTDateStr } from '../utils/time.js';

// ===== 내부 구현 =====

/**
 * 메뉴 텍스트에서 날짜를 추출하고 DB에 저장
 */
function insertMenu(menuText: string): { success: true; date: string; menuPost: MenuPost } | { success: false; error: string } {
  const dateMatch = menuText.match(/(\d{2}월\d{2}일)/);
  if (!dateMatch) {
    return { success: false, error: '날짜를 찾을 수 없습니다. "01월26일" 형식의 날짜가 필요합니다.' };
  }

  const date = dateMatch[1];

  const existing = db
    .select()
    .from(menuPosts)
    .where(eq(menuPosts.date, date))
    .get();

  if (existing) {
    return { success: false, error: `${date} 메뉴가 이미 존재합니다. 기존 데이터를 덮어쓰려면 먼저 삭제해주세요.` };
  }

  const menuPost = db.insert(menuPosts)
    .values({ date, menuText })
    .returning()
    .get();

  console.log(`[메뉴] 저장됨: ${date}`);
  return { success: true, date, menuPost };
}

/**
 * 구독 채널 전체에 메뉴 발송
 */
async function broadcastMenu(menuPost: MenuPost): Promise<{ total: number; sent: number }> {
  const channels = db.select().from(subscriptions).all();
  let sent = 0;

  for (const channel of channels) {
    const result = await sendMenuMessage(menuPost, channel.channelId);
    if (result) sent++;
  }

  console.log(`[메뉴] 브로드캐스트: ${sent}/${channels.length}개 채널`);
  return { total: channels.length, sent };
}

// ===== 공개 API =====

/**
 * 외부에서 메뉴 수신 → 저장 + 구독 채널 브로드캐스트
 * (HTTP API에서 사용)
 */
export async function receiveMenu(menuText: string): Promise<
  { success: true; date: string; broadcast: { total: number; sent: number } } |
  { success: false; error: string }
> {
  const result = insertMenu(menuText);
  if (!result.success) return result;

  const broadcast = await broadcastMenu(result.menuPost);
  return { success: true, date: result.date, broadcast };
}

/**
 * 수동 메뉴 입력 → 저장만 (발송 없음)
 * (/lunch feed에서 사용)
 */
export function feedMenu(menuText: string): { success: true; date: string } | { success: false; error: string } {
  const result = insertMenu(menuText);
  if (!result.success) return result;
  return { success: true, date: result.date };
}

/**
 * DB에서 최신 메뉴 조회
 * (/lunch now에서 사용)
 */
export function getLatestMenuPost(): MenuPost | null {
  // 오늘 메뉴 우선
  const todayStr = getKSTDateStr();
  const todayMenu = db
    .select()
    .from(menuPosts)
    .where(eq(menuPosts.date, todayStr))
    .get();

  if (todayMenu) return todayMenu;

  // 없으면 가장 최근 것
  return db
    .select()
    .from(menuPosts)
    .orderBy(desc(menuPosts.id))
    .limit(1)
    .get() || null;
}

// ===== 메시지 포맷팅 및 발송 =====

/**
 * 메뉴 텍스트 정리 및 포맷팅
 * - 첫 줄 (날짜+제목) 제외
 * - 📍 이전까지만 (식당 정보 제외)
 * - 이모지 기준으로 bullet 리스트
 */
export function formatMenuContent(rawContent: string): string {
  // 첫 줄(날짜+제목 줄) 제거: "01월26일(월요일) ♥진한식당..." 패턴
  let menuPart = rawContent;
  const titleLinePattern = /^\d{2}월\d{2}일\([월화수목금토일]요일\)[^\n]*/;
  menuPart = menuPart.replace(titleLinePattern, '').trim();

  // 📍 이전까지만 자르기 (식당 정보 제외)
  menuPart = menuPart.split('📍')[0].trim();
  menuPart = menuPart.split(':round_pushpin:')[0].trim();

  // 이모지+텍스트 패턴으로 각 메뉴 항목 추출
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
 * 단일 채널에 메뉴 메시지 발송 및 DB 저장
 * (/lunch now에서 사용)
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
      text: message,
      blocks,
    });

    if (!result.ts) {
      console.error('메시지 발송 실패: ts 없음');
      return null;
    }

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
