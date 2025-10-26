// backend/server.mjs
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI || process.env.OPENAI_API;
if (!OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY is not set; /api/respond will return 500.");
}

// Allow multiple origins via CORS_ORIGINS="https://site, http://localhost:5173, http://localhost:5174"
const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origins.length === 0 || origins.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// --- Health ---
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// --- Simple JSON memory (keeps your existing demo working) ---
const dataDir = path.join(__dirname, "..", "data");
const memFile = path.join(dataDir, "memory.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(memFile)) fs.writeFileSync(memFile, JSON.stringify({ items: [] }, null, 2), "utf8");

function readMem() {
  try {
    const raw = fs.readFileSync(memFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}
function writeMem(obj) {
  fs.writeFileSync(memFile, JSON.stringify(obj, null, 2), "utf8");
}

app.get("/api/memory", (req, res) => {
  res.json(readMem());
});

app.post("/api/memory", (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ ok: false, error: "text required" });
  const db = readMem();
  db.items.push({ text, ts: Date.now() });
  writeMem(db);
  res.json({ ok: true });
});

app.delete("/api/memory", (req, res) => {
  writeMem({ items: [] });
  res.json({ ok: true });
});

// --- NEW: /api/respond (LLM brain) ---
app.post("/api/respond", async (req, res) => {
  try {
    const { text, persona = "You are a concise, friendly speaking avatar for the Almost Human prototype." } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text required" });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "OPENAI_API_KEY not configured" });
    }

    // Chat Completions (non-streaming) – simple and cheap
    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${persona} Keep replies natural and speakable. Use 1–2 short sentences.` },
        { role: "user", content: text }
      ],
      temperature: 0.6,
      max_tokens: 180
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const e = await r.text().catch(() => "");
      return res.status(502).json({ ok: false, error: "upstream_error", detail: e });
    }
    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content?.trim() || "(no reply)";
    return res.json({ ok: true, reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});
