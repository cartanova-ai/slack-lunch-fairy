import 'dotenv/config';
import { initDb } from './db/index.js';
import { fetchTodayMenu, fetchMenuByDate } from './scraper/jinhansikdang.js';

console.log('점심 요정 시작!');

// DB 초기화
initDb();

// 테스트: 금요일(01월09일) 메뉴 가져오기
const menu = await fetchMenuByDate('01월09일');
if (menu) {
  console.log('\n=== 메뉴 테스트 (01월09일) ===');
  console.log(`제목: ${menu.title}`);
  console.log(`날짜: ${menu.date}`);
  console.log(`메뉴:\n${menu.content}`);
} else {
  console.log('메뉴 없음');
}
