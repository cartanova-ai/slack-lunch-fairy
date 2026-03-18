# TODO: 코드 리뷰 결과 개선 항목

2026-03-18 리팩터링 후 4개 에이전트(아키텍처, 패턴/중복, 보안, 미사용 의존성) 리뷰 종합.

## 즉시 조치 (높음)

- [x] **데드 코드: 스크래퍼 파일 삭제** — `src/scraper/` 삭제 완료
- [x] **미사용 의존성 제거** — `node-cron`, `@types/node-cron` 제거 완료
- [x] **비효율 쿼리** — `desc` + `limit(1)` + `.get()` 으로 변경 완료
- [x] **하드코딩 경로** — `execFile` 전환으로 `cd` 불필요해져 함께 제거됨
- [x] ~~**보안: 타이밍 공격**~~ — 하드코드 토큰 수준에서는 불필요, 현행 유지
- [x] **보안: 명령어 인젝션** — `exec` → `execFile` 배열 인자 방식으로 변경 완료

## 단기 개선 (중간)

- [ ] **순환 의존성** — `menu.ts` ↔ `reactions.ts` 간 순환 import, 포맷팅 로직을 별도 모듈로 분리 필요
- [ ] **보안: rate limiting** 부재 — `express-rate-limit` 도입 (`api/index.ts`)
- [ ] **보안: `menuText` 길이 제한** 없음 — 최대 길이 검증 추가 (`api/index.ts:30`)
- [ ] **보안: `source` 로그 인젝션** — 줄바꿈/ANSI 문자 필터링 필요 (`api/index.ts:35`)
- [ ] **레거시 `notifyTime` 필드** — 더미값 `'00:00'` 하드코딩 중, 스키마 정리 필요 (`db/schema.ts:7`)
- [ ] **네이밍 오타** — `getReactionsBysentiment` → `getReactionsBySentiment` (`services/reactions.ts` + 호출부 2곳)
- [ ] **`formatMenuMessage` 이중 호출** — `sendMenuMessage`에서 한 번, `createMenuBlocks` 안에서 또 한 번 (`services/menu.ts`)
- [ ] **미사용 유틸 함수** — `getKSTTimeStr`, `getKSTDayOfWeek` 제거 (`utils/time.ts`)

## 나중에 (낮음)

- [ ] API 전역 에러 핸들러 추가 (`api/index.ts`)
- [ ] API 바인딩 주소 검토 — `0.0.0.0` → `127.0.0.1` (용도에 따라)
- [ ] `helmet` 보안 헤더 미들웨어 도입
- [ ] 구독 CRUD를 서비스 레이어로 분리 (`commands.ts`에서 직접 DB 접근 중)
- [ ] `as any` 캐스팅 정리 (Bolt 타입 좁히기)
- [ ] Ephemeral 메시지 헬퍼 함수 추출 (5곳 반복 패턴)
