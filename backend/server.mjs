import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import respondHandler from './respondHandler.cjs';
import memoryRouter from './memoryRouter.mjs';
import 'dotenv/config';

// ---- Env ----
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'garvan';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

// ---- App ----
const app = express();
app.set('trust proxy', 1); // required for secure cookies on Render behind proxy
app.use(express.json());
app.use(cookieParser());

// CORS: allow frontend origins + local dev
const FRONTENDS = [
  'https://almosthuman-frontend.onrender.com',
  'https://garvangpt-starter-2.onrender.com', // static smoke page if ever used
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / same-origin
      if (FRONTENDS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
  })
);

// ---- Rate limiting ----
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- Helpers ----
function sign(user) {
  return jwt.sign(user, SESSION_SECRET, { expiresIn: '2h' });
}
function readToken(req) {
  // cookie name: gh_session
  return req.cookies?.gh_session || null;
}

// ---- Health ----
app.get('/health', (_req, res) => res.type('text').send('OK'));

// ---- Auth ----
app.post('/api/login', strictLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'missing credentials' });
    }
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    if (!ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ error: 'server missing ADMIN_PASSWORD_HASH' });
    }
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = sign({ sub: username, role: 'admin' });
    // IMPORTANT: SameSite=None + Secure for cross-site cookie from frontend → backend
    res.cookie('gh_session', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 2 * 60 * 60 * 1000, // 2h
    });
    return res.json({ ok: true, user: { username, role: 'admin' } });
  } catch (e) {
    console.error('login error', e);
    return res.status(500).json({ error: 'login_failed' });
  }
});

app.get('/api/admin/ping', strictLimiter, (req, res) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    return res.json({ ok: true, user: decoded, ts: Date.now() });
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }
});

// ---- Feature routes ----
app.use('/api/memory', strictLimiter, memoryRouter);
app.use('/api/respond', strictLimiter, respondHandler);

// ---- Start ----
app.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
