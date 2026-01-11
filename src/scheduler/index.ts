import cron from 'node-cron';
import { db } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getOrFetchMenuPost, getTodayDateStr, sendMenuMessage } from '../services/menu.js';

/**
 * 스케줄러 시작
 * 매분 실행하여 해당 시간에 알림 예정인 채널에 메시지 발송
 */
export function startScheduler() {
  // 매분 실행 (평일만)
  cron.schedule('* * * * 1-5', async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 해당 시간에 알림 설정된 채널 조회
    const targetChannels = db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.notifyTime, currentTime))
      .all();

    if (targetChannels.length === 0) return;

    // 오늘 메뉴 가져오기 (DB 또는 fetch)
    const todayStr = getTodayDateStr();
    const menuPost = await getOrFetchMenuPost(todayStr);

    if (!menuPost) {
      console.log('오늘 메뉴 없음 - 알림 스킵');
      return;
    }

    // 각 채널에 메뉴 발송
    for (const channel of targetChannels) {
      await sendMenuMessage(menuPost, channel.channelId);
    }
  });

  console.log('스케줄러 시작됨 (평일 매분 체크)');
}
