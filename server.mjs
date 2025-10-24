//GarvanGPT backend — ES module (clean)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Persistence routes (use ESM db.js)
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

  ['/memory', '/api/memory'].forEach(base => {
    app.get(base, getAll);
    app.post(base, add);
    app.delete(base, clear);
  });
} catch (e) {
  console.error('Memory routes failed to init (stack):', e);
}

app.listen(PORT, () => {
  console.log(`✅ GarvanGPT backend v2 running at http://localhost:${PORT}`);
  console.log('🔎 Registered routes:');
  console.log('   • GET  /health');
  console.log('   • GET/POST/DELETE  /memory   (alias: /api/memory)');
});

// --- compatibility routes for the frontend buttons ---
app.get('/memory/status', async (_req, res) => {
  const db = await import('./db.js');
  const items = await db.getAll();
  res.json({ count: items.length });
});

app.get('/api/memory/list', async (_req, res) => {
  const db = await import('./db.js');
  const items = await db.getAll();
  res.json({ items });
});

app.post('/memory/clear', async (_req, res) => {
  const db = await import('./db.js');
  await db.clear();
  res.json({ ok: true });
});

// alias for legacy frontend: GET /list -> { items: [...] }
app.get('/list', async (_req, res) => {
  const db = await import('./db.js');
  const items = await db.getAll();
  res.json({ items });
});

// alias for frontend: GET /memory/list -> { items: [...] }
app.get('/memory/list', async (_req, res) => {
  const db = await import('./db.js');
  const items = await db.getAll();
  res.json({ items });
});

// --- Q&A endpoint (/ask) with pharmacist guardrails ---
// We also alias it as /api/ask for the frontend.
const askHandler = async (req, res) => {
  try {
    const text = req?.body?.text ?? '';
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok:false, error:'text required' });
    }

    // Pull a few recent memory items so answers can reference them
    const db = await import('./db.js');
    const items = await db.getAll();
    const recent = items.slice(0,5).map(i => `- ${i.text}`).join('\n');

    const system = `You are GarvanGPT, a careful pharmacist assistant.
- Be concise, factual, and cautious.
- Do not diagnose; include standard safety advice and encourage consulting a clinician for personal decisions.`;

    const user = `User question: ${text}

Recent memory:
${recent || '(none)'}`;

    // Use OPENAI_API_KEY if present; otherwise return a mock reply so dev can continue.
    const key = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_1;
    if (!key) {
      return res.json({
        ok: true,
        model: 'mock',
        answer: `Hello! Pharmacist here. (Mock reply) You asked: "${text}".`
      });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(()=>'');
      return res.status(500).json({ ok:false, error:'openai_error', detail: detail.slice(0,500) });
    }

    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content ?? '(no content)';
    return res.json({ ok:true, model: data?.model || 'unknown', answer });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};

app.post('/ask', askHandler);
app.post('/api/ask', askHandler);


// --- UI compatibility aliases ---
const saveHandler = async (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== 'string') {
    return res.status(400).json({ ok: false, error: 'text required' });
  }
  const db = await import('./db.js');
  await db.add({ text });
  res.json({ ok: true });
};

app.post('/save', saveHandler);
app.post('/api/save', saveHandler);

// point UI's /respond to the existing ask handler
app.post('/respond', askHandler);
app.post('/api/respond', askHandler);

// --- compatibility aliases for the UI: /respond
// Support GET /respond?q=... or ?text=... by mapping to askHandler
app.get('/respond', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q
           : typeof req.query.text === 'string' ? req.query.text
           : '';
  req.body = { text: q };
  return askHandler(req, res);
});
app.get('/api/respond', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q
           : typeof req.query.text === 'string' ? req.query.text
           : '';
  req.body = { text: q };
  return askHandler(req, res);
});

// We already added POST aliases earlier, but keep them here for clarity:
app.post('/respond', askHandler);
app.post('/api/respond', askHandler);

// --- install /respond aliases (maps to askHandler)
console.log('✅ installing /respond aliases');
app.post('/respond', askHandler);
app.post('/api/respond', askHandler);

app.get('/respond', (req, res) => {
  const q =
    typeof req.query.q === 'string' ? req.query.q :
    typeof req.query.text === 'string' ? req.query.text : '';
  req.body = { text: q };
  return askHandler(req, res);
});
app.post('/respond', (req, res) => {
  if (typeof req.body?.prompt === 'string' && !req.body.text) {
    req.body.text = req.body.prompt;
  }
  return askHandler(req, res);
});
app.post('/api/respond', (req, res) => {
  if (typeof req.body?.prompt === 'string' && !req.body.text) {
    req.body.text = req.body.prompt;
  }
  return askHandler(req, res);
});
app.post('/respond', (req, res) => {
  if (typeof req.body?.prompt === 'string' && !req.body.text) {
    req.body.text = req.body.prompt;
  }
  return askHandler(req, res);
});

