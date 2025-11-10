// backend/respondHandler.cjs — Force-Direct & Safe Fallback vS10

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional env variable to always bypass retriever
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
    temperature: 0.7,
  });

  return chat.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

// --- Helper: Retrieve local docs ---
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

// --- Build system prompt from retrieved hits ---
function buildSystem(hits) {
  if (!hits?.length) return "(none)";
  return hits
    .map((h, i) => `[#${i + 1}] ${h.source}\n${h.text}`)
    .join("\n\n");
}

// --- Main handler ---
async function handler(req, res) {
  try {
    const body = req.body || {};
    const prompt = (body.prompt || body.text || "").toString().trim();
    const mode = body.mode || "auto";
    const rag = body.rag !== false;

    if (!prompt) return res.status(400).json({ error: "missing_prompt" });

    // If direct mode or RAG disabled
    if (mode === "direct" || FORCE_DIRECT || !rag) {
      const answer = await llmDirect(prompt);
      return res.json({ ok: true, answer, sources: [] });
    }

    // Otherwise, use retrieval
    const hits = await retrieve(prompt, 5);
    const system = [
      "You are GarvanGPT, a pharmacist educator.",
      "Answer ONLY using the SOURCES below.",
      "If the sources don't contain the answer, say so politely.",
      "",
      "SOURCES:",
      buildSystem(hits),
    ].join("\n");

    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const answer = chat.choices?.[0]?.message?.content?.trim() || "(no reply)";
    return res.json({ ok: true, answer, sources: hits });
  } catch (err) {
    console.error("Respond error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = handler;
