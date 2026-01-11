# 점심 요정 (Lunch Fairy)

Slack 점심메뉴 알림 봇

## 기능

### 메뉴 구독
채널에서 점심메뉴 알림을 구독합니다.

```
/lunch subscribe HH:mm  # 구독 (예: /lunch subscribe 11:30)
/lunch unsubscribe      # 구독 취소
/lunch list             # 구독 목록 확인
```

- 평일 지정 시간에 오늘의 점심메뉴를 채널에 게시
- 현재 지원: 진한식당 (송도)

### 리액션 수집
- 메뉴 게시물에 달리는 리액션을 수집하여 저장
- 유저당 1개 리액션 (새 리액션으로 자동 교체)
- 리액션 변경 시 토스트 메시지로 피드백

## 데이터 소스

네이버 플레이스 피드에서 메뉴 정보 수집

## 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 Slack 토큰 입력
```

### 3. Slack 앱 생성

1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. `manifest.yaml` 파일 내용으로 앱 설정
3. Socket Mode 활성화 및 App-Level Token 생성
4. 워크스페이스에 앱 설치

### 4. 실행

```bash
# 개발 모드 (watch)
pnpm dev

# 프로덕션 모드
pnpm start
```

### 5. PM2로 배포

```bash
pm2 start pnpm --name lunch-fairy -- start
pm2 save
```

## 환경변수

| 변수명 | 설명 |
|--------|------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth Token (xoxb-...) |
| `SLACK_APP_TOKEN` | Slack App-Level Token (xapp-...) |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret |

## 필요한 Slack 권한

### Bot Token Scopes
- `chat:write` - 메시지 전송
- `commands` - 슬래시 커맨드
- `reactions:read` - 리액션 읽기

### Event Subscriptions
- `reaction_added`
- `reaction_removed`

## 데이터 저장

SQLite 데이터베이스: `~/.lunch-fairy/data/lunch-fairy.db`

## 라이선스

MIT
