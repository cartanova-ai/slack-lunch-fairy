import 'dotenv/config';
import { initDb } from './db/index.js';
import { startSlackApp, registerCommands, registerReactionHandlers, registerFeedbackHandlers, registerReviewHandlers } from './slack/index.js';
import { startApiServer } from './api/index.js';

console.log('점심 요정 시작!');

// DB 초기화
initDb();

// Slack 커맨드 등록
registerCommands();

// 리액션 핸들러 등록
registerReactionHandlers();

// 피드백 핸들러 등록
registerFeedbackHandlers();

// 리뷰 핸들러 등록
registerReviewHandlers();

// Slack 앱 시작
await startSlackApp();

// API 서버 시작
startApiServer();
