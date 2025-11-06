// backend/server.mjs
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3001;

// --- clients & middleware ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// --- health check ---
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

// --- respond endpoint (POST for app; GET for quick browser check) ---
app.post("/api/respond", async (req, res) => {
  try {
    const question = (req.body?.question || "").slice(0, 400);
    console.log(`[respond] ${new Date().toISOString()} q="${question}"`);
    // TODO: replace with your real logic
    return res.status(200).json({ ok: true, echoed: question });
  } catch (err) {
    console.error("[respond] error", err);
    return res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/respond", (_req, res) => {
  res.json({ ok: true, note: "POST /api/respond is ready" });
});

// --- REAL TTS (Australian accent) ---
// Uses OpenAI gpt-4o-mini-tts to return WAV audio.
app.post("/api/tts", async (req, res) => {
  try {
    const text = (req.body?.text || "Hello! This is your Australian voice test.")
      .slice(0, 600);
    console.log(`[tts] ${new Date().toISOString()} text="${text}"`);

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "verse",         // natural Australian variant
      input: text,
      format: "wav"
    });

    // Convert to Buffer and send
    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("[tts] error", err);
    res.status(500).json({ error: "TTS error" });
  }
});

// Convenience GET to test in a browser
app.get("/api/tts", async (_req, res) => {
  try {
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "verse",
      input: "Hello! This is your Australian voice test.",
      format: "wav"
    });
    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("[tts][GET] error", err);
    res.status(500).json({ error: "TTS error" });
  }
});

// --- start server ---
app.listen(PORT, () => {
  console.log(`[boot] server listening on :${PORT}`);
});
