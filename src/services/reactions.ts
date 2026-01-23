import { db } from '../db/index.js';
import { reactions, menuMessages, menuPosts } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { app } from '../slack/app.js';
import { formatMenuMessage } from './menu.js';

// 리액션 감정 종류
export const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;
export type Sentiment = typeof SENTIMENTS[number];

// 감정 → 이모지 매핑
export const SENTIMENT_EMOJI: Record<Sentiment, string> = {
  positive: '😊',
  neutral: '🧐',
  negative: '☹️',
};

// 감정 → 레이블 매핑
export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: '좋아요',
  neutral: '그냥 그래요',
  negative: '별로예요',
};

/**
 * 메뉴 포스트의 리액션을 감정별로 그룹핑하여 사용자 ID 목록 반환
 */
export function getReactionsBysentiment(menuPostId: number): Record<Sentiment, string[]> {
  const result: Record<Sentiment, string[]> = {
    positive: [],
    neutral: [],
    negative: [],
  };

  const rows = db
    .select({
      userId: reactions.userId,
      sentiment: reactions.sentiment,
    })
    .from(reactions)
    .where(eq(reactions.menuPostId, menuPostId))
    .all();

  for (const row of rows) {
    if (row.sentiment in result) {
      result[row.sentiment as Sentiment].push(row.userId);
    }
  }

  return result;
}

/**
 * 메뉴 포스트의 리액션 카운트 조회
 */
export function getReactionCounts(menuPostId: number): Record<Sentiment, number> {
  const counts: Record<Sentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  const result = db
    .select({
      sentiment: reactions.sentiment,
      count: sql<number>`count(*)`,
    })
    .from(reactions)
    .where(eq(reactions.menuPostId, menuPostId))
    .groupBy(reactions.sentiment)
    .all();

  for (const row of result) {
    if (row.sentiment in counts) {
      counts[row.sentiment as Sentiment] = row.count;
    }
  }

  return counts;
}

/**
 * 유저 리액션 저장/업데이트 (upsert)
 */
export function setUserReaction(menuPostId: number, userId: string, sentiment: Sentiment): void {
  const existing = db
    .select()
    .from(reactions)
    .where(and(eq(reactions.menuPostId, menuPostId), eq(reactions.userId, userId)))
    .get();

  if (existing) {
    db.update(reactions)
      .set({ sentiment, addedAt: new Date() })
      .where(eq(reactions.id, existing.id))
      .run();
  } else {
    db.insert(reactions)
      .values({ menuPostId, userId, sentiment })
      .run();
  }
}

/**
 * 메뉴 메시지용 Block Kit 버튼 생성
 */
export function createReactionButtons(menuPostId: number): object[] {
  const counts = getReactionCounts(menuPostId);

  return [
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: `${SENTIMENT_LABEL.positive} ${SENTIMENT_EMOJI.positive} ${counts.positive}`, emoji: true },
          action_id: `reaction_positive_${menuPostId}`,
          value: `${menuPostId}:positive`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: `${SENTIMENT_LABEL.neutral} ${SENTIMENT_EMOJI.neutral} ${counts.neutral}`, emoji: true },
          action_id: `reaction_neutral_${menuPostId}`,
          value: `${menuPostId}:neutral`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: `${SENTIMENT_LABEL.negative} ${SENTIMENT_EMOJI.negative} ${counts.negative}`, emoji: true },
          action_id: `reaction_negative_${menuPostId}`,
          value: `${menuPostId}:negative`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '👀 누가 눌렀지?', emoji: true },
          action_id: `open_reaction_board_${menuPostId}`,
          value: `${menuPostId}`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🛠️ 고장신고/기능제안', emoji: true },
          action_id: 'open_feedback_modal',
        },
      ],
    },
  ];
}

/**
 * 메뉴 포스트의 모든 메뉴 메시지 버튼 업데이트
 */
export async function updateAllMenuMessageButtons(menuPostId: number): Promise<void> {
  // 해당 메뉴 포스트의 모든 메뉴 메시지 조회
  const messages = db
    .select()
    .from(menuMessages)
    .where(eq(menuMessages.menuPostId, menuPostId))
    .all();

  // 메뉴 포스트 조회 (메시지 텍스트용)
  const menuPost = db
    .select()
    .from(menuPosts)
    .where(eq(menuPosts.id, menuPostId))
    .get();

  if (!menuPost) return;

  // 메시지 텍스트와 블록을 DB 정보로 재구성
  // 리액션 업데이트 시에는 "n일 전 정보입니다" 문구를 생략 (최초 전송 시에만 붙음)
  const message = formatMenuMessage(menuPost, { skipDaysAgoNotice: true });
  const buttons = createReactionButtons(menuPostId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
    ...buttons,
  ];

  // 각 메시지 업데이트
  for (const msg of messages) {
    try {
      await app.client.chat.update({
        channel: msg.channelId,
        ts: msg.messageTs,
        blocks,
        text: message,
      });
    } catch (error) {
      console.error(`메시지 업데이트 실패: ${msg.channelId}/${msg.messageTs}`, error);
    }
  }
}
