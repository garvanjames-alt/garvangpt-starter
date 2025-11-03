// backend/authRouter.mjs
import express from "express";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";

const router = express.Router();
router.use(cookieParser());

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "garvan";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";

// verify cookie middleware
function verifySession(req, res, next) {
  const token = req.cookies?.gh_session;
  if (token !== SESSION_SECRET) return res.status(401).json({ error: "unauthorized" });
  next();
}

// POST /api/login  -> set cookie
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME) return res.status(401).json({ error: "invalid username" });
  const ok = await bcrypt.compare(password || "", ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "invalid password" });

  res.cookie("gh_session", SESSION_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  });
  res.json({ ok: true, user: { username, role: "admin" } });
});

// GET /api/admin/ping  -> auth check
router.get("/admin/ping", verifySession, (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "staging" });
});

export default router;
