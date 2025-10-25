import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

// Allow your deployed frontend origin
const FRONTEND_ORIGIN = "https://garvangpt-frontend.onrender.com";

app.use(cors({
  origin: FRONTEND_ORIGIN, // strictly allow your static site
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false
}));

// Parse JSON request bodies
app.use(express.json());

// --- simple file-backed memory store ---
const DATA_FILE = path.join(process.cwd(), "backend", "memory.jsonl");

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const lines = fs.readFileSync(DATA_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(l => JSON.parse(l));
  return lines;
}

function append(item) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.appendFileSync(DATA_FILE, JSON.stringify(item) + "\n");
}

function clearAll() {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
}

// --- routes ---
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get("/memory", (req, res) => {
  res.json(readAll()); // return an array
});

app.post("/memory", (req, res) => {
  const text = (req.body && req.body.text || "").trim();
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
  console.log(`Server listening on ${PORT}`);
});
