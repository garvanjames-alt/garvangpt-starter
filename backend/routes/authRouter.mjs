// backend/routes/authRouter.mjs
// Cookie-based admin auth for GarvanGPT / Almost Human
// Routes:
//   POST /api/login  -> sets gh_session cookie
//   GET  /api/admin/ping -> protected health check
//
// This file is ESM.

import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = express.Router();

// --- helpers ---
function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function unbase64url(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  return Buffer.from(input, "base64").toString();
}

function signSession(payloadObj, secret) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifySession(token, secret) {
  if (!token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(unbase64url(payload));
    return obj;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [k, ...v] = part.trim().split("=");
    acc[k] = decodeURIComponent(v.join("="));
    return acc;
  }, {});
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.gh_session;
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: "SESSION_SECRET not set" });
  }
  const session = verifySession(token, secret);
  if (!session?.u) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  req.user = session.u;
  next();
}

// --- routes ---
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "username and password required" });
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;

  if (!adminUser || !adminHash || !secret) {
    return res.status(500).json({ ok: false, error: "Admin env vars not set" });
  }

  if (username !== adminUser) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const ok = await bcrypt.compare(password, adminHash);
  if (!ok) {
    return res.status(401).json({ ok: false, error: "invalid credentials" });
  }

  const payload = { u: username, t: Date.now() };
  const token = signSession(payload, secret);

  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";

  // IMPORTANT:
  // - SameSite=None is REQUIRED for cross-site fetches (frontend on one Render domain,
  //   backend on another Render domain). Lax will NOT send cookies on XHR/fetch.
  // - Secure must be true when SameSite=None.
  res.cookie("gh_session", token, {
    httpOnly: true,
    secure: isProd, // Render is always https in prod
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ ok: true, user: username });
});

router.get("/admin/ping", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user, env: process.env.NODE_ENV || "local" });
});

export default router;
