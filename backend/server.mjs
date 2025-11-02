// backend/server.mjs
// ESM entry for the Almost Human backend

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

// --- Resolve __dirname for ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Health check ---
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// --- Load respond handler (from .cjs) ---
let respondHandler = null;
try {
  // expects default export: module.exports = async function respondHandler(req,res){...}
  respondHandler = (await import('./respondHandler.cjs')).default;
} catch (err) {
  console.error('[server] Could not load respondHandler.cjs:', err);
  respondHandler = async (_req, res) => {
    res.status(500).json({ error: 'respond handler missing' });
  };
}

// Register BOTH routes so UI can call either path
app.post(['/api/respond', '/respond'], respondHandler);

// --- Memory API (try real module; otherwise in-memory fallback) ---
let memList, memAdd, memClear;
try {
  // Optional helper module; if you already have routes wired elsewhere,
  // this try/catch will be ignored and the fallback won’t run.
  const mod = await import('./memory.cjs');
  memList = mod.listMemory;
  memAdd = mod.addMemory;
  memClear = mod.clearMemory;
} catch {
  // Minimal in-memory fallback so the UI isn't blocked if the module isn't present.
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

// --- Serve built frontend (single-service deployment) ---
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback: serve index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/respond')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] listening on ${PORT}`);
});
