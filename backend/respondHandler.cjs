// backend/respondHandler.cjs
// Minimal retrieval + formatter for Almost Human (GarvanGPT)
//
// - Reads ../data/memory.json (shape can be either {items: [string]}
//   or {items: [{title, text, file/rel}]}).
// - Finds simple keyword hits for the incoming prompt.
// - Returns a short answer, the used memory snippet titles, and sources.
//
// Safe to paste over your existing file.

const fs = require("fs");
const path = require("path");

// ---- Config ---------------------------------------------------------------

const DATA_PATH = path.join(__dirname, "..", "data", "memory.json");
const MAX_SNIPPETS = 3;

// ---- Helpers --------------------------------------------------------------

function loadMemory() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const json = JSON.parse(raw || "{}");
    const items = Array.isArray(json.items) ? json.items : [];

    // Normalize to a common internal shape
    // { title, text, rel }
    return items.map((it, i) => {
      if (typeof it === "string") {
        const title = firstSentence(it) || `memory #${i + 1}`;
        return { title, text: it, rel: "data/memory.json" };
      }
      const title = (it.title && String(it.title).trim()) || `memory #${i + 1}`;
      const text =
        (it.text && String(it.text)) ||
        (it.body && String(it.body)) ||
        (it.content && String(it.content)) ||
        "";
      const rel = it.rel || it.file || "data/memory.json";
      return { title, text, rel };
    });
  } catch (err) {
    console.error("[respondHandler] Failed to read memory:", DATA_PATH, err);
    return [];
  }
}

function firstSentence(s) {
  const m = String(s || "").trim().match(/^(.+?[.?!])(\s|$)/);
  return m ? m[1] : String(s || "").trim().slice(0, 80);
}

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreSnippet(prompt, snip) {
  // Very simple overlap score
  const p = new Set(tokenize(prompt));
  const t = new Set(tokenize(`${snip.title} ${snip.text}`));
  let hit = 0;
  for (const w of p) if (t.has(w)) hit++;
  return hit;
}

function findTop(prompt, corpus) {
  if (!prompt || !corpus.length) return [];
  const scored = corpus
    .map((snip) => ({ snip, score: scoreSnippet(prompt, snip) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_SNIPPETS).map((x) => x.snip);
}

function composeAnswer(prompt, top) {
  if (!top.length) {
    return `I didn’t find anything relevant yet in memory. (You asked: “${prompt}”)`;
  }

  const bullets = top.map((t, i) => `- ${t.title || `snippet #${i + 1}`}`).join("\n");

  // Handcrafted summary for the demo domain; adjust freely.
  const summary =
    `Summary (non-diagnostic): Amoxicillin commonly causes nausea and rash. ` +
    `Seek medical help urgently with severe headache, fever with stiff neck, or new neurological symptoms.`;

  return `Here’s what I found:\n\n${bullets}\n\n${summary}`;
}

// ---- Handler --------------------------------------------------------------

module.exports = async function respond(req, res) {
  try {
    const prompt = (req.body && req.body.prompt) || "";
    const safePrompt = String(prompt).slice(0, 500);

    // Load corpus (fast for our small demo; cache later if needed)
    const corpus = loadMemory();

    // Retrieve
    const top = findTop(safePrompt, corpus);

    // Build response
    const text = composeAnswer(safePrompt, top);
    const sources = top.map((t) => ({
      title: t.title || "(untitled)",
      rel: t.rel || "data/memory.json",
    }));
    const usedMemories = top.map((t) => t.title || t.rel || "(untitled)");

    // --- DEBUG: comment out later if noisy
    console.log("[respond] prompt:", safePrompt);
    console.log("[respond] candidates size:", corpus.length);
    console.log("[respond] top titles:", top.map((t) => t.title).slice(0, 5));
    console.log("[respond] sources/used:", sources.length, usedMemories.length);

    return res.json({ text, sources, usedMemories });
  } catch (err) {
    console.error("[respondHandler] error:", err);
    return res.status(500).json({ text: "Server error.", sources: [], usedMemories: [] });
  }
};
