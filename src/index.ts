import 'dotenv/config';
import { initDb } from './db/index.js';
import { startSlackApp, registerCommands } from './slack/index.js';
import { startScheduler } from './scheduler/index.js';

console.log('점심 요정 시작!');

// DB 초기화
initDb();

// Slack 커맨드 등록
registerCommands();

// Slack 앱 시작
await startSlackApp();

// 스케줄러 시작
startScheduler();
