// backend/ingest.cjs
// Minimal API for session-based memory + a naive /ask endpoint.

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env if present (safe to call even if missing)
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// --- Middleware
app.use(cors());
app.use(express.json());

// --- In-memory store: { [sessionId]: Array<{type,text,ts}> }
const memory = Object.create(null);

// Helpers
function getSession(req) {
  return (req.headers['x-session-id'] || 'web-unknown').toString();
}
function ensureBucket(session) {
  if (!memory[session]) memory[session] = [];
  return memory[session];
}
function sortedItems(session) {
  return [...(memory[session] || [])].sort((a, b) => a.ts - b.ts);
}

// --- Health
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// --- Memory: status
app.get('/memory/status', (req, res) => {
  const session = getSession(req);
  const count = (memory[session] || []).length;
  res.json({ ok: true, session, count });
});

// --- Memory: list all items
app.get('/memory/list', (req, res) => {
  const session = getSession(req);
  const items = sortedItems(session);
  res.json({ ok: true, session, count: items.length, items });
});

// --- Memory: save one item
// body: { type: "fact" | "answer" | string, text: string }
app.post('/memory/save', (req, res) => {
  const session = getSession(req);
  const bucket = ensureBucket(session);

  const type = (req.body?.type || 'fact').toString();
  const text = (req.body?.text || '').toString().trim();

  if (!text) return res.status(400).json({ ok: false, error: 'Missing text' });
  if (text.length < 3) return res.status(400).json({ ok: false, error: 'Text too short' });

  const item = { type, text, ts: Date.now() };
  bucket.push(item);

  res.json({ ok: true, saved: 1, session, count: bucket.length });
});

// --- Memory: clear session (handy in dev)
app.post('/memory/clear', (req, res) => {
  const session = getSession(req);
  memory[session] = [];
  res.json({ ok: true, session, cleared: true });
});

// --- ASK: naive keyword matching over saved facts
// body: { question: string }
app.post('/ask', (req, res) => {
  const session = getSession(req);
  const question = (req.body?.question || '').toString().toLowerCase().trim();

  const items = (memory[session] || []).filter(x => x && x.type === 'fact');

  if (!question || items.length === 0) {
    return res.json({
      ok: true,
      answer: "I don't have a saved fact for that yet.",
      used: []
    });
  }

  // Tokenize the question, score each fact by overlap
  const terms = question.split(/\W+/).filter(Boolean);
  const scored = items
    .map(f => {
      const text = f.text.toLowerCase();
      const score = terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0);
      return { fact: f, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score === 0) {
    return res.json({
      ok: true,
      answer: "I don't have a saved fact for that yet.",
      used: []
    });
  }

  res.json({ ok: true, answer: top.fact.text, used: [top.fact] });
});

// --- Start server
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
