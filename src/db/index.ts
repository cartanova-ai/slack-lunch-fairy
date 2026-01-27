import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// DB 파일 경로: ~/.lunch-fairy/data/lunch-fairy.db
const dataDir = join(homedir(), '.lunch-fairy', 'data');

// 디렉토리 없으면 생성
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'lunch-fairy.db');
const sqlite = new Database(dbPath);

// WAL 모드로 성능 향상
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// 테이블 생성 (없으면)
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL UNIQUE,
      notify_time TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS menu_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      menu_text TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS menu_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_post_id INTEGER NOT NULL REFERENCES menu_posts(id),
      channel_id TEXT NOT NULL,
      message_ts TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_post_id INTEGER NOT NULL REFERENCES menu_posts(id),
      user_id TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      added_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_post_id INTEGER NOT NULL REFERENCES menu_posts(id),
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_menu_posts_date ON menu_posts(date);
    CREATE INDEX IF NOT EXISTS idx_menu_messages_ts ON menu_messages(channel_id, message_ts);
    CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(menu_post_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_user_post ON reactions(menu_post_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_post ON reviews(menu_post_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_post ON reviews(menu_post_id, user_id);
  `);

  console.log(`DB 초기화 완료: ${dbPath}`);
}
