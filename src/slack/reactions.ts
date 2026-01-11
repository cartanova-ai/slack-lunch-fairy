import { app } from './app.js';
import {
  setUserReaction,
  updateAllMenuMessageButtons,
  SENTIMENTS,
  SENTIMENT_EMOJI,
  type Sentiment,
} from '../services/reactions.js';

/**
 * 리액션 버튼 핸들러 등록
 */
export function registerReactionHandlers() {
  // 리액션 버튼 클릭 핸들러 (패턴 매칭)
  app.action(/^reaction_(positive|neutral|negative)_\d+$/, async ({ action, ack, body, client }) => {
    await ack();

    const value = (action as any).value as string;

    // value: "menuPostId:sentiment"
    const [menuPostIdStr, sentimentKey] = value.split(':');
    const menuPostId = parseInt(menuPostIdStr, 10);

    // sentiment 유효성 검사
    if (!SENTIMENTS.includes(sentimentKey as Sentiment)) {
      console.error(`[리액션] 알 수 없는 sentiment: ${sentimentKey}`);
      return;
    }

    const sentiment = sentimentKey as Sentiment;
    const userId = body.user.id;

    console.log(`[리액션 버튼] user=${userId}, menuPostId=${menuPostId}, sentiment=${sentiment}`);

    // DB에 리액션 저장
    setUserReaction(menuPostId, userId, sentiment);

    // 유저에게 피드백 (ephemeral)
    try {
      await client.chat.postEphemeral({
        channel: (body as any).channel?.id || (body as any).container?.channel_id,
        user: userId,
        text: `${SENTIMENT_EMOJI[sentiment]} 선택했어요!`,
      });
    } catch (error) {
      console.error('[리액션] ephemeral 메시지 전송 실패:', error);
    }

    // 모든 메뉴 메시지 버튼 업데이트
    await updateAllMenuMessageButtons(menuPostId);
  });

  console.log('리액션 핸들러 등록됨');
}
