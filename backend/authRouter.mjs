// backend/authRouter.mjs
import express from "express";
import bcrypt from "bcryptjs";

// Expect these in Render > Environment for the backend service
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "garvan";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ""; // bcrypt hash
const SESSION_SECRET = process.env.SESSION_SECRET || ""; // any long random string

const router = express.Router();

/** Simple cookie-based session gate */
function verifySession(req, res, next) {
  const cookieVal = req.cookies?.gh_session || "";
  if (!cookieVal || cookieVal !== SESSION_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

/** POST /api/login  → sets gh_session cookie if creds valid */
router.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: "invalid username" });
    }
    const ok = await bcrypt.compare(password || "", ADMIN_PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ error: "invalid password" });
    }

    // Cookie good for browser→Render HTTPS with CORS
    res.cookie("gh_session", SESSION_SECRET, {
      httpOnly: true,
      secure: true,         // required on Render HTTPS
      sameSite: "None",     // required for cross-site cookies
      path: "/",            // send everywhere on this origin
    });

    res.json({ ok: true, user: { username, role: "admin" } });
  } catch (e) {
    res.status(500).json({ error: "login failed" });
  }
});

/** GET /api/admin/ping  → protected “am I logged in?” check */
router.get("/api/admin/ping", verifySession, (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "staging" });
});

export default router;
