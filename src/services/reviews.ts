import { db } from '../db/index.js';
import { reviews, type Review } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * 메뉴 포스트의 모든 리뷰 조회
 */
export function getReviewsByMenuPostId(menuPostId: number): Review[] {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.menuPostId, menuPostId))
    .all();
}

/**
 * 특정 사용자의 리뷰 조회
 */
export function getUserReview(menuPostId: number, userId: string): Review | null {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.menuPostId, menuPostId), eq(reviews.userId, userId)))
    .get() ?? null;
}

/**
 * 리뷰 저장/업데이트 (upsert)
 */
export function saveReview(menuPostId: number, userId: string, content: string): void {
  const existing = getUserReview(menuPostId, userId);

  if (existing) {
    db.update(reviews)
      .set({ content, updatedAt: new Date() })
      .where(eq(reviews.id, existing.id))
      .run();
  } else {
    db.insert(reviews)
      .values({ menuPostId, userId, content })
      .run();
  }
}

/**
 * 리뷰 삭제
 */
export function deleteReview(menuPostId: number, userId: string): void {
  db.delete(reviews)
    .where(and(eq(reviews.menuPostId, menuPostId), eq(reviews.userId, userId)))
    .run();
}
