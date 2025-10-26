import express from "express";
import cors from "cors";

const app = express();

// parse JSON bodies (needed for POST /api/memory)
app.use(express.json());

// Allow list from env (comma-separated)
const allowed = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// CORS middleware
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl / health checks (no Origin header)
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Explicitly handle preflight
app.options("*", cors());

// ---- Health check (Render & manual tests) ----
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// ---- Phase 0 memory routes (in-memory store) ----
let MEMORY = [];

app.get("/api/memory", (req, res) => {
  res.json({ items: MEMORY });
});

app.post("/api/memory", (req, res) => {
  const text = (req.body && req.body.text) ? String(req.body.text) : "";
  if (!text.trim()) return res.status(400).json({ error: "text is required" });
  const item = { text, ts: Date.now() };
  MEMORY.push(item);
  res.status(201).json(item);
});

app.delete("/api/memory", (req, res) => {
  MEMORY = [];
  res.json({ ok: true });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[API] listening on :${PORT}`));
