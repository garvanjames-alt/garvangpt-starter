import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Auto-create a sessionId if the frontend didn't send one
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/ask') {
    if (!req.body) req.body = {};
    if (!req.body.sessionId) {
      req.body.sessionId = `web-${Math.random().toString(36).slice(2, 9)}`;
      console.log('[auto-session]', req.body.sessionId);
    }
  }
  next();
});


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Health check route ---
app.get("/health", (req, res) => {
  res.send("ok");
});

// --- Main ask route ---
app.post("/ask", async (req, res) => {
  try {
    // Safely extract request body
    const { question, sessionId } = req.body || {};
    const sid = sessionId ?? `web-${Date.now()}`; // optional fallback

    // Validate that question exists
    if (!question) {
      return res.status(400).json({ error: 'Missing "question" in request body' });
    }

    // Log the incoming question for debugging
    console.log(`🧠 [${sid}] Question received:`, question);

    // Call OpenAI model
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful pharmacist avatar who provides clear, concise, and safe healthcare information.",
        },
        { role: "user", content: question },
      ],
    });

    // Extract text safely
    const answer = response.choices?.[0]?.message?.content?.trim() || "(no response)";
    console.log(`💬 [${sid}] Answer:`, answer);

    // Send result to frontend
    res.json({ answer });

  } catch (err) {
    console.error("❌ Error in /ask route:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Minimal API running at http://localhost:${PORT}`);
});
