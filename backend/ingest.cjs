// backend/ingest.cjs
// Minimal API for GarvanGPT — Pharmacist
// Adds session-scoped memory and injects it into the prompt for /ask

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// --- OpenAI (Node SDK) ---
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- App setup ---
const app = express();
app.use(cors());
app.use(express.json());

// --- In-memory store: sessionId -> [{ type, text, ts }]
// Note: process memory only (good for dev). We'll swap later for a DB.
const MEM = new Map();
const now = () => Date.now();

function getSessionId(req) {
  // UI sends nothing; curl examples pass X-Session-ID
  // We also allow ?session=... for quick tests.
  return (
    (req.headers["x-session-id"] || "").toString().trim() ||
    (req.query.session || "").toString().trim() ||
    "default"
  );
}

function listMemory(sessionId) {
  return MEM.get(sessionId) || [];
}
function saveMemory(sessionId, items) {
  const arr = MEM.get(sessionId) || [];
  for (const it of items) {
    if (!it || !it.text) continue;
    arr.push({
      type: (it.type || "note").toString(),
      text: it.text.toString(),
      ts: it.ts || now(),
    });
  }
  MEM.set(sessionId, arr);
  return arr.length;
}

// --- Health ---
app.get("/health", (_req, res) => {
  res.json({ ok: true, body: "ok" });
});

// --- Memory: save ---
app.post("/memory/save", (req, res) => {
  const sessionId = getSessionId(req);
  const body = req.body || {};
  const items = Array.isArray(body) ? body : [body];
  const count = saveMemory(sessionId, items);
  res.json({ ok: true, saved: items.filter(i => i && i.text).length, session: sessionId, count });
});

// --- Memory: status (count only) ---
app.get("/memory/status", (req, res) => {
  const sessionId = getSessionId(req);
  res.json({ ok: true, session: sessionId, count: listMemory(sessionId).length });
});

// --- Memory: list (all items) ---
app.get("/memory/list", (req, res) => {
  const sessionId = getSessionId(req);
  res.json({ ok: true, session: sessionId, items: listMemory(sessionId) });
});

// --- Ask: include session memory in the prompt ---
app.post("/ask", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    // Frontend sends { question }
    const question = (req.body && req.body.question ? String(req.body.question) : "").trim();
    if (!question) {
      return res.status(400).json({ error: "Missing 'question' in JSON body." });
    }

    const memoryItems = listMemory(sessionId);
    const memoryBlock =
      memoryItems.length === 0
        ? "No saved notes for this session."
        : `Saved session notes (treat as user-provided facts; prefer them when relevant):\n` +
          memoryItems.map((m, i) => `- (${i + 1}) [${m.type}] ${m.text}`).join("\n");

    const systemPrompt = `
You are GarvanGPT — a cautious, concise pharmacist assistant.
Only give general information, not personal medical advice.
Always include safety cautions when appropriate.
Use the session notes below if relevant; they are trusted, user-provided facts.

${memoryBlock}
`.trim();

    // Call the model
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0.2,
    });

    const answer =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a response.";

    res.json({ answer, usedSessionId: sessionId });
  } catch (err) {
    console.error("ASK_ERROR:", err?.response?.data || err);
    res.status(500).json({ error: "Failed to generate answer." });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
