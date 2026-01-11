import { app } from './app.js';
import { db } from '../db/index.js';
import { menuPosts, reactions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

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
    }
  });

  console.log('리액션 핸들러 등록됨');
}
