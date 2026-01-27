import { app } from './app.js';
import { getUserReview, saveReview } from '../services/reviews.js';
import { updateAllMenuMessageButtons } from '../services/reactions.js';

/**
 * 리뷰 핸들러 등록
 */
export function registerReviewHandlers() {
  // 리뷰 쓰기 버튼 클릭 → 모달 열기
  app.action(/^open_review_modal_\d+$/, async ({ ack, body, client }) => {
    await ack();

    const actionBody = body as any;
    const menuPostId = parseInt(actionBody.actions[0].value, 10);
    const userId = actionBody.user.id;
    const channelId = actionBody.channel?.id || actionBody.container?.channel_id;

    // 기존 리뷰 조회
    const existingReview = getUserReview(menuPostId, userId);
    const isEdit = !!existingReview;

    try {
      await client.views.open({
        trigger_id: actionBody.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'review_modal_submit',
          private_metadata: JSON.stringify({ menuPostId, channelId }),
          title: { type: 'plain_text', text: isEdit ? '리뷰 수정' : '리뷰 쓰기' },
          submit: { type: 'plain_text', text: '저장' },
          close: { type: 'plain_text', text: '취소' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '오늘 메뉴에 대한 리뷰를 남겨주세요! 다른 분들에게 도움이 됩니다 :yum:',
              },
            },
            {
              type: 'input',
              block_id: 'review_input',
              label: { type: 'plain_text', text: '리뷰' },
              element: {
                type: 'plain_text_input',
                action_id: 'review_text',
                multiline: true,
                max_length: 200,
                placeholder: { type: 'plain_text', text: '메뉴에 대한 솔직한 리뷰를 남겨주세요...' },
                ...(existingReview ? { initial_value: existingReview.content } : {}),
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error('[리뷰] 모달 열기 실패:', error);
    }
  });

  // 모달 제출 → 리뷰 저장
  app.view('review_modal_submit', async ({ ack, body, view, client }) => {
    const reviewText = view.state.values.review_input.review_text.value || '';
    const userId = body.user.id;
    const { menuPostId, channelId } = JSON.parse(view.private_metadata);

    // 빈 리뷰 검증
    if (!reviewText.trim()) {
      await ack({
        response_action: 'errors',
        errors: { review_input: '리뷰 내용을 입력해주세요.' },
      });
      return;
    }

    await ack();

    try {
      // 리뷰 저장
      saveReview(menuPostId, userId, reviewText.trim());
      console.log(`[리뷰] 저장됨: menuPostId=${menuPostId}, userId=${userId}`);

      // 모든 메뉴 메시지 업데이트
      await updateAllMenuMessageButtons(menuPostId);

      // 성공 알림 (ephemeral)
      if (channelId) {
        try {
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: '✅ 리뷰가 저장되었습니다!',
          });
        } catch (ephemeralError) {
          console.error('[리뷰] ephemeral 전송 실패:', ephemeralError);
        }
      }
    } catch (error) {
      console.error('[리뷰] 저장 실패:', error);

      if (channelId) {
        try {
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: '❌ 리뷰 저장에 실패했습니다. 다시 시도해주세요.',
          });
        } catch (ephemeralError) {
          console.error('[리뷰] 실패 ephemeral 전송 실패:', ephemeralError);
        }
      }
    }
  });

  console.log('리뷰 핸들러 등록됨');
}
