// backend/index.cjs
// GarvanGPT — Almost Human (MVP backend)
// Express API + simple RAG (embeddings + cosine) with Top-K control.

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const OpenAI = require("openai");

// ---------- Config ----------
const PORT = process.env.PORT || 3001;
const MODEL = process.env.MODEL || "gpt-4o-mini";
const EMB_MODEL = process.env.EMB_MODEL || "text-embedding-3-small";
const MEMORY_PATH = path.join(__dirname, "memory.jsonl");

// ---------- OpenAI ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Helpers ----------
function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(text) {
  const res = await openai.embeddings.create({
    model: EMB_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

function nowTs() {
  return Date.now().toString();
}

// ---------- Memory Store ----------
let MEMORY = [];
function loadMemoryFromDisk() {
  MEMORY = [];
  if (!fs.existsSync(MEMORY_PATH)) return;
  const lines = fs.readFileSync(MEMORY_PATH, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    const rec = safeParse(line);
    if (rec && rec.id && typeof rec.text === "string") MEMORY.push(rec);
  }
}
function appendMemoryToDisk(rec) {
  fs.appendFileSync(MEMORY_PATH, JSON.stringify(rec) + "\n");
}

// Initial load
loadMemoryFromDisk();

// ---------- Express ----------
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// ---------- Routes ----------
app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, service: "GarvanGPT", ts: Date.now() });
});

// GET memories
app.get(["/api/memory", "/memory"], (req, res) => {
  res.set("Cache-Control", "no-store");
  // Only send id/text (embeddings stay server-side)
  res.json({
    items: MEMORY.map((m) => ({ id: m.id, text: m.text, ts: m.ts })),
  });
});

// POST memory
app.post(["/api/memory", "/memory"], async (req, res) => {
  try {
    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ error: "missing text" });

    const rec = {
      id: nowTs(),
      text,
      ts: Date.now(),
    };

    // Compute embedding so it’s immediately retrievable
    try {
      rec.embedding = await embed(text);
    } catch (e) {
      // If embedding fails, still save; retrieval will skip non-embedded records
      console.error("Embedding failed for new memory:", e?.message || e);
    }

    MEMORY.push(rec);
    appendMemoryToDisk(rec);

    res.json({ id: rec.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to add memory" });
  }
});

// DELETE memories
app.delete(["/api/memory", "/memory"], (req, res) => {
  try {
    fs.writeFileSync(MEMORY_PATH, "");
    MEMORY = [];
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to clear memory" });
  }
});

// POST respond (RAG v2 with Top-K and used_details)
app.post(["/api/respond", "/respond"], async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "missing prompt" });

    // 1) Embed the user query
    const qVec = await embed(prompt);

    // 2) Score each embedded memory by cosine similarity
    const scored = [];
    for (const m of MEMORY) {
      if (Array.isArray(m.embedding)) {
        scored.push({ m, score: cosine(qVec, m.embedding) });
      }
    }
    scored.sort((a, b) => b.score - a.score);

    // 3) Top-K slicing (default 4, min 1, max 8)
    const topK = Math.max(1, Math.min(Number(req.body?.top_k) || 4, 8));
    const top = scored.slice(0, topK);

    const used = top.map((s) => s.m);
    const usedDetails = top.map((s) => ({
      id: s.m.id,
      text: s.m.text,
      score: s.score,
    }));

    // 4) Build the chat prompt with the retrieved snippets
    const contextBlock =
      used.length > 0
        ? `Relevant memory snippets:\n${used
            .map((u) => `- (${u.id}) ${u.text}`)
            .join("\n")}\n\n`
        : "";

    const system =
      "You are GarvanGPT (Pharmacist and AI Health Educator). " +
      "Be concise, friendly, and evidence-aware. Do not diagnose or provide personalized medical advice. " +
      "Encourage professional care for red flags. Where helpful, explain trade-offs and uncertainty. " +
      "Tone: clear, kind, and pragmatic.";

    const userMsg =
      contextBlock +
      "Using the relevant snippets (if any), answer the user's request clearly and briefly.\n\n" +
      `User question: ${prompt}`;

    // 5) Call the model
    const out = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    });

    const answer = (out.choices?.[0]?.message?.content || "—").trim();

    // Optionally log for debugging
    console.log(
      "[retriever]",
      prompt,
      "->",
      usedDetails.map((u) => `${u.id}:${u.score.toFixed(3)}`).join(", ")
    );
    console.log(
      "[respond] used_memories =",
      used.map((u) => u.id)
    );

    // 6) Return answer + used ids + scored details
    res.json({
      answer,
      used_memories: used.map((u) => u.id),
      used_details: usedDetails, // [{id,text,score}]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to respond" });
  }
});

// ---------- Startup ----------
app.listen(PORT, () => {
  console.log("✅ Registered routes:");
  console.log("  GET    /health");
  console.log("  GET    /api/memory   (alias: /memory)");
  console.log("  POST   /api/memory   (alias: /memory)");
  console.log("  DELETE /api/memory   (alias: /memory)");
  console.log("  POST   /api/respond  (alias: /respond)");
  console.log();
  console.log(`GarvanGPT backend running at http://localhost:${PORT}`);
  console.log(`Persona model: ${MODEL}`);
  console.log(`Embedding model: ${EMB_MODEL}`);
  console.log(`Loaded ${MEMORY.length} record(s) from ${path.basename(MEMORY_PATH)}`);
});
