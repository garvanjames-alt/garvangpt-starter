// backend/pingOpenAI.cjs
// Minimal sanity check that the OpenAI SDK + key work.

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const OpenAI = require("openai");

(async () => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY in backend/.env");

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const client = new OpenAI({ apiKey });

    const r = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 8,
      messages: [
        { role: "system", content: "Reply with only the word PONG." },
        { role: "user", content: "Say PONG" },
      ],
    });

    const text = r.choices?.[0]?.message?.content?.trim();
    console.log(JSON.stringify({ ok: text === "PONG", model, text }, null, 2));
  } catch (err) {
    console.error("PING FAILED:", err.status || "", err.message);
    process.exit(1);
  }
})();
