import cron from 'node-cron';
import { db } from '../db/index.js';
import { subscriptions, menuPosts } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { fetchTodayMenu } from '../scraper/jinhansikdang.js';
import { app } from '../slack/app.js';

// 메뉴 캐시 (하루에 한 번만 스크래핑)
let cachedMenu: { date: string; content: string } | null = null;

/**
 * 스케줄러 시작
 * 매분 실행하여 해당 시간에 알림 예정인 채널에 메시지 발송
 */
export function startScheduler() {
  // 매분 실행 (평일만)
  cron.schedule('* * * * 1-5', async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 해당 시간에 알림 설정된 채널 조회
    const targetChannels = db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.notifyTime, currentTime))
      .all();

    if (targetChannels.length === 0) return;

    // 오늘 메뉴 가져오기 (캐시 활용)
    const menu = await getTodayMenu();
    if (!menu) {
      console.log('오늘 메뉴 없음 - 알림 스킵');
      return;
    }

    // 각 채널에 메뉴 발송
    for (const channel of targetChannels) {
      // 이미 오늘 보낸 메시지가 있는지 확인
      const existing = db
        .select()
        .from(menuPosts)
        .where(
          and(
            eq(menuPosts.channelId, channel.channelId),
            eq(menuPosts.date, today)
          )
        )
        .get();

      if (existing) {
        console.log(`채널 ${channel.channelId}에 이미 오늘 메뉴 발송됨`);
        continue;
      }

      try {
        // 메시지 발송
        const result = await app.client.chat.postMessage({
          channel: channel.channelId,
          text: formatMenuMessage(menu.content),
          mrkdwn: true,
        });

        // DB에 기록
        if (result.ts) {
          db.insert(menuPosts)
            .values({
              channelId: channel.channelId,
              messageTs: result.ts,
              menuText: menu.content,
              date: today,
            })
            .run();
          console.log(`채널 ${channel.channelId}에 메뉴 발송 완료`);
        }
      } catch (error) {
        console.error(`채널 ${channel.channelId} 발송 실패:`, error);
      }
    }
  });

  console.log('스케줄러 시작됨 (평일 매분 체크)');
}

/**
 * 오늘 메뉴 가져오기 (캐시 활용)
 */
async function getTodayMenu(): Promise<{ date: string; content: string } | null> {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${month}월${day}일`;

  // 캐시된 메뉴가 오늘 것이면 재사용
  if (cachedMenu && cachedMenu.date === todayStr) {
    return cachedMenu;
  }

  // 새로 가져오기
  const menu = await fetchTodayMenu();
  if (menu) {
    cachedMenu = { date: todayStr, content: menu.content };
    return cachedMenu;
  }

  return null;
}

/**
 * 메뉴 메시지 포맷팅
 */
function formatMenuMessage(content: string): string {
  return `🍽️ *오늘의 점심 메뉴* 🍽️\n\n${content}`;
}
