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

- [x] **순환 의존성** — `services/format.ts` 추출로 해소
- [x] **보안: rate limiting** — `express-rate-limit` 도입 (15분당 10회)
- [x] **보안: `menuText` 길이 제한** — 5000자 제한 추가
- [x] **보안: `source` 로그 인젝션** — 줄바꿈/ANSI 필터링 + 50자 제한
- [x] **레거시 `notifyTime` 필드** — `$defaultFn`으로 기본값 설정, insert에서 제거
- [x] **네이밍 오타** — `getReactionsBySentiment`로 수정 완료
- [x] **`formatMenuMessage` 이중 호출** — `createMenuBlocks`가 message 문자열을 받도록 변경
- [x] **미사용 유틸 함수** — `getKSTTimeStr`, `getKSTDayOfWeek` 제거 완료

## 나중에 (낮음)

- [ ] API 전역 에러 핸들러 추가 (`api/index.ts`)
- [ ] API 바인딩 주소 검토 — `0.0.0.0` → `127.0.0.1` (용도에 따라)
- [ ] `helmet` 보안 헤더 미들웨어 도입
- [ ] 구독 CRUD를 서비스 레이어로 분리 (`commands.ts`에서 직접 DB 접근 중)
- [ ] `as any` 캐스팅 정리 (Bolt 타입 좁히기)
- [ ] Ephemeral 메시지 헬퍼 함수 추출 (5곳 반복 패턴)
