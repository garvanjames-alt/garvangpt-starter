// backend/server.mjs
import express from "express";
import cors from "cors";
import OpenAI from "openai";

// --- Config ---------------------------------------------------
const app = express();
const PORT = process.env.PORT || 10000;

// Allow your Render frontend and local dev
const allowlist = [
  process.env.FRONTEND_ORIGIN,               // e.g. https://garvangpt-frontend.onrender.com
  "http://localhost:5173",                   // Vite dev
  "https://garvangpt-frontend.onrender.com", // safety net
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl / health checks etc.
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// OpenAI client (used by /ask)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- In-memory store (demo only) -------------------------------
let memories = []; // [{ id, ts, text }]

// --- Routes ----------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Memory: list
app.get("/memory", (_req, res) => {
  res.json(memories);
});

// Memory: add one
app.post("/memory", (req, res) => {
  const text = (req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "Missing text" });

  const item = { id: Date.now(), ts: new Date().toISOString(), text };
  memories.push(item);
  res.json({ ok: true, item });
});

// Memory: clear all
app.delete("/memory", (_req, res) => {
  const count = memories.length;
  memories = [];
  res.json({ ok: true, cleared: count });
});

// Ask: call OpenAI
app.post("/ask", async (req, res) => {
  try {
    const prompt = (req.body?.prompt ?? "").trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "Server is missing OPENAI_API_KEY" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() || "No answer.";
    res.json({ ok: true, answer });
  } catch (err) {
    console.error("ASK error:", err);
    res.status(500).json({ error: "Ask failed." });
  }
});

// --- Start -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
