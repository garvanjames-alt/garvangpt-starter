// backend/respondHandler.cjs — Force-Direct & Safe Fallback vS12 (web edit)

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional env toggle to always bypass retriever
const FORCE_DIRECT = process.env.RESPOND_FORCE_DIRECT === "1";

// --- Helper: Direct LLM response ---
async function llmDirect(prompt) {
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are GarvanGPT, a pharmacist educator. Be accurate, clear, and kind. Keep tone patient-friendly.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });
  return chat.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

// --- Helper: Retrieve local docs (non-fatal) ---
async function retrieve(q, k = 5) {
  try {
    const { search } = await import("./retriever/retriever.mjs");
    const res = await search(q, k);
    return res.hits || [];
  } catch (e) {
    console.error("Retriever failed:", e);
    return [];
  }
}

function buildSystem(hits) {
  const src = hits
    .map((h, i) => `[#${i + 1}] ${h.source}\n${h.text}`)
    .join("\n\n");
  return [
    "You are GarvanGPT, a pharmacist educator.",
    "Answer ONLY using the SOURCES below. If the sources don't contain the answer, say so briefly and answer from general knowledge.",
    "Cite sources inline like [#1], [#2] when used. Be clear and patient-friendly.",
    "",
    "SOURCES:",
    src || "(none)"
  ].join("\n");
}

// --- Grounded (RAG) answer with graceful fallback ---
async function llmGrounded(prompt, hits) {
  const system = buildSystem(hits);
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
  });
  return chat.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

async function handler(req, res) {
  try {
    // Accept several client payload shapes
    const prompt =
      (req.body?.prompt ??
        req.body?.text ??
        req.body?.question ??
        "").toString().trim();

    if (!prompt) return res.status(400).json({ error: "missing_prompt" });

    const reqMode = (req.body?.mode || "").toString().toLowerCase();
    const ragOff = reqMode === "direct" || req.body?.rag === false || FORCE_DIRECT;

    let answer = "";
    let sources = [];

    if (ragOff) {
      // Bypass retriever entirely
      answer = await llmDirect(prompt);
      return res.json({ ok: true, answer, sources });
    }

    // Try retriever; if no hits, fall back to direct
    const hits = await retrieve(prompt, 5);
    sources = hits.map((h, i) => ({
      id: i + 1,
      source: h.source,
      score: typeof h.score === "number" ? h.score : undefined,
    }));

    if (!hits?.length) {
      answer = await llmDirect(prompt);
      return res.json({ ok: true, answer, sources });
    }

    // With hits → grounded answer
    answer = await llmGrounded(prompt, hits);
    return res.json({ ok: true, answer, sources });
  } catch (err) {
    console.error("respond error:", err);
    // Absolute safety: never 500 the UX
    try {
      const fallback = await llmDirect(
        "Give a brief, kind apology and ask the user to try again."
      );
      return res.json({ ok: true, answer: fallback, sources: [] });
    } catch {
      return res.json({
        ok: true,
        answer: "Sorry—something went wrong. Please try again.",
        sources: [],
      });
    }
  }
}

// Export in multiple shapes to satisfy various import styles
module.exports = handler;
module.exports.handler = handler;
module.exports.default = { handler };
