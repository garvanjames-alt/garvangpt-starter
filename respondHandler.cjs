// backend/respondHandler.cjs
require("dotenv").config();
const { OpenAI } = require("openai");

const Client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const PERSONA =
  "You are a friendly, safety-first pharmacist who answers clearly and concisely. " +
  "If you’re not sure, say so and recommend contacting a clinician.";

module.exports = async function respondHandler(req, res) {
  try {
    const { question = "", minScore = 0.1 } = req.body || {};

    const messages = [
      { role: "system", content: PERSONA },
      {
        role: "system",
        content:
          "When asked about vaccines/boosters, provide evidence-based, practical guidance. " +
          "Be brief, list-like when helpful. Don’t fabricate sources.",
      },
      { role: "user", content: question },
    ];

    const out = await Client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 400,
      messages,
    });

    const answer = out.choices?.[0]?.message?.content?.trim() || "(no answer)";
    res.json({ answer, sources: [], usedMemories: [] });
  } catch (err) {
    console.error("respondHandler error:", err.status || "", err.message);
    res.status(500).json({
      answer: "The answer engine hiccuped. Try again in a moment.",
      sources: [],
      usedMemories: [],
      error: String(err?.message || err),
    });
  }
};
