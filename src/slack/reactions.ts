import { app } from './app.js';
import { db } from '../db/index.js';
import { menuPosts, reactions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

// 유저별 토스트 타이머 관리
const toastTimers = new Map<string, NodeJS.Timeout>();

/**
 * 토스트 메시지 표시 (1초 후 자동 삭제)
 */
async function showToast(channel: string, user: string, text: string) {
  const timerKey = `${channel}:${user}`;

  // 기존 타이머가 있으면 취소 (새 메시지로 교체)
  const existingTimer = toastTimers.get(timerKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  try {
    // ephemeral 메시지 전송
    const result = await app.client.chat.postEphemeral({
      channel,
      user,
      text,
    });

    // 1초 후 삭제 (ephemeral은 삭제 불가하므로 타이머만 정리)
    // Note: Slack ephemeral 메시지는 API로 삭제할 수 없음
    // 대신 유저가 채널을 새로고침하면 사라짐
    const timer = setTimeout(() => {
      toastTimers.delete(timerKey);
    }, 1000);

    toastTimers.set(timerKey, timer);
  } catch (error) {
    console.error('토스트 메시지 전송 실패:', error);
  }
}

/**
 * 리액션 이벤트 핸들러 등록
 */
export function registerReactionHandlers() {
  // 리액션 추가 이벤트
  app.event('reaction_added', async ({ event }) => {
    const { user, reaction, item } = event;

    // 메시지 리액션만 처리
    if (item.type !== 'message') return;

    // 우리가 보낸 메뉴 포스트인지 확인
    const menuPost = db
      .select()
      .from(menuPosts)
      .where(
        and(
          eq(menuPosts.channelId, item.channel),
          eq(menuPosts.messageTs, item.ts)
        )
      )
      .get();

    if (!menuPost) return;

    // 기존 리액션 확인 (유저당 1개 제한)
    const existingReaction = db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.menuPostId, menuPost.id),
          eq(reactions.userId, user)
        )
      )
      .get();

    if (existingReaction) {
      // 기존 리액션을 새 리액션으로 교체
      db.update(reactions)
        .set({ emoji: reaction, addedAt: new Date() })
        .where(eq(reactions.id, existingReaction.id))
        .run();
      console.log(`유저 ${user} 리액션 변경: ${existingReaction.emoji} -> ${reaction}`);

      // 토스트: 리액션 변경
      await showToast(
        item.channel,
        user,
        `:${existingReaction.emoji}: → :${reaction}:`
      );
    } else {
      // 새 리액션 추가
      db.insert(reactions)
        .values({
          menuPostId: menuPost.id,
          userId: user,
          emoji: reaction,
        })
        .run();
      console.log(`유저 ${user} 리액션 추가: ${reaction}`);

      // 토스트: 리액션 추가
      await showToast(item.channel, user, `:${reaction}:`);
    }
  });

  // 리액션 제거 이벤트
  app.event('reaction_removed', async ({ event }) => {
    const { user, reaction, item } = event;

    // 메시지 리액션만 처리
    if (item.type !== 'message') return;

    // 우리가 보낸 메뉴 포스트인지 확인
    const menuPost = db
      .select()
      .from(menuPosts)
      .where(
        and(
          eq(menuPosts.channelId, item.channel),
          eq(menuPosts.messageTs, item.ts)
        )
      )
      .get();

    if (!menuPost) return;

    // 해당 리액션 삭제
    const result = db
      .delete(reactions)
      .where(
        and(
          eq(reactions.menuPostId, menuPost.id),
          eq(reactions.userId, user),
          eq(reactions.emoji, reaction)
        )
      )
      .run();

    if (result.changes > 0) {
      console.log(`유저 ${user} 리액션 제거: ${reaction}`);

      // 토스트: 리액션 제거
      await showToast(item.channel, user, `~:${reaction}:~`);
    }
  });

  console.log('리액션 핸들러 등록됨');
}
