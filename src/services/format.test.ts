import { describe, it, expect } from 'vitest';
import { formatMenuContent } from './format.js';

describe('formatMenuContent', () => {
  it('두 자리 날짜 형식 첫 줄 제거', () => {
    const input = `04월06일(월요일) ♥진한식당 점심메뉴♥

🍖 안동찜닭
🍤 미트볼카츠

📍 센트로드 상가 2층`;

    const result = formatMenuContent(input);
    expect(result).toContain('안동찜닭');
    expect(result).toContain('미트볼카츠');
    expect(result).not.toContain('진한식당 점심메뉴');
    expect(result).not.toContain('센트로드');
  });

  it('한 자리 날짜 형식 첫 줄 제거', () => {
    const input = `4월6일(월요일) ♥진한식당 점심메뉴♥

🍖 안동찜닭
🍤 육즙가득 미트볼카츠
🥚 얼큰 꼬치어묵

📍 센트로드 상가 2층 엘베 앞`;

    const result = formatMenuContent(input);
    expect(result).toContain('안동찜닭');
    expect(result).toContain('미트볼카츠');
    expect(result).toContain('꼬치어묵');
    expect(result).not.toContain('진한식당');
    expect(result).not.toContain('센트로드');
  });

  it('한 자리 월 + 두 자리 일 형식 첫 줄 제거', () => {
    const input = `3월31일(화요일) ♥진한식당 점심메뉴♥

🍖 간장불고기
🍤 치킨까스

📍 센트로드 상가 2층`;

    const result = formatMenuContent(input);
    expect(result).toContain('간장불고기');
    expect(result).not.toContain('진한식당');
  });

  it('실제 4월6일 메뉴 텍스트 처리', () => {
    const input = `4월6일(월요일) ♥진한식당 점심메뉴♥

🍖 안동찜닭
🍤 육즙가득 미트볼카츠
🥚 얼큰 꼬치어묵
🍜 야채비빔국수
🍢 두부계란전
🥣 모듬햄부대찌개
🥓 참나물도토리무침
🌿 고추장멸치볶음
🐟 상추겉절이
🍞 후식 : 바나나

🍵 시원한 매실차
☕ 테이크아웃 아메리카노 (Ice/Hot)

📍 센트로드 상가 2층 엘베 앞
⛓ 주차: 지하 4층까지/ 2시간 무료등록`;

    const result = formatMenuContent(input);
    expect(result).toContain('안동찜닭');
    expect(result).toContain('야채비빔국수');
    expect(result).toContain('바나나');
    expect(result).not.toContain('4월6일');
    expect(result).not.toContain('센트로드');
    expect(result).not.toContain('주차');
  });

  it('실제 4월1일 메뉴 텍스트 처리', () => {
    const input = `4월1일(수요일) ♥진한식당 점심메뉴♥

🍖 오쭈삼불고기
🍤 블랙페퍼 비프찹스테이크
🥚 고추만두전병
🍜 메밀간장막국수
🍢 연두부+간장양념
🥣 김치콩나물국
🥓 돈나물+초고추장
🌿 김자반
🐟 상추+쌈장
🍞 후식 : 꿀떡

🍵 시원한 매실차
☕ 테이크아웃 아메리카노 (Ice/Hot)

📍 센트로드 상가 2층 엘베 앞`;

    const result = formatMenuContent(input);
    expect(result).toContain('오쭈삼불고기');
    expect(result).toContain('비프찹스테이크');
    expect(result).not.toContain('4월1일');
    expect(result).not.toContain('센트로드');
  });

  it('실제 03월31일 메뉴 텍스트 처리', () => {
    const input = `03월31일(화요일) ♥진한식당 점심메뉴♥

🍖 간장불고기
🍤 치킨까스
🥚 계란찜
🍜 해물볶음우동
🍢 마라샹궈
🥣 유부미소장국
🥓 오이냉채무침
🌿 브로컬리+초고추장
🐟 상추치커리무침
🍞 후식 : 스위트콘

🍵 시원한 매실차
☕ 테이크아웃 아메리카노 (Ice/Hot)

📍 센트로드 상가 2층 엘베 앞`;

    const result = formatMenuContent(input);
    expect(result).toContain('간장불고기');
    expect(result).toContain('치킨까스');
    expect(result).not.toContain('03월31일');
    expect(result).not.toContain('센트로드');
  });

  it('ZWJ 복합 이모지(🍄‍🟫)가 하나의 항목으로 처리됨', () => {
    const input = `7월21일(화요일) ♥진한식당 점심메뉴♥\n🍄‍🟫 햄아채볶음밥\n🍖 간장불고기`;

    const result = formatMenuContent(input);
    expect(result).toContain('🍄‍🟫 햄아채볶음밥');
    expect(result).toContain('간장불고기');
    const lines = result.split('\n');
    for (const line of lines) {
      const textPart = line.replace(/^•\s+\S+\s*/, '').trim();
      expect(textPart.length).toBeGreaterThan(0);
    }
  });

  it('※ 시간안내문이 메뉴에 포함되지 않음', () => {
    const input = `7월21일(화요일) ♥진한식당 점심메뉴♥\n🍖 간장불고기\n🍤 치킨너겟\n\n※ 11시40분이전에 오시면 대기없이\n편하게 식사하실 수 있습니다.\n📍 센트로드 상가 2층`;

    const result = formatMenuContent(input);
    expect(result).toContain('간장불고기');
    expect(result).toContain('치킨너겟');
    expect(result).not.toContain('11');
    expect(result).not.toContain('대기없이');
    expect(result).not.toContain('센트로드');
  });

  it('※가 📍보다 먼저 나올 때 ※에서 자름', () => {
    const input = `7월20일(월요일) ♥진한식당 점심메뉴♥\n\n🍖 불고기\n\n※ 안내문\n📍 위치`;

    const result = formatMenuContent(input);
    expect(result).toContain('불고기');
    expect(result).not.toContain('안내문');
    expect(result).not.toContain('위치');
  });

  it('타이틀과 메뉴 사이에 빈 줄이 없어도 정상 처리', () => {
    const input = `7월16일(목요일) ♥진한식당 점심메뉴♥\n🍄‍🟫대만식 비빔탄탄면(옥수수면)\n🍖 고추장 불고기`;

    const result = formatMenuContent(input);
    expect(result).toContain('대만식 비빔탄탄면(옥수수면)');
    expect(result).toContain('고추장 불고기');
  });
});
