// backend/server.mjs
// ESM entry for the Almost Human backend (serves API)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import authRouter from './authRouter.mjs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---- JSON body ----
app.use(express.json());

// ---- CORS (frontend Render + localhost) ----
const allowedOrigins = [
  'http://localhost:5173',
  'https://almosthuman-frontend.onrender.com',
  'https://almosthuman-frontend-staging.onrender.com',
];

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin & tools (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ---- Cookies so auth middleware can read gh_session ----
app.use(cookieParser());

// ---- Health ----
app.get('/health', (_req, res) => res.status(200).send('OK'));

// ---- Auth & other API routes (e.g., /api/login) ----
app.use('/api', authRouter);

// ---- TTS route (CJS-friendly import) ----
let ttsHandler;
try {
  const mod = require('./ttsHandler.cjs');
  ttsHandler =
    (typeof mod === 'function' && mod) ||
    (mod && typeof mod.default === 'function' && mod.default) ||
    (mod && typeof mod.respond === 'function' && mod.respond) ||
    (mod && typeof mod.handler === 'function' && mod.handler);
} catch (err) {
  console.error('[TTS] Failed to load ttsHandler.cjs', err);
}

if (ttsHandler) {
  app.post('/api/tts', ttsHandler);
} else {
  // Gracefully no-op if handler missing/misloaded
  app.post('/api/tts', (_req, res) => res.status(204).send());
}

// ---- 404 fallback for /api ----
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Optional: serve built frontend locally if you want ----
// set SERVE_FRONTEND=true in your env to enable
if (process.env.SERVE_FRONTEND === 'true') {
  const dist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ---- Start server ----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] listening on ${PORT}`);
});
