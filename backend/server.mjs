// backend/server.mjs
// Replacement server file that removes the missing memoryRouter import.
// ESM Node/Express backend for GarvanGPT / Almost Human.

import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- basic paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE = path.join(__dirname, "memory.jsonl");

// --- env ---
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://almosthuman-frontend.onrender.com";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "garvan";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";
const RESPOND_FORCE_DIRECT = process.env.RESPOND_FORCE_DIRECT === "1";

// --- app ---
const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: [FRONTEND_ORIGIN, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(SESSION_SECRET));

// --- helpers ---
function readMemories() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    const lines = fs.readFileSync(MEMORY_FILE, "utf8").split(/\r?\n/).filter(Boolean);
    return lines.map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch (e) {
    console.error("readMemories error", e);
    return [];
  }
}

function appendMemory(text) {
  const item = { id: Date.now().toString(), text, ts: new Date().toISOString() };
  fs.appendFileSync(MEMORY_FILE, JSON.stringify(item) + "\n");
  return item;
}

function clearMemories() {
  fs.writeFileSync(MEMORY_FILE, "");
}

function isAuthed(req) {
  return Boolean(req.signedCookies?.gh_session === "ok");
}

function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: "unauthorized" });
  next();
}

// --- routes ---
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "missing credentials" });

  if (username !== ADMIN_USERNAME) return res.status(401).json({ error: "invalid credentials" });
  if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: "server not configured" });

  const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  res.cookie("gh_session", "ok", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    signed: true,
  });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("gh_session", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/ping", requireAuth, (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Memory CRUD (auth required)
app.get("/api/memory", requireAuth, (_req, res) => {
  res.json({ items: readMemories() });
});

app.post("/api/memory", requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "text required" });
  const item = appendMemory(text.trim());
  res.json({ ok: true, item });
});

app.delete("/api/memory", requireAuth, (_req, res) => {
  clearMemories();
  res.json({ ok: true });
});

// Respond endpoint
app.post("/api/respond", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });

    // Lazy import so deploy doesn't break if file missing for some reason.
    let respondHandler;
    try {
      const mod = await import("./respondHandler.cjs");
      respondHandler = mod?.default || mod?.respond || mod;
    } catch (e) {
      console.error("respondHandler import error", e);
    }

    if (typeof respondHandler !== "function") {
      return res.status(500).json({ error: "respond handler not available" });
    }

    const out = await respondHandler(prompt.trim(), {
      forceDirect: RESPOND_FORCE_DIRECT,
      memories: readMemories(),
    });

    res.json(out);
  } catch (e) {
    console.error("/api/respond error", e);
    res.status(500).json({ error: "respond failed" });
  }
});

// TTS endpoint (if ElevenLabs wired)
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: "text required" });

    let ttsHandler;
    try {
      const mod = await import("./ttsHandler.cjs");
      ttsHandler = mod?.default || mod?.tts || mod;
    } catch (e) {
      console.error("ttsHandler import error", e);
    }

    if (typeof ttsHandler !== "function") {
      return res.status(501).json({ error: "tts not configured" });
    }

    const audioBuffer = await ttsHandler(text.trim());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (e) {
    console.error("/api/tts error", e);
    res.status(500).json({ error: "tts failed" });
  }
});

// --- start ---
app.listen(PORT, () => {
  console.log(`Almost Human backend listening on ${PORT}`);
});
