// backend/server.mjs
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3001;

// Allow your deployed frontend
const FRONTEND_ORIGIN = "https://garvangpt-frontend.onrender.com";

app.use(cors({
  origin: FRONTEND_ORIGIN,               // tighten to your static site
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ---- simple file-backed memory store (lives in backend/) ----
const DATA_FILE = path.join(process.cwd(), "backend", "memory.jsonl");

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return raw.split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function append(item) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.appendFileSync(DATA_FILE, JSON.stringify(item) + "\n", "utf8");
}

function clearAll() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, "", "utf8");
}

// ---- routes ----
app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// GET returns a **plain array** so the frontend can setMem([...])
app.get("/memory", (_req, res) => res.json(readAll()));

app.post("/memory", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  const item = { id: Date.now(), ts: new Date().toISOString(), text };
  append(item);
  res.json({ ok: true, item });
});

app.delete("/memory", (_req, res) => {
  clearAll();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
