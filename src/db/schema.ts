import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 구독 정보 - 채널별 알림 시간
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull().unique(),
  notifyTime: text('notify_time').notNull(), // "HH:mm" 형식
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 메뉴 게시물 - 채널에 올린 메뉴 메시지
export const menuPosts = sqliteTable('menu_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id').notNull(),
  messageTs: text('message_ts').notNull(), // Slack 메시지 타임스탬프
  menuText: text('menu_text').notNull(),
  date: text('date').notNull(), // "YYYY-MM-DD" 형식
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 리액션 - 유저별 리액션 (유저당 1개)
export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuPostId: integer('menu_post_id').notNull().references(() => menuPosts.id),
  userId: text('user_id').notNull(),
  emoji: text('emoji').notNull(),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 타입 추출
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type MenuPost = typeof menuPosts.$inferSelect;
export type NewMenuPost = typeof menuPosts.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
