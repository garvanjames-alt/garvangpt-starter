import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// CORS allowlist (comma-separated)
const allowed = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// --- Health check ---
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// --- Simple in-memory store for Phase 0 ---
let MEMORY = [];

// List memories
app.get(["/api/memory", "/memory"], (req, res) => {
  res.json({ items: MEMORY });
});

// Add a memory (POST {text})
app.post(["/api/memory", "/memory"], (req, res) => {
  const text = (req.body && req.body.text) ? String(req.body.text) : "";
  if (!text.trim()) return res.status(400).json({ error: "text is required" });
  const item = { text, ts: Date.now() };
  MEMORY.push(item);
  res.status(201).json(item);
});

// Quick add via URL: /api/memory/add?text=Hello
app.get("/api/memory/add", (req, res) => {
  const text = String(req.query.text || "");
  if (!text.trim()) return res.status(400).json({ error: "text is required" });
  const item = { text, ts: Date.now() };
  MEMORY.push(item);
  res.status(201).json(item);
});

// Clear memories
app.delete(["/api/memory", "/memory"], (req, res) => {
  MEMORY = [];
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[API] listening on :${PORT}`));
