import { describe, it, expect } from 'vitest';
import { extractDateFromText } from './time.js';

describe('extractDateFromText', () => {
  it('두 자리 월/일 (기존 형식)', () => {
    expect(extractDateFromText('04월06일(월요일) ♥진한식당 점심메뉴♥')).toBe('04월06일');
    expect(extractDateFromText('01월26일(일요일) ♥진한식당 점심메뉴♥')).toBe('01월26일');
    expect(extractDateFromText('12월25일(수요일) ♥진한식당 점심메뉴♥')).toBe('12월25일');
  });

  it('한 자리 월/일 (새로운 형식)', () => {
    expect(extractDateFromText('4월6일(월요일) ♥진한식당 점심메뉴♥')).toBe('04월06일');
    expect(extractDateFromText('4월1일(수요일) ♥진한식당 점심메뉴♥')).toBe('04월01일');
    expect(extractDateFromText('3월5일(화요일) ♥진한식당 점심메뉴♥')).toBe('03월05일');
  });

  it('한 자리 월 + 두 자리 일', () => {
    expect(extractDateFromText('3월31일(화요일) ♥진한식당 점심메뉴♥')).toBe('03월31일');
    expect(extractDateFromText('1월15일(수요일) ♥진한식당 점심메뉴♥')).toBe('01월15일');
  });

  it('두 자리 월 + 한 자리 일', () => {
    expect(extractDateFromText('10월1일(화요일) ♥진한식당 점심메뉴♥')).toBe('10월01일');
    expect(extractDateFromText('12월5일(목요일) ♥진한식당 점심메뉴♥')).toBe('12월05일');
  });

  it('03월31일 같은 0 패딩된 월 + 두 자리 일', () => {
    expect(extractDateFromText('03월31일(화요일) ♥진한식당 점심메뉴♥')).toBe('03월31일');
  });

  it('날짜가 없는 텍스트', () => {
    expect(extractDateFromText('♥진한식당 점심메뉴♥')).toBeNull();
    expect(extractDateFromText('오늘 메뉴입니다')).toBeNull();
    expect(extractDateFromText('')).toBeNull();
  });

  it('실제 메뉴 텍스트 전체에서 추출', () => {
    const menu1 = `4월6일(월요일) ♥진한식당 점심메뉴♥

🍖 안동찜닭
🍤 육즙가득 미트볼카츠
📍 센트로드 상가 2층 엘베 앞`;

    const menu2 = `03월31일(화요일) ♥진한식당 점심메뉴♥

🍖 간장불고기
🍤 치킨까스
📍 센트로드 상가 2층 엘베 앞`;

    expect(extractDateFromText(menu1)).toBe('04월06일');
    expect(extractDateFromText(menu2)).toBe('03월31일');
  });
});
