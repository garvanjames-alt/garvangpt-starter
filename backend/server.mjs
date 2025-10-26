// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

// CORS (reflects the request Origin; fine for our demo)
app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["content-type"],
  })
);

// Body parsers
app.use(express.json());
app.use(express.text({ type: "text/plain" }));

// --- Simple in-memory microstore for /memory ---
let store = [];

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// List memories
app.get("/memory", (req, res) => {
  res.json(store);
});

// Add a memory (accepts {text} as JSON or raw text/plain)
app.post("/memory", (req, res) => {
  const text =
    (typeof req.body === "string" ? req.body : req.body?.text) || "";
  const t = `${text}`.trim();
  if (!t) return res.status(400).json({ error: "text is required" });

  const item = { id: Date.now(), ts: new Date().toISOString(), text: t };
  store.push(item);
  res.json(item);
});

// Clear memories
app.delete("/memory", (req, res) => {
  store = [];
  res.json({ ok: true });
});

// --- NEW: /ask endpoint the frontend calls ---
app.post("/ask", (req, res) => {
  // Accept { question } JSON, or { text }, or raw text
  const q =
    (typeof req.body === "string"
      ? req.body
      : req.body?.question ?? req.body?.text) || "";
  const question = `${q}`.trim();

  if (!question) return res.status(400).json({ error: "question is required" });

  // Stubbed answer for now
  const answer = `You asked: "${question}". This is a stub reply from the backend.`;

  res.json({
    answer,
    sources: [], // placeholder so the UI can later show citations
  });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
