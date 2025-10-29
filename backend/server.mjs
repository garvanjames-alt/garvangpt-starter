// backend/server.mjs — Express server for Almost Human (GarvanGPT)
// Drop-in replacement that enables CORS for the Vite dev app (5173)
// and provides the required endpoints:
//   GET  /health                   -> { ok: true, ts }
//   GET  /api/memory               -> { items: string[] }
//   POST /api/memory { text }      -> { ok: true }
//   DELETE /api/memory             -> { ok: true }
//   POST /respond { prompt }       -> { text }
//
// Notes:
// - Persists memories to ./data/memory.json (creates file if missing)
// - Tries to use ./respondHandler.cjs if present; otherwise echoes the prompt

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

// --- App & middleware ---
const app = express();

// Allow local dev app on Vite to call this API directly
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow curl/Postman
      if (ALLOWED_ORIGINS.includes(origin) || DEFAULT_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: false,
  })
);

app.use(express.json({ limit: "1mb" }));

// --- Simple health check ---
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// --- Memory store (persisted) ---
const dataDir = path.join(__dirname, "..", "data");
const memoryFile = path.join(dataDir, "memory.json");

function readMemories() {
  try {
    if (!fs.existsSync(memoryFile)) return [];
    const raw = fs.readFileSync(memoryFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (e) {
    console.error("Failed to read memories:", e);
    return [];
  }
}

function writeMemories(items) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(memoryFile, JSON.stringify({ items }, null, 2));
  } catch (e) {
    console.error("Failed to write memories:", e);
  }
}

app.get("/api/memory", (_req, res) => {
  const items = readMemories();
  res.json({ items });
});

app.post("/api/memory", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "`text` is required" });
  const items = readMemories();
  items.push(text);
  writeMemories(items);
  res.json({ ok: true });
});

app.delete("/api/memory", (_req, res) => {
  writeMemories([]);
  res.json({ ok: true });
});

// --- /respond ---
let externalRespondHandler = null;
try {
  // If the project provides a custom handler, use it
  externalRespondHandler = require("./respondHandler.cjs");
  if (externalRespondHandler && typeof externalRespondHandler !== "function") {
    externalRespondHandler = externalRespondHandler.default || externalRespondHandler.handler;
  }
} catch (_) {
  // optional
}

app.post("/respond", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "`prompt` is required" });

  try {
    if (typeof externalRespondHandler === "function") {
      return externalRespondHandler(req, res);
    }
    // Fallback: echo-style response
    return res.json({ text: `You said: ${prompt}` });
  } catch (err) {
    console.error("/respond failed:", err);
    return res.status(500).json({ error: "Respond failed" });
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Almost Human backend listening on :${PORT}`);
});
