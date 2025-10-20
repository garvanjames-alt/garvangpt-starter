// backend/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple healthcheck
app.get("/health", (_req, res) => res.send("ok"));

// main ask endpoint — sessionId is now OPTIONAL
app.post("/ask", async (req, res) => {
  try {
    const { question, sessionId } = req.body || {};
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Missing 'question' (string)." });
    }

    // if the frontend doesn't send a sessionId, we generate one here
    const sid = sessionId || "server-" + Math.random().toString(36).slice(2, 9);

    // call OpenAI (short, pharmacy-safe style)
    const chat = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You are a cautious, concise pharmacist assistant. Provide brief, clear answers with sensible cautions.",
        },
        { role: "user", content: question },
      ],
    });

    const answer =
      chat.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I couldn't draft a response.";

    // include the sid we used so we can see it in Network tab if we want
    res.json({ answer, usedSessionId: sid });
  } catch (err) {
    console.error("ASK error:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Minimal API running at http://localhost:${PORT}`);
});
