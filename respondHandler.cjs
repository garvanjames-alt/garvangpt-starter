// backend/respondHandler.cjs
// Main /api/respond handler. Pulls local sources via query.js and asks the LLM.

const Client = require("./pingOpenAI.cjs");
const { queryDocs, ensureIndex } = require("./query.js");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const PERSONA = `
You are a friendly, safety-first pharmacist who answers clearly and concisely.
If you're not sure, say so and recommend contacting a clinician.
When asked about vaccines/boosters, be evidence-based, practical, and cautious.
Be brief, use bullet lists where helpful. Do not fabricate sources.
`;

function makeContext(sources) {
  if (!sources?.length) return "(no sources found)";
  const blocks = sources.map(
    (s, i) => `SOURCE ${i + 1} — ${s.file} (score ${(s.score || 0).toFixed(2)})\n${s.snippet}`
  );
  return blocks.join("\n\n");
}

module.exports = async function respondHandler(req, res) {
  try {
    const { question = "", minScore = 0.2 } = req.body || {};

    // 1) Retrieve local sources
    ensureIndex();
    const hits = queryDocs(question, { k: 6 });
    const maxScore = hits.reduce((m, h) => Math.max(m, h.score || 0), 0) || 1;
    const usable = hits.filter((h) => (h.score || 0) / maxScore >= Math.max(0, Number(minScore) || 0));

    // 2) Ask the model with sources as context
    const messages = [
      { role: "system", content: PERSONA },
      {
        role: "system",
        content:
          "Use the provided SOURCE EXCERPTS when possible. Cite specific facts to those excerpts in plain text. If the sources do not cover the question, answer generally and note the limitation.",
      },
      { role: "user", content: `QUESTION:\n${question}` },
      { role: "user", content: `SOURCE EXCERPTS:\n${makeContext(usable)}` },
    ];

    const out = await Client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages,
    });

    const answer = out?.choices?.[0]?.message?.content?.trim() || "(no answer)";

    res.json({ answer, sources: usable, usedMemories: [] });
  } catch (err) {
    console.error("respondHandler error:", err?.status || "", err?.message);
    res.status(500).json({
      answer: "The answer engine hiccuped. Try again in a moment.",
      sources: [],
      usedMemories: [],
      error: String(err?.message || err),
    });
  }
};
