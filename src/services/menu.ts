import { db } from '../db/index.js';
import { menuPosts, menuMessages, subscriptions, type MenuPost } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { app } from '../slack/app.js';
import { createReactionButtons } from './reactions.js';
import { formatMenuMessage } from './format.js';
import { getKSTDateStr } from '../utils/time.js';

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

/**
 * 메뉴 메시지용 Block Kit 생성
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMenuBlocks(message: string, menuPostId: number): any[] {
  const buttons = createReactionButtons(menuPostId);

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
  const todayStr = getKSTDateStr();
  const todayMenu = db
    .select()
    .from(menuPosts)
    .where(eq(menuPosts.date, todayStr))
    .get();

  if (todayMenu) return todayMenu;

  return db
    .select()
    .from(menuPosts)
    .orderBy(desc(menuPosts.id))
    .limit(1)
    .get() || null;
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
    const blocks = createMenuBlocks(message, menuPost.id);

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
