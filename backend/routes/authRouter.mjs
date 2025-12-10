// backend/routes/authRouter.mjs
// Cookie-based admin auth for GarvanGPT / Almost Human
// Mounted in server.mjs at app.use("/api", authRouter)
// So routes here must NOT include the /api prefix.

import express from "express";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const router = express.Router();
router.use(cookieParser());

const COOKIE_NAME = "gh_session";
const ONE_WEEK_S = 60 * 60 * 24 * 7;

function cookieOptions() {
  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  return {
    httpOnly: true,
    secure: isProd,       // must be true for SameSite=None
    sameSite: isProd ? "none" : "lax",
    maxAge: ONE_WEEK_S * 1000,
    path: "/",
  };
}

function signSession(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET missing");
  return jwt.sign(payload, secret, { expiresIn: ONE_WEEK_S });
}

function verifySession(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET missing");
  return jwt.verify(token, secret);
}

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ ok: false, error: "unauthorized" });
    const decoded = verifySession(token);
    req.user = decoded?.u;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
}

// POST /api/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "username and password required" });
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminUser || !adminHash) {
    return res.status(500).json({ ok: false, error: "admin env not set" });
  }

  if (username !== adminUser) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const ok = await bcrypt.compare(password, adminHash);
  if (!ok) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const token = signSession({ u: username, t: Date.now() });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return res.json({ ok: true, user: username });
});

// POST /api/logout
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// GET /api/admin/ping  (auth required)
router.get("/admin/ping", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user || null, env: process.env.NODE_ENV || "local" });
});

export default router;
