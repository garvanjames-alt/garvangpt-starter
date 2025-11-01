// backend/server.mjs (complete, safe version)

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allow localhost:5173 and your Netlify domain
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://garvangpt.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
  })
);

app.use(bodyParser.json());

// --- Health Check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// --- Memory API (stub for MVP)
import fs from "fs";
const memoryFile = "./backend/data/memory.json";

app.get("/api/memory", (req, res) => {
  if (!fs.existsSync(memoryFile)) return res.json({ items: [] });
  const data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
  res.json({ items: data.items || [] });
});

app.post("/api/memory", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });
  const items = fs.existsSync(memoryFile)
    ? JSON.parse(fs.readFileSync(memoryFile, "utf-8")).items || []
    : [];
  const id = Date.now();
  const updated = { items: [...items, { id, text }] };
  fs.writeFileSync(memoryFile, JSON.stringify(updated, null, 2));
  res.json({ success: true, id });
});

app.delete("/api/memory", (req, res) => {
  fs.writeFileSync(memoryFile, JSON.stringify({ items: [] }, null, 2));
  res.json({ success: true });
});

// --- Respond route (simulated AI response)
app.post("/api/respond", async (req, res) => {
  const { text } = req.body;
  console.log("Incoming question:", text);

  try {
    const reply = `Hello! How can I assist you today?`;
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ElevenLabs TTS route
app.post("/api/tts", async (req, res) => {
  try {
    const text = req.body.text;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      console.error("Missing ElevenLabs credentials");
      return res.status(500).json({ error: "Missing ElevenLabs credentials" });
    }

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      console.error("ElevenLabs error:", errTxt);
      return res.status(502).json({ error: "ElevenLabs error", status: r.status, body: errTxt });
    }

    // stream MP3 directly to frontend
    res.setHeader("Content-Type", "audio/mpeg");
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error("/api/tts failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Allowed origins:", allowedOrigins.join(", "));
});