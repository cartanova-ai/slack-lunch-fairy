import express from 'express';
import rateLimit from 'express-rate-limit';
import { receiveMenu } from '../services/menu.js';

const API_PORT = Number(process.env.API_PORT) || 8080;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;

export function startApiServer() {
  if (!API_BEARER_TOKEN) {
    console.warn('[API] API_BEARER_TOKEN이 설정되지 않아 API 서버를 시작하지 않습니다.');
    return;
  }

  const app = express();
  // JSON 파싱 (문자열 내 실제 줄바꿈을 이스케이프 처리)
  app.use(express.text({ limit: '10kb', type: 'application/json' }));
  app.use((req, _res, next) => {
    if (typeof req.body === 'string') {
      req.body = JSON.parse(req.body.replace(/\n/g, '\\n'));
    }
    next();
  });

  // Rate limiting (15분당 최대 10회)
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many requests' },
  }));

  // Bearer 토큰 인증
  app.use('/api', (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${API_BEARER_TOKEN}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });

  // POST /api/menuPosts - 외부에서 메뉴 등록 → 구독 채널에 즉시 발송
  app.post('/api/menuPosts', async (req, res) => {
    const { source, menuText } = req.body;

    if (!menuText || typeof menuText !== 'string' || menuText.length > 5000) {
      res.status(400).json({ error: 'menuText는 필수이며 5000자 이하여야 합니다.' });
      return;
    }

    const safeSource = typeof source === 'string'
      ? source.replace(/[\r\n\x1b]/g, '').substring(0, 50)
      : 'unknown';
    console.log(`[API] 메뉴 입력 요청 (source: ${safeSource})`);

    const result = await receiveMenu(menuText);

    if (result.success) {
      res.json({ ok: true, date: result.date, broadcast: result.broadcast });
    } else {
      res.status(409).json({ ok: false, error: result.error });
    }
  });

  // 전역 에러 핸들러 (내부 정보 유출 방지)
  app.use(((err, req, res, _next) => {
    console.error('[API] 서버 에러:', err);
    res.status(500).json({ error: '내부 서버 오류' });
  }) as express.ErrorRequestHandler);

  app.listen(API_PORT, () => {
    console.log(`API 서버 시작됨 (port: ${API_PORT})`);
  });
}
