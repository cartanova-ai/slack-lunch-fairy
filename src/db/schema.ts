import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

// 구독 정보 - 채널별 알림 시간
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().unique(),
  notifyTime: text('notify_time').notNull(), // "HH:mm" 형식
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 메뉴 포스트 - 스크래핑한 메뉴 (날짜별 유니크)
export const menuPosts = sqliteTable('menu_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(), // "01월09일" 형식, 유니크
  menuText: text('menu_text').notNull(), // 원본 메뉴 텍스트
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 메뉴 메시지 - 슬랙에 발송한 메시지 (메뉴 포스트를 참조)
export const menuMessages = sqliteTable('menu_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuPostId: integer('menu_post_id').notNull().references(() => menuPosts.id),
  channelId: text('channel_id').notNull(),
  messageTs: text('message_ts').notNull(), // Slack 메시지 타임스탬프
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 리액션 - 메뉴 포스트별 유저 리액션 (유저당 1개, 마지막 선택)
export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuPostId: integer('menu_post_id').notNull().references(() => menuPosts.id),
  userId: text('user_id').notNull(),
  sentiment: text('sentiment').notNull(), // 'positive', 'neutral', 'negative'
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 리뷰 - 메뉴 포스트별 유저 리뷰 (유저당 1개)
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuPostId: integer('menu_post_id').notNull().references(() => menuPosts.id),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  unique().on(table.menuPostId, table.userId),
]);

// 타입 추출
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type MenuPost = typeof menuPosts.$inferSelect;
export type NewMenuPost = typeof menuPosts.$inferInsert;
export type MenuMessage = typeof menuMessages.$inferSelect;
export type NewMenuMessage = typeof menuMessages.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
