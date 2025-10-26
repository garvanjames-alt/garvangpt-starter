import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// CORS: allow local dev + your Render Static Site (set later)
const allowed = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map(s=>s.trim());
app.use(cors({
  origin(origin, cb) {
    // allow tools/no-origin and exact allowlist
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// --- Health check ---
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "almosthuman-starter", ts: new Date().toISOString() });
});

// --- Memory API (alias /api/memory and /memory)
let MEMORY = [];
app.get(["/api/memory", "/memory"], (req, res) => {
  res.json({ items: MEMORY });
});
app.post(["/api/memory", "/memory"], (req, res) => {
  const text = (req.body && req.body.text) ? String(req.body.text) : "";
  if (!text.trim()) return res.status(400).json({ error: "text is required" });
  const item = { text, ts: Date.now() };
  MEMORY.push(item);
  res.status(201).json(item);
});
app.delete(["/api/memory", "/memory"], (req, res) => {
  MEMORY = [];
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[API] listening on :${PORT}`));