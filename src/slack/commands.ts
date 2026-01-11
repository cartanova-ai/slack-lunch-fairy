import { app } from './app.js';
import { db } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getOrFetchMenuPost, sendMenuMessage } from '../services/menu.js';

// /lunch 슬래시 커맨드 핸들러
export function registerCommands() {
  app.command('/lunch', async ({ command, ack, respond }) => {
    console.log('[/lunch] 커맨드 수신:', command.text, '채널:', command.channel_id);

    try {
      await ack();
      console.log('[/lunch] ack 완료');
    } catch (ackError) {
      console.error('[/lunch] ack 실패:', ackError);
      return;
    }

    const args = command.text.trim().split(/\s+/);
    const subCommand = args[0]?.toLowerCase();
    console.log('[/lunch] subCommand:', subCommand);

    switch (subCommand) {
      case 'now': {
        try {
          // 메뉴 포스트 가져오기 (DB 우선, 없으면 fetch)
          const menuPost = await getOrFetchMenuPost();
          if (!menuPost) {
            await respond({
              response_type: 'ephemeral',
              text: '메뉴를 가져올 수 없습니다.',
            });
            return;
          }

          // 메뉴 메시지 발송 (버튼 포함)
          const result = await sendMenuMessage(menuPost, command.channel_id);
          if (!result) {
            await respond({
              response_type: 'ephemeral',
              text: '메시지 발송에 실패했습니다.',
            });
            return;
          }

          // respond는 ephemeral로 확인 메시지만
          await respond({
            response_type: 'ephemeral',
            text: '메뉴를 채널에 공유했습니다!',
          });
        } catch (error) {
          console.error('메뉴 조회 실패:', error);
          await respond({
            response_type: 'ephemeral',
            text: '메뉴 조회 중 오류가 발생했습니다.',
          });
        }
        break;
      }

      case 'subscribe': {
        const subArg = args[1]?.toLowerCase();

        // /lunch subscribe list 처리
        if (subArg === 'list') {
          try {
            const allSubs = db.select().from(subscriptions).all();

            if (allSubs.length === 0) {
              await respond({
                response_type: 'ephemeral',
                text: '구독 중인 채널이 없습니다.',
              });
            } else {
              const list = allSubs
                .map((s) => `• <#${s.channelId}> - ${s.notifyTime}`)
                .join('\n');
              await respond({
                response_type: 'ephemeral',
                text: `*구독 목록:*\n${list}`,
              });
            }
          } catch (error) {
            console.error('목록 조회 실패:', error);
            await respond({
              response_type: 'ephemeral',
              text: '목록 조회 중 오류가 발생했습니다.',
            });
          }
          break;
        }

        // /lunch subscribe HH:mm 처리
        const time = subArg;
        if (!time || !/^\d{2}:\d{2}$/.test(time)) {
          await respond({
            response_type: 'ephemeral',
            text: '사용법:\n• `/lunch subscribe HH:mm` - 구독 (예: 11:30)\n• `/lunch subscribe list` - 구독 목록 확인',
          });
          return;
        }

        // 시간 유효성 검사
        const [hour, minute] = time.split(':').map(Number);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          await respond({
            response_type: 'ephemeral',
            text: '올바른 시간 형식이 아닙니다. (00:00 ~ 23:59)',
          });
          return;
        }

        try {
          // 기존 구독 확인 및 업데이트/삽입
          const existing = db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.channelId, command.channel_id))
            .get();

          if (existing) {
            db.update(subscriptions)
              .set({ notifyTime: time })
              .where(eq(subscriptions.channelId, command.channel_id))
              .run();
            await respond({
              response_type: 'ephemeral',
              text: `알림 시간이 ${time}으로 변경되었습니다.`,
            });
          } else {
            db.insert(subscriptions)
              .values({
                channelId: command.channel_id,
                notifyTime: time,
              })
              .run();
            await respond({
              response_type: 'ephemeral',
              text: `이 채널이 점심 알림에 구독되었습니다. 매일 평일 ${time}에 메뉴를 알려드릴게요!`,
            });
          }
        } catch (error) {
          console.error('구독 처리 실패:', error);
          await respond({
            response_type: 'ephemeral',
            text: '구독 처리 중 오류가 발생했습니다.',
          });
        }
        break;
      }

      case 'unsubscribe': {
        try {
          const result = db
            .delete(subscriptions)
            .where(eq(subscriptions.channelId, command.channel_id))
            .run();

          if (result.changes > 0) {
            await respond({
              response_type: 'ephemeral',
              text: '이 채널의 점심 알림 구독이 취소되었습니다.',
            });
          } else {
            await respond({
              response_type: 'ephemeral',
              text: '이 채널은 구독 중이 아닙니다.',
            });
          }
        } catch (error) {
          console.error('구독 취소 실패:', error);
          await respond({
            response_type: 'ephemeral',
            text: '구독 취소 중 오류가 발생했습니다.',
          });
        }
        break;
      }

      default:
        await respond({
          response_type: 'ephemeral',
          text: '*점심 요정 사용법:*\n• `/lunch now` - 메뉴 즉시 조회\n• `/lunch subscribe HH:mm` - 점심 알림 구독 (예: 11:30)\n• `/lunch subscribe list` - 구독 목록 확인\n• `/lunch unsubscribe` - 구독 취소',
        });
    }
  });
}
