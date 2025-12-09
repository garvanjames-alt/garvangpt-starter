// backend/respondHandler.cjs — RAG-first with correct prompt/message wiring (vS13)

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional env toggle to always bypass retriever
const FORCE_DIRECT = process.env.RESPOND_FORCE_DIRECT === "1";

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

function buildSystem(systemPrompt, hits) {
  const src = hits
    .map((h, i) => `[#${i + 1}] ${h.source}\n${h.text}`)
    .join("\n\n");

  return [
    systemPrompt || "You are GarvanGPT, a pharmacist educator.",
    "Answer using the SOURCES below when they are relevant.",
    "If the sources don't contain the answer, say so briefly and then answer from general knowledge.",
    "Cite sources inline like [#1], [#2] when used. Be clear and patient-friendly.",
    "",
    "SOURCES:",
    src || "(none)",
  ].join("\n");
}

// --- Helper: Direct LLM response (no retriever) ---
async function llmDirect(systemPrompt, userMessage) {
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are GarvanGPT, a pharmacist educator. Be accurate, clear, and kind. Keep tone patient-friendly.",
      },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
  });
  return chat.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

// --- Grounded (RAG) answer with graceful fallback ---
async function llmGrounded(systemPrompt, userMessage, hits) {
  const system = buildSystem(systemPrompt, hits);
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });
  return chat.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

async function handler(req, res) {
  try {
    // 1) SYSTEM prompt (persona/instructions)
    const systemPrompt = (
      req.body?.prompt ??
      process.env.DEFAULT_PROMPT ??
      ""
    ).toString().trim();

    // 2) USER message (actual question)
    const userMessage = (
      req.body?.message ??
      req.body?.question ??
      req.body?.text ??
      ""
    ).toString().trim();

    if (!userMessage) {
      return res.status(400).json({ error: "missing_message" });
    }

    const reqMode = (req.body?.mode || "").toString().toLowerCase();
    const ragOff =
      reqMode === "direct" ||
      req.body?.rag === false ||
      FORCE_DIRECT;

    let answer = "";
    let sources = [];

    if (ragOff) {
      answer = await llmDirect(systemPrompt, userMessage);
      return res.json({ ok: true, answer, sources });
    }

    // Retrieve on USER message, not system prompt
    const hits = await retrieve(userMessage, 5);
    sources = hits.map((h, i) => ({
      id: i + 1,
      source: h.source,
      score: typeof h.score === "number" ? h.score : undefined,
    }));

    if (!hits?.length) {
      answer = await llmDirect(systemPrompt, userMessage);
      return res.json({ ok: true, answer, sources });
    }

    answer = await llmGrounded(systemPrompt, userMessage, hits);
    return res.json({ ok: true, answer, sources });
  } catch (err) {
    console.error("respond error:", err);
    try {
      const fallback = await llmDirect(
        "You are GarvanGPT.",
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
