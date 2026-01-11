import { app } from './app.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

const GITHUB_REPO = 'cartanova-ai/slack-lunch-fairy';

/**
 * 피드백 핸들러 등록
 */
export function registerFeedbackHandlers() {
  // 피드백 버튼 클릭 → 모달 열기
  app.action('open_feedback_modal', async ({ ack, body, client }) => {
    await ack();

    const channelId = (body as any).channel?.id || (body as any).container?.channel_id;

    try {
      await client.views.open({
        trigger_id: (body as any).trigger_id,
        view: {
          type: 'modal',
          callback_id: 'feedback_modal_submit',
          private_metadata: channelId, // 채널 정보 저장
          title: { type: 'plain_text', text: '피드백 보내기' },
          submit: { type: 'plain_text', text: '보내기' },
          close: { type: 'plain_text', text: '취소' },
          blocks: [
            {
              type: 'input',
              block_id: 'feedback_input',
              label: { type: 'plain_text', text: '고장신고 또는 기능제안' },
              element: {
                type: 'plain_text_input',
                action_id: 'feedback_text',
                multiline: true,
                placeholder: { type: 'plain_text', text: '내용을 입력해주세요...' },
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error('[피드백] 모달 열기 실패:', error);
    }
  });

  // 모달 제출 → GitHub 이슈 생성
  app.view('feedback_modal_submit', async ({ ack, body, view, client }) => {
    await ack();

    const feedbackText = view.state.values.feedback_input.feedback_text.value || '';
    const userId = body.user.id;
    const userName = body.user.name || body.user.id;
    const channelId = view.private_metadata; // 저장해둔 채널 정보

    // 현재 날짜
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const issueTitle = `[피드백] ${dateStr} from @${userName}`;
    const issueBody = `> 이 이슈는 Slack에서 수신한 피드백으로 자동 생성되었습니다.

**작성자**: ${userName}
**날짜**: ${dateStr}

---

${feedbackText}`;

    // 임시 파일에 body 저장 (shell escaping 문제 방지)
    const tmpFile = join(tmpdir(), `feedback-${Date.now()}.md`);

    try {
      writeFileSync(tmpFile, issueBody, 'utf-8');

      // gh issue create 실행 (--body-file 사용)
      const { stdout } = await execAsync(
        `cd /home/potados/Projects/slack-lunch-fairy && gh issue create --repo ${GITHUB_REPO} --title "${issueTitle.replace(/"/g, '\\"')}" --body-file "${tmpFile}"`,
        { timeout: 30000 }
      );

      const issueUrl = stdout.trim();
      console.log(`[피드백] 이슈 생성됨: ${issueUrl}`);

      // ephemeral로 같은 채널에 알림
      if (channelId) {
        try {
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: `✅ 피드백이 등록되었습니다!\n${issueUrl}`,
          });
        } catch (ephemeralError) {
          console.error('[피드백] ephemeral 전송 실패:', ephemeralError);
        }
      }
    } catch (error) {
      console.error('[피드백] 이슈 생성 실패:', error);

      // 실패 알림
      if (channelId) {
        try {
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: `❌ 피드백 등록에 실패했습니다. 나중에 다시 시도해주세요.`,
          });
        } catch (ephemeralError) {
          console.error('[피드백] 실패 ephemeral 전송 실패:', ephemeralError);
        }
      }
    } finally {
      // 임시 파일 삭제
      try {
        unlinkSync(tmpFile);
      } catch {}
    }
  });

  console.log('피드백 핸들러 등록됨');
}
