// server.mjs
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Allow your local dev and any *.onrender.com origins
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // permissive; tighten later if you like
    methods: ["GET", "POST", "DELETE"],
  })
);

// --- simple JSONL storage ---
const MEMO_FILE = path.join(__dirname, "backend", "memory.jsonl");

function ensureFile() {
  if (!fs.existsSync(MEMO_FILE)) {
    fs.mkdirSync(path.dirname(MEMO_FILE), { recursive: true });
    fs.writeFileSync(MEMO_FILE, "", "utf8");
  }
}
function readAll() {
  ensureFile();
  const raw = fs.readFileSync(MEMO_FILE, "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
function appendItem(obj) {
  ensureFile();
  fs.appendFileSync(MEMO_FILE, JSON.stringify(obj) + "\n", "utf8");
}
function clearAll() {
  ensureFile();
  fs.writeFileSync(MEMO_FILE, "", "utf8");
}

// --- routes ---
app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// IMPORTANT: return a plain array so the frontend can JSON.parse into mem[]
app.get("/memory", (_req, res) => {
  res.json(readAll());
});

app.post("/memory", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  const item = { id: Date.now(), ts: new Date().toISOString(), text };
  appendItem(item);
  res.json({ ok: true, item });
});

app.delete("/memory", (_req, res) => {
  clearAll();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
