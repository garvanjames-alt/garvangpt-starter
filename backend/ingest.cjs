// backend/ingest.cjs
// Minimal API for GarvanGPT — health, ask, and stub "memory" routes.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// OpenAI (v4) — CommonJS
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Pick a small, fast model by default. Override with OPENAI_MODEL in .env
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- health ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, body: 'ok' });
});

// --- ultra-simple in-memory "memory" per session ---
const mem = new Map();
function sidFrom(req) {
  return req.get('X-Session-ID') || 'default';
}

app.get('/memory/status', (req, res) => {
  const sid = sidFrom(req);
  const items = mem.get(sid) || [];
  res.json({ ok: true, count: items.length });
});

app.post('/memory/save', (req, res) => {
  const sid = sidFrom(req);
  const { type = 'answer', text = '' } = req.body || {};
  const items = mem.get(sid) || [];
  items.push({ type, text, ts: Date.now() });
  mem.set(sid, items);
  res.json({ ok: true, saved: 1 });
});

// --- main ask endpoint ---
// expects JSON: { "question": "<string>" }
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body || {};
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: "Missing 'question' (string)." });
    }

    const sid = sidFrom(req);

    const chat = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You are a cautious, concise pharmacist assistant. Provide brief, clear answers with sensible cautions.',
        },
        { role: 'user', content: question.trim() },
      ],
    });

    const answer =
      chat?.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I couldn't draft a response.";

    // include the session id we used so you can see it in DevTools if needed
    res.json({ answer, usedSessionId: sid });
  } catch (err) {
    console.error('ASK error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
