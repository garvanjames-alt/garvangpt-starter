// GarvanGPT backend — stable baseline (ESM)

// 0) env + imports
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// 1) app + config
const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// 2) middleware
app.use(cors({ origin: FRONTEND, credentials: false }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// 3) health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// 4) persistence (file-based) — uses ./db.js (ESM)
try {
  const db = await import('./db.js');

  const getAll = async (_req, res) => {
    const items = await db.getAll();
    res.json({ count: items.length, items });
  };

  const add = async (req, res) => {
    const text = req.body?.text;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'text required' });
    }
    await db.add({ text });
    res.status(201).json({ ok: true });
  };

  const clear = async (_req, res) => {
    await db.clear();
    res.json({ ok: true });
  };

  // both paths supported
  ['/memory', '/api/memory'].forEach((base) => {
    app.get(base, getAll);
    app.post(base, add);
    app.delete(base, clear);
  });
} catch (e) {
  console.error('Memory routes failed to init:', e.message);
}

// 5) start
app.listen(PORT, () => {
  console.log(`✅ GarvanGPT backend running at http://localhost:${PORT}`);
  console.log('🔎 Registered routes:');
  console.log('   • GET  /health');
  console.log('   • GET/POST/DELETE  /memory   (alias: /api/memory)');
});
