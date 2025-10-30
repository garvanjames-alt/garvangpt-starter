// backend/server.mjs — GarvanGPT (CORS-tight, simplified)
// ESM Node 18+ required

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------
// Config
// ---------------------------
const PORT = process.env.PORT || 3001;

// Comma-separated allowlist; default allows local and Netlify prod
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://garvangpt.netlify.app"
).split(",").map(s => s.trim());

// SIMPLIFIED CORS: let the library handle the array
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ---------------------------
// App
// ---------------------------
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Simple JSON logger
app.use((req, _res, next) => {
  console.log(JSON.stringify({
    t: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
  }));
  next();
});

// ---------------------------
// Memory store (demo)
// ---------------------------
const memoryPath = path.join(__dirname, "data", "memory.jsonl");
let memory = [];
try {
  if (fs.existsSync(memoryPath)) {
    const lines = fs.readFileSync(memoryPath, "utf8").split(/\r?\n/).filter(Boolean);
    memory = lines.map(l => ({ text: JSON.parse(l).text ?? String(l).trim(), t: Date.now() }));
    console.log(`[memory] seeded ${memory.length} items from data/memory.jsonl`);
  }
} catch (e) {
  console.warn("[memory] seed load failed:", e?.message);
}

// GET: list
app.get("/api/memory", (_req, res) => {
  res.json({ items: memory });
});

// POST: add {text}
app.post("/api/memory", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Missing text" });
  const item = { text, t: Date.now() };
  memory.unshift(item);
  return res.json({ ok: true, item });
});

// DELETE: clear
app.delete("/api/memory", (_req, res) => {
  memory = [];
  res.json({ ok: true });
});

// ---------------------------
// Health
// ---------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), uptime: process.uptime() });
});

// ---------------------------
// Respond (dev shim)
// ---------------------------
app.post("/respond", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "Missing text" });

    // Dev shim response with markdown + example sources/memories
    const sources = Array.from({ length: 10 }, (_, i) => `ingest/pdfs/25071900000128283.pdf#page=${9 + i}`);
    const memories = memory.slice(0, 5).map(m => m.text);

    const markdown = [
      `## Here’s what I found`,
      `- Echo (dev shim): ${text}`,
      `\n## Summary (non-diagnostic)`,
      `This is an informational summary and **not** a diagnosis. Consult a licensed clinician.`,
      `\n## Sources used`,
      ...sources.map((s, i) => `${i + 1}. ${s}`),
      `\n## Memories referenced`,
      ...(memories.length ? memories.map((m, i) => `${i + 1}. ${m}`) : ["(none)"]),
    ].join("\n");

    res.json({ markdown, sources, memories });
  } catch (e) {
    console.error("/respond error", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// ---------------------------
// Error handler
// ---------------------------
app.use((err, _req, res, _next) => {
  console.error("[error]", err?.message || err);
  if (String(err?.message || "").includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked" });
  }
  res.status(500).json({ error: "Server error" });
});

// ---------------------------
// Listen
// ---------------------------
app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
