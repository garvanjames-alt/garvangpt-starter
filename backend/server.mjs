// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();

// ----- Config -----
const PORT = process.env.PORT || 3000;
const API_KEY_OPENAI = process.env.OPENAI_API_KEY || ""; // (not used yet)
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // any default
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);

// ----- Middleware -----
app.use(express.json());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || CORS_ORIGINS.length === 0) return cb(null, true);
      cb(null, CORS_ORIGINS.includes(origin));
    },
    credentials: true,
  })
);

// ----- Health -----
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ----- Demo “memory” endpoints (in-memory only) -----
const MEM = [];
app.get("/memory/list", (_req, res) => {
  res.json({ ok: true, items: [...MEM] });
});
app.post("/memory/save", (req, res) => {
  const text = (req.body?.text || "").toString().trim();
  if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
  MEM.push({ ts: Date.now(), text });
  res.json({ ok: true });
});
app.delete("/memory/clear", (_req, res) => {
  MEM.length = 0;
  res.json({ ok: true });
});

// Legacy alias
app.get("/memory", (_req, res) => res.json({ ok: true, items: [...MEM] }));
app.post("/memory", (req, res) => {
  const text = (req.body?.text || "").toString().trim();
  if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
  MEM.push({ ts: Date.now(), text });
  res.json({ ok: true });
});
app.delete("/memory", (_req, res) => {
  MEM.length = 0;
  res.json({ ok: true });
});

// ----- NEW: simple /chat echo (proof of front↔back wiring) -----
app.post("/chat", async (req, res) => {
  try {
    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
    const reply = `You said: "${text}"`;
    res.json({ ok: true, reply });
  } catch (err) {
    console.error("/chat error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ----- TTS proxy to ElevenLabs -----
app.post("/tts", async (req, res) => {
  try {
    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
    if (!ELEVENLABS_API_KEY) return res.status(401).json({ ok: false, error: "Missing ELEVENLABS_API_KEY" });

    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;

    const r = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model_id: ELEVENLABS_MODEL,
        text,
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        output_format: "mp3_44100_128",
      }),
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      return res.status(r.status).json({ ok: false, error: msg || r.statusText });
    }

    // stream audio back
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    const buf = Buffer.from(await r.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error("/tts error:", err);
    res.status(500).json({ ok: false, error: "TTS error" });
  }
});

// ----- Start -----
app.listen(PORT, () => {
  console.log(`backend listening on :${PORT}`);
});
