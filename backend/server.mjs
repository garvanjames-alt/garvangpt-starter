// backend/server.mjs
import express from "express";
import cors from "cors";

// --- Config -------------------------------------------------
const PORT = process.env.PORT || 10000;

// Allow-list CORS from env `CORS_ORIGINS` (comma-separated) or allow all in dev
const allowlist = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // no Origin (e.g., curl) -> allow
    if (!origin) return cb(null, true);
    if (allowlist.length === 0) return cb(null, true);
    if (allowlist.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// --- App ----------------------------------------------------
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// --- Simple in-memory store for demo -----------------------
let items = []; // { text, ts }

// --- Health -------------------------------------------------
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// --- Memory API --------------------------------------------
// List memories
app.get("/memory", (req, res) => {
  res.json({ ok: true, items });
});

// Add a memory
app.post("/memory", (req, res) => {
  const text = (req.body && req.body.text ? String(req.body.text) : "").trim();
  if (!text) return res.status(400).json({ ok: false, error: "missing_text" });

  const item = { text, ts: Date.now() };
  items = [item, ...items].slice(0, 100); // keep it tidy
  res.json({ ok: true, item });
});

// Clear memories
app.delete("/memory", (_req, res) => {
  items = [];
  res.json({ ok: true });
});

// --- Prototype brain endpoint ------------------------------
// Keep a lightweight echo so the route is always live.
// (If you already wired OpenAI before, you can keep that code;
// this echo ensures the route won’t crash when key/env differs.)
app.post("/api/respond", async (req, res) => {
  try {
    const prompt = (req.body && req.body.prompt ? String(req.body.prompt) : "").trim();
    const reply = prompt ? `You said: "${prompt}"` : "(no reply)";
    return res.json({ ok: true, reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// --- Start --------------------------------------------------
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});
