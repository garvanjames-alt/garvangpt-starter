// backend/respondHandler.cjs
const OpenAI = require("openai");

// Lazily import the ESM retriever
async function retrieve(q, k = 5) {
  const { search } = await import("./retriever/retriever.mjs");
  const res = await search(q, k);
  return res.hits || [];
}

function buildSystem(hits) {
  const src = hits
    .map((h, i) => `[#${i + 1}] ${h.source}\n${h.text}`)
    .join("\n\n");
  return [
    "You are GarvanGPT, a pharmacist educator.",
    "Answer ONLY using the SOURCES below. If the sources don't contain the answer, say so and suggest the next question.",
    "Cite sources inline like [#1], [#2]. Be clear and patient-friendly.",
    "",
    "SOURCES:",
    src || "(none)"
  ].join("\n");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handler(req, res) {
  try {
    const prompt = (req.body?.prompt || req.body?.question || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "missing_prompt" });

    // 1) Retrieve
    const hits = await retrieve(prompt, 5);

    // 2) Build grounded system prompt
    const system = buildSystem(hits);

    // 3) Generate
    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
    });

    const answer = chat.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    const sources = hits.map((h, i) => ({
      id: i + 1,
      source: h.source,
      score: Number(h.score?.toFixed?.(4) ?? 0),
    }));

    return res.json({ ok: true, answer, sources });
  } catch (e) {
    console.error("respond_error", e?.status || "", e?.message || e);
    return res.status(500).json({ error: "respond_failed" });
  }
}

module.exports = { handler };
