import express from 'express';
import { insertManualMenu } from '../services/menu.js';

const API_PORT = Number(process.env.API_PORT) || 8080;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;

export function startApiServer() {
  if (!API_BEARER_TOKEN) {
    console.warn('[API] API_BEARER_TOKEN이 설정되지 않아 API 서버를 시작하지 않습니다.');
    return;
  }

  const app = express();
  app.use(express.json());

  // Bearer 토큰 인증
  app.use('/api', (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${API_BEARER_TOKEN}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });

  // POST /api/menuPost - 외부에서 메뉴 등록
  app.post('/api/menuPost', (req, res) => {
    const { source, menuText } = req.body;

    if (!menuText || typeof menuText !== 'string') {
      res.status(400).json({ error: 'menuText는 필수입니다.' });
      return;
    }

    console.log(`[API] 메뉴 입력 요청 (source: ${source || 'unknown'})`);

    const result = insertManualMenu(menuText);

    if (result.success) {
      res.json({ ok: true, date: result.date });
    } else {
      res.status(409).json({ ok: false, error: result.error });
    }
  });

  app.listen(API_PORT, () => {
    console.log(`API 서버 시작됨 (port: ${API_PORT})`);
  });
}
