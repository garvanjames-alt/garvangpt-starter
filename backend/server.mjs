// backend/server.mjs
// ESM entry for the Almost Human backend (serves API + built frontend)

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const app = express();
app.use(express.json());

// --- Resolve __dirname for ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Health check ---
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// --- Load respond handler (CJS-friendly) ---
let respondHandler;
try {
  const mod = require('./respondHandler.cjs');
  respondHandler =
    (typeof mod === 'function' && mod) ||
    (mod && typeof mod.default === 'function' && mod.default) ||
    (mod && typeof mod.respond === 'function' && mod.respond) ||
    (mod && typeof mod.handler === 'function' && mod.handler);

  if (typeof respondHandler !== 'function') {
    throw new Error(
      `respondHandler.cjs did not export a function. Keys: ${Object.keys(mod || {})}`
    );
  }
} catch (err) {
  console.error('[server] Could not load a function from respondHandler.cjs:', err);
  respondHandler = async (_req, res) => {
    res.status(500).json({ error: 'respond handler missing or invalid export' });
  };
}

// --- Primary routes ---
app.post(['/api/respond', '/respond'], respondHandler);

// Optional: TTS stub so “Read aloud” doesn’t 404
app.post(['/api/tts', '/tts'], (_req, res) => res.status(204).end());

// --- Memory API (fallback if memory module is absent) ---
let memList, memAdd, memClear;
try {
  const mod = await import('./memory.cjs');
  memList = mod.listMemory;
  memAdd = mod.addMemory;
  memClear = mod.clearMemory;
} catch {
  const store = [];
  memList = async () => store;
  memAdd = async (text) => store.push({ text, ts: Date.now() });
  memClear = async () => (store.length = 0);
}

app.get(['/api/memory', '/memory'], async (_req, res) => {
  res.json({ items: await memList() });
});
app.post(['/api/memory', '/memory'], async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  await memAdd(text);
  res.json({ ok: true });
});
app.delete(['/api/memory', '/memory'], async (_req, res) => {
  await memClear();
  res.json({ ok: true });
});

// --- Serve built frontend (../frontend/dist) ---
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback: send index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/respond')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] listening on ${PORT}`);
});
