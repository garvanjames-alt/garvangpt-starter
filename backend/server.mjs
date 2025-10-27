// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();

// ----- Config -----
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // any default is fine
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

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

// ----- /chat: now calls OpenAI for a real reply -----
app.post("/chat", async (req, res) => {
  try {
    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
    if (!OPENAI_API_KEY) {
      return res.status(401).json({ ok: false, error: "Missing OPENAI_API_KEY" });
    }

    // Light-touch “memories” context to ground the reply a bit
    const memoryContext = MEM.slice(-5).map(m => `- ${m.text}`).join("\n");

    const body = {
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are Almost Human, a concise, friendly voice companion. Keep replies short and conversational. If appropriate, reference known preferences.",
        },
        memoryContext
          ? { role: "system", content: `Known preferences/memories:\n${memoryContext}` }
          : undefined,
        { role: "user", content: text },
      ].filter(Boolean),
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      return res.status(r.status).json({ ok: false, error: msg || r.statusText });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Okay.";

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
