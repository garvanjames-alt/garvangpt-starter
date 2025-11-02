// backend/server.mjs — FULL FILE (Step 85: Simple Auth added)
// Replace your existing server.mjs with this complete file.
// Notes:
// - Adds /api/login and /api/logout
// - Protects POST/DELETE /api/memory with auth middleware
// - Adds /api/admin/ping (protected) for verification
// - Keeps GET /api/memory, /api/respond, /api/tts, /health public

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// ---- Env & constants ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY || '';
const ELEVEN_MODEL = process.env.ELEVEN_MODEL || 'eleven_turbo_v2_5';
const ELEVEN_VOICE = process.env.ELEVEN_VOICE || '';

// Auth env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

if (!SESSION_SECRET) {
  console.warn('[WARN] SESSION_SECRET is not set. Set a strong random string in env.');
}

// Optional CORS origins (comma-separated) for dev/prod; same-origin is safest
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---- App setup ----
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

if (ALLOWED_ORIGINS.length > 0) {
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // allow same-origin/no-origin (curl)
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS not allowed'));
      },
      credentials: true,
    })
  );
}

// ---- Helpers ----
const isProd = NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd, // true on Render (https)
  sameSite: 'lax',
  path: '/',
};

function signSession(payload, expiresIn = '2h') {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn });
}

function verifySession(token) {
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const token = req.cookies?.gh_session;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const decoded = verifySession(token);
  if (!decoded || decoded.sub !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.user = decoded;
  next();
}

// ---- In-memory memory store (same as before) ----
let memory = { items: [] };

// ---- Routes ----
app.get('/health', (req, res) => {
  res.type('text/plain').send('OK');
});

// Auth routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    if (!ADMIN_PASSWORD_HASH) {
      console.error('[AUTH] ADMIN_PASSWORD_HASH not set');
      return res.status(500).json({ error: 'auth not configured' });
    }
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = signSession({ sub: ADMIN_USERNAME, role: 'admin' }, '2h');
    res.cookie('gh_session', token, { ...cookieOpts, maxAge: 2 * 60 * 60 * 1000 });
    res.json({ ok: true, user: { username: ADMIN_USERNAME, role: 'admin' } });
  } catch (err) {
    console.error('[AUTH] login error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('gh_session', cookieOpts);
  res.json({ ok: true });
});

// Protected test route
app.get('/api/admin/ping', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user, ts: Date.now() });
});

// Respond (OpenAI) — placeholder wiring; keep your existing handler if different
app.post('/api/respond', async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });
    // Your real OpenAI logic should live here (omitted for brevity).
    // This placeholder just echoes.
    res.json({ answer: `You said: ${question}` });
  } catch (err) {
    console.error('[RESPOND] error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Text-to-speech (ElevenLabs) — keep your existing implementation
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    // Implement your real ElevenLabs streaming/forwarding here.
    // Placeholder returns 204 so we don’t break prod if not wired here.
    res.status(204).end();
  } catch (err) {
    console.error('[TTS] error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// Memory API — GET public, POST/DELETE protected
app.get('/api/memory', (req, res) => {
  res.json(memory);
});

app.post('/api/memory', requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  memory.items.push(String(text));
  res.json({ ok: true, items: memory.items });
});

app.delete('/api/memory', requireAuth, (req, res) => {
  memory = { items: [] };
  res.json({ ok: true, items: memory.items });
});

// ---- Static frontend (Vite build) ----
const distPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Almost Human server listening on :${PORT}`);
});

/*
=========================
Env variables to add on Render (Web Service)
=========================
ADMIN_USERNAME=garvan
ADMIN_PASSWORD_HASH= <paste bcrypt hash>
SESSION_SECRET= <strong-random-string>
(keep your existing OPENAI_* and ELEVEN_* vars)

Security defaults:
- Cookie: HttpOnly, Secure (on Render), SameSite=Lax, 2h expiry
- Protected routes: POST/DELETE /api/memory, GET /api/admin/ping
*/
