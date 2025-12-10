// backend/routes/authRouter.mjs
import express from "express";
import crypto from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Optional bcrypt if you already have it installed.
// We try bcryptjs first, then bcrypt. If neither is installed,
// we fall back to plain-text ADMIN_PASSWORD comparison.
let bcrypt = null;
try { bcrypt = require("bcryptjs"); } catch {}
if (!bcrypt) {
  try { bcrypt = require("bcrypt"); } catch {}
}

const router = express.Router();

// ------------------------------------------------------------------
// Signed cookie session (no external deps)
// Cookie value: base64(payload).hex(hmac)
// payload = { u: username, t: unix_ms }
// ------------------------------------------------------------------
const COOKIE_NAME = "gh_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

function signPayload(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifySignedCookie(cookieVal) {
  if (!cookieVal || typeof cookieVal !== "string") return null;
  const [payload, sig] = cookieVal.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return obj;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const parts = raw.split(";").map(p => p.trim());
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function requireAuth(req, res, next) {
  const c = getCookie(req, COOKIE_NAME);
  const session = verifySignedCookie(c);
  if (!session?.u) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  req.user = session.u;
  next();
}

// ------------------------------------------------------------------
// POST /api/login
// body: { username, password }
// env:
//   ADMIN_USERNAME
//   ADMIN_PASSWORD_HASH (bcrypt hash)  OR  ADMIN_PASSWORD (plain)
// ------------------------------------------------------------------
router.post("/api/login", express.json(), async (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.ADMIN_USERNAME || "garvan";
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "username and password required" });
  }
  if (username !== adminUser) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  let passOk = false;
  if (hash && bcrypt) {
    passOk = await bcrypt.compare(password, hash);
  } else if (plain) {
    passOk = password === plain;
  } else {
    // No password configured server-side
    return res.status(500).json({
      ok: false,
      error: "No ADMIN_PASSWORD_HASH or ADMIN_PASSWORD set on server"
    });
  }

  if (!passOk) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const token = signPayload({ u: adminUser, t: Date.now() });

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
  res.json({ ok: true, user: adminUser });
});

// POST /api/logout
router.post("/api/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
  res.json({ ok: true });
});

// GET /api/admin/ping  (protected)
router.get("/api/admin/ping", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export default router;
export { requireAuth };
