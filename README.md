# 점심 요정 (Lunch Fairy)

Slack 점심메뉴 알림 봇

## 기능

### 슬래시 커맨드

```
/lunch now              # 최신 메뉴 조회 및 채널에 공유
/lunch subscribe        # 이 채널에 점심 알림 구독
/lunch subscribe list   # 구독 중인 채널 목록
/lunch unsubscribe      # 구독 취소
/lunch feed             # 수동 메뉴 입력 (모달 또는 직접 텍스트)
```

### 메뉴 수신 및 브로드캐스트

외부에서 HTTP API(`POST /api/menuPosts`)로 메뉴를 등록하면 구독 채널에 즉시 발송합니다.

- 현재 지원: 진한식당 (송도)
- 메뉴 텍스트에서 날짜를 추출하여 DB에 저장
- 본문의 날짜가 실제와 다를 경우 자동 보정 및 노티스 표시

### 리액션 및 리뷰

메뉴 메시지에 버튼이 함께 표시됩니다.

- 😊 좋아요 / 🧐 그냥 그래요 / ☹️ 별로예요 (유저당 1개, 변경 가능)
- 👀 누가 눌렀지? (리액션 보드 모달)
- 📝 리뷰 쓰기 (최대 200자, 메시지에 인라인 표시)

### 관리 기능

- 🛠️ 고장신고/기능제안 → GitHub 이슈 자동 생성
- 🗑️ 삭제 → 봇이 보낸 메뉴 메시지 삭제 (확인 다이얼로그 포함)

## 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 값 입력
```

### 3. Slack 앱 생성

1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. `manifest.json` 파일 내용으로 앱 설정
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
| `API_PORT` | API 서버 포트 (기본값: 8080) |
| `API_BEARER_TOKEN` | 메뉴 등록 API 인증 토큰 |

## API

### POST /api/menuPosts

메뉴 등록 및 구독 채널 브로드캐스트.

```
Authorization: Bearer <API_BEARER_TOKEN>
Content-Type: application/json

{
  "menuText": "03월25일(화요일) ♥진한식당 점심메뉴♥\n🍖 돈불고기\n...",
  "source": "kakao-talk"  // 선택
}
```

## 데이터 저장

SQLite 데이터베이스: `~/.lunch-fairy/data/lunch-fairy.db`

## 라이선스

MIT
