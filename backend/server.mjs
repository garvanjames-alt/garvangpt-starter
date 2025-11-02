// backend/server.mjs
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ESM import of CJS module → import the package and destructure
import respondPkg from "./respondHandler.cjs";
const { respondHandler } = respondPkg;

// ESM router
import { memoryRouter } from "./memoryRouter.mjs";

dotenv.config();

const app  = express();
const port = process.env.PORT || 10000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/health", (_req, res) => res.send("OK"));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Stricter limit for “expensive” endpoints
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please slow down." },
});

// --- Auth helpers ---
function signSession(username) {
  const token = jwt.sign({ sub: username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2h" });
  return token;
}
function readToken(req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  return req.cookies.gh_session || bearer || "";
}

// Login (expects ADMIN_USER and ADMIN_PASSWORD_HASH in env)
app.post("/api/login", strictLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "missing credentials" });

  const expectedUser  = process.env.ADMIN_USER || "garvan";
  const passwordHash  = process.env.ADMIN_PASSWORD_HASH || "";

  const okUser  = username === expectedUser;
  const okPass  = passwordHash ? await bcrypt.compare(password, passwordHash) : false;

  if (!okUser || !okPass) return res.status(401).json({ error: "invalid credentials" });

  const token = signSession(username);
  res.cookie("gh_session", token, {
    httpOnly: false, // matches your earlier browser usage & curl cookie flow
    sameSite: "lax",
    secure: true,
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.json({ ok: true, user: { username, role: "admin" } });
});

// Admin ping (auth via cookie or bearer)
app.get("/api/admin/ping", (req, res) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ ok: true, user: decoded, ts: Date.now() });
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
});

// Routes
app.use("/api/respond", strictLimiter, respondHandler); // function handler
app.use("/api/memory",  strictLimiter, memoryRouter);   // ESM Router

app.listen(port, () => {
  console.log(`Almost Human server listening on :${port}`);
});
