import { App } from '@slack/bolt';

// Slack Bolt 앱 초기화 (Socket Mode)
export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// 앱 시작
export async function startSlackApp() {
  await app.start();
  console.log('Slack 앱 시작됨 (Socket Mode)');
}
