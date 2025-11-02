// backend/server.mjs — FULL FILE (Step 85: Simple Auth, static path fix)
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY || '';
const ELEVEN_MODEL = process.env.ELEVEN_MODEL || 'eleven_turbo_v2_5';
const ELEVEN_VOICE = process.env.ELEVEN_VOICE || '';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

if (!SESSION_SECRET) {
  console.warn('[WARN] SESSION_SECRET is not set. Set a strong random string in env.');
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

if (ALLOWED_ORIGINS.length > 0) {
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS not allowed'));
      },
      credentials: true,
    })
  );
}

const isProd = NODE_ENV === 'production';
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' };

function signSession(payload, expiresIn = '2h') {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn });
}
function verifySession(token) {
  try { return jwt.verify(token, SESSION_SECRET); } catch { return null; }
}
function requireAuth(req, res, next) {
  const token = req.cookies?.gh_session;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const decoded = verifySession(token);
  if (!decoded || decoded.sub !== ADMIN_USERNAME) return res.status(401).json({ error: 'unauthorized' });
  req.user = decoded; next();
}

let memory = { items: [] };

app.get('/health', (req, res) => { res.type('text/plain').send('OK'); });

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    if (username !== ADMIN_USERNAME) return res.status(401).json({ error: 'invalid credentials' });
    if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: 'auth not configured' });
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = signSession({ sub: ADMIN_USERNAME, role: 'admin' }, '2h');
    res.cookie('gh_session', token, { ...cookieOpts, maxAge: 2 * 60 * 60 * 1000 });
    res.json({ ok: true, user: { username: ADMIN_USERNAME, role: 'admin' } });
  } catch (e) {
    console.error('[AUTH] login error', e); res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/logout', (req, res) => { res.clearCookie('gh_session', cookieOpts); res.json({ ok: true }); });

app.get('/api/admin/ping', requireAuth, (req, res) => { res.json({ ok: true, user: req.user, ts: Date.now() }); });

app.post('/api/respond', async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });
    res.json({ answer: `You said: ${question}` });
  } catch (e) { console.error('[RESPOND] error', e); res.status(500).json({ error: 'internal error' }); }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    res.status(204).end();
  } catch (e) { console.error('[TTS] error', e); res.status(500).json({ error: 'internal error' }); }
});

app.get('/api/memory', (req, res) => { res.json(memory); });
app.post('/api/memory', requireAuth, (req, res) => {
  const { text } = req.body || {}; if (!text) return res.status(400).json({ error: 'text required' });
  memory.items.push(String(text)); res.json({ ok: true, items: memory.items });
});
app.delete('/api/memory', requireAuth, (req, res) => { memory = { items: [] }; res.json({ ok: true, items: memory.items }); });

// ---- Static frontend (Vite build) ----
// frontend/ is a sibling of backend/, so go up one level
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));

// SPA fallback for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => { console.log(`Almost Human server listening on :${PORT}`); });
