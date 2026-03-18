import type { BlockAction, ButtonAction } from '@slack/bolt';
import { app } from './app.js';
import {
  setUserReaction,
  updateAllMenuMessageButtons,
  getReactionsBySentiment,
  SENTIMENTS,
  SENTIMENT_EMOJI,
  SENTIMENT_LABEL,
  type Sentiment,
} from '../services/reactions.js';

/**
 * 리액션 버튼 핸들러 등록
 */
export function registerReactionHandlers() {
  // 리액션 버튼 클릭 핸들러 (패턴 매칭)
  app.action<BlockAction<ButtonAction>>(/^reaction_(positive|neutral|negative)_\d+$/, async ({ action, ack, body, client }) => {
    await ack();

    const value = action.value || '';

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
      const channelId = body.channel?.id || body.container?.channel_id;
      if (channelId) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: `${SENTIMENT_EMOJI[sentiment]} 선택했어요!`,
        });
      }
    } catch (error) {
      console.error('[리액션] ephemeral 메시지 전송 실패:', error);
    }

    // 모든 메뉴 메시지 버튼 업데이트
    await updateAllMenuMessageButtons(menuPostId);
  });

  // "👀 누가 눌렀지?" 버튼 클릭 핸들러
  app.action<BlockAction<ButtonAction>>(/^open_reaction_board_\d+$/, async ({ action, ack, body, client }) => {
    await ack();

    const menuPostId = parseInt(action.value || '0', 10);
    const triggerId = body.trigger_id;

    console.log(`[리액션 보드] menuPostId=${menuPostId}`);

    // 감정별 사용자 목록 조회
    const reactionsBySentiment = getReactionsBySentiment(menuPostId);

    // 모달 블록 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocks: any[] = [];

    for (const sentiment of SENTIMENTS) {
      const users = reactionsBySentiment[sentiment];
      const emoji = SENTIMENT_EMOJI[sentiment];
      const label = SENTIMENT_LABEL[sentiment];

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${emoji} ${label}* (${users.length}명)`,
        },
      });

      if (users.length > 0) {
        const userMentions = users.map(uid => `<@${uid}>`).join(', ');
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: userMentions,
            },
          ],
        });
      } else {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '_아직 없어요_',
            },
          ],
        });
      }

      blocks.push({ type: 'divider' });
    }

    // 마지막 divider 제거
    blocks.pop();

    try {
      await client.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          title: {
            type: 'plain_text',
            text: '👀 누가 눌렀지?',
            emoji: true,
          },
          close: {
            type: 'plain_text',
            text: '닫기',
          },
          blocks,
        },
      });
    } catch (error) {
      console.error('[리액션 보드] 모달 열기 실패:', error);
    }
  });

  console.log('리액션 핸들러 등록됨');
}
