// 진한식당 (송도) - 네이버 플레이스 피드 스크래퍼
// Place ID: 1153292681

const PLACE_ID = '1153292681'; // 진한식당 송도
const FEED_URL = `https://m.place.naver.com/restaurant/${PLACE_ID}/feed`;

export interface TodayMenu {
  title: string;   // "01월09일(금요일) ♥진한식당 점심메뉴♥"
  content: string; // 메뉴 본문
  date: string;    // "01월09일"
}

/**
 * 진한식당 오늘 메뉴 가져오기
 * 네이버 플레이스 피드 페이지에서 SSR 데이터 파싱
 */
export async function fetchTodayMenu(): Promise<TodayMenu | null> {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (!response.ok) {
      console.error(`피드 요청 실패: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parseMenu(html);
  } catch (error) {
    console.error('메뉴 가져오기 실패:', error);
    return null;
  }
}

/**
 * 특정 날짜의 메뉴 가져오기 (테스트용)
 */
export async function fetchMenuByDate(dateStr: string): Promise<TodayMenu | null> {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (!response.ok) {
      console.error(`피드 요청 실패: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parseMenuByDate(html, dateStr);
  } catch (error) {
    console.error('메뉴 가져오기 실패:', error);
    return null;
  }
}

/**
 * HTML에서 오늘 메뉴 파싱
 * SSR로 렌더된 피드 데이터에서 추출
 */
function parseMenu(html: string): TodayMenu | null {
  // 오늘 날짜 (예: "01월11일")
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${month}월${day}일`;

  return parseMenuByDate(html, todayStr);
}

/**
 * 특정 날짜의 메뉴 파싱
 */
function parseMenuByDate(html: string, dateStr: string): TodayMenu | null {
  // 제목 패턴: "01월09일(금요일) ♥진한식당 점심메뉴♥"
  const titlePattern = new RegExp(
    `${dateStr}\\([월화수목금토일]요일\\)[^<]*점심메뉴[^<]*`
  );

  const titleMatch = html.match(titlePattern);
  if (!titleMatch) {
    console.log(`${dateStr} 메뉴 없음`);
    return null;
  }

  const title = titleMatch[0];

  // 메뉴 본문 추출
  // 패턴: 제목 뒤에 오는 pui__vn15t2 클래스 내 링크 텍스트
  const contentPattern = new RegExp(
    `${escapeRegex(title)}</div><div class="pui__vn15t2"><a[^>]+>([^<]+)</a>`
  );

  const contentMatch = html.match(contentPattern);
  if (!contentMatch) {
    console.log('메뉴 본문 파싱 실패');
    return null;
  }

  // HTML 엔티티 디코딩
  const content = decodeHtmlEntities(contentMatch[1]);

  return {
    title,
    content,
    date: dateStr,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * 메뉴 텍스트 정리 및 포맷팅
 * - 첫 줄 (날짜+제목) 제외
 * - 📍 이전까지만 (식당 정보 제외)
 * - 이모지 기준으로 bullet 리스트
 */
export function formatMenuContent(rawContent: string): string {
  // 첫 줄(날짜+제목 줄) 제거: "01월26일(월요일) ♥진한식당..." 패턴
  let menuPart = rawContent;
  const titleLinePattern = /^\d{2}월\d{2}일\([월화수목금토일]요일\)[^\n]*/;
  menuPart = menuPart.replace(titleLinePattern, '').trim();

  // 📍 이전까지만 자르기 (식당 정보 제외)
  menuPart = menuPart.split('📍')[0].trim();
  // :round_pushpin: 형식도 처리
  menuPart = menuPart.split(':round_pushpin:')[0].trim();

  // 이모지+텍스트 패턴으로 각 메뉴 항목 추출
  // 이모지(1개 이상) + 공백 없이 바로 붙은 텍스트 + 다음 이모지 전까지
  const menuPattern = /([\p{Emoji}\u{FE0F}]+)\s*([^[\p{Emoji}]+)/gu;
  const matches = [...menuPart.matchAll(menuPattern)];

  const menuItems: string[] = [];
  for (const match of matches) {
    const emoji = match[1];
    const text = match[2]?.trim();
    if (emoji && text) {
      menuItems.push(`• ${emoji} ${text}`);
    }
  }

  return menuItems.join('\n');
}

/**
 * 최신 메뉴 가져오기 (날짜 무관, 최상단 메뉴)
 */
export async function fetchLatestMenu(): Promise<TodayMenu | null> {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (!response.ok) {
      console.error(`피드 요청 실패: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parseLatestMenu(html);
  } catch (error) {
    console.error('메뉴 가져오기 실패:', error);
    return null;
  }
}

/**
 * HTML에서 최신 점심 메뉴 파싱 (날짜 무관)
 */
function parseLatestMenu(html: string): TodayMenu | null {
  // 제목 패턴: "XX월XX일(X요일) ♥진한식당 점심메뉴♥" (날짜 무관)
  const titlePattern = /(\d{2}월\d{2}일)\([월화수목금토일]요일\)[^<]*점심메뉴[^<]*/;

  const titleMatch = html.match(titlePattern);
  if (!titleMatch) {
    console.log('점심 메뉴 없음');
    return null;
  }

  const title = titleMatch[0];
  const dateStr = titleMatch[1]; // "01월11일"

  // 메뉴 본문 추출
  const contentPattern = new RegExp(
    `${escapeRegex(title)}</div><div class="pui__vn15t2"><a[^>]+>([^<]+)</a>`
  );

  const contentMatch = html.match(contentPattern);
  if (!contentMatch) {
    console.log('메뉴 본문 파싱 실패');
    return null;
  }

  const content = decodeHtmlEntities(contentMatch[1]);

  return {
    title,
    content,
    date: dateStr,
  };
}
