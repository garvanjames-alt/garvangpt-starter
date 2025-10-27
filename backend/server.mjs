// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ---- health ----
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ---- simple demo memories (in-memory) ----
let MEMS = [];

app.get("/memory", (req, res) => {
  res.json({ ok: true, items: MEMS });
});

app.post("/memory", (req, res) => {
  const text = req.body?.text ?? req.query?.text;
  if (!text) return res.status(400).json({ ok: false, error: "text required" });
  const item = { ts: new Date().toISOString(), text };
  MEMS.unshift(item);
  res.json({ ok: true, item });
});

app.delete("/memory", (req, res) => {
  MEMS = [];
  res.json({ ok: true });
});

// ---- /tts proxy → ElevenLabs ----
const XI_KEY   = process.env.ELEVENLABS_API_KEY;                     // required
const XI_MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";
const XI_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // default voice

app.post("/tts", async (req, res) => {
  try {
    const text   = req.body?.text;
    const voice  = req.body?.voiceId || XI_VOICE;
    const model  = req.body?.model  || XI_MODEL;

    if (!text)  return res.status(400).json({ ok:false, error:"text required" });
    if (!XI_KEY) return res.status(500).json({ ok:false, error:"ELEVENLABS_API_KEY missing" });

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": XI_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({ text, model_id: model })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok:false, error:"elevenlabs", detail: err });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    // Stream through
    if (r.body && r.body.pipe) {
      r.body.pipe(res);
    } else {
      const buf = Buffer.from(await r.arrayBuffer());
      res.end(buf);
    }
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`backend listening on ${PORT}`));
