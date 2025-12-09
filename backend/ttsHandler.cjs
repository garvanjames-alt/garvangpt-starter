// backend/ttsHandler.cjs
// ElevenLabs TTS proxy that saves mp3 to public/tmp and returns an audio_url.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;

// ✅ accept any of these env var names (prefer ELEVEN_VOICE_ID)
const RAW_VOICE_ID =
  process.env.ELEVEN_VOICE_ID ||
  process.env.ELEVEN_VOICE ||
  process.env.ELEVENLABS_VOICE_ID;

// normalize (trim quotes/spaces just in case)
const ELEVEN_VOICE = RAW_VOICE_ID ? String(RAW_VOICE_ID).trim().replace(/^"+|"+$/g, "") : undefined;

const ELEVEN_MODEL = process.env.ELEVEN_MODEL || "eleven_turbo_v2_5";

// 🔍 log what we found
console.log("[TTS] ELEVENLABS_VOICE_ID =", process.env.ELEVENLABS_VOICE_ID);
console.log("[TTS] ELEVEN_VOICE_ID     =", process.env.ELEVEN_VOICE_ID);
console.log("[TTS] ELEVEN_VOICE       =", process.env.ELEVEN_VOICE);
console.log("[TTS] USING VOICE        =", ELEVEN_VOICE);

// warn if multiple are set (helps avoid confusion)
if (
  process.env.ELEVEN_VOICE_ID &&
  process.env.ELEVEN_VOICE &&
  process.env.ELEVEN_VOICE_ID !== process.env.ELEVEN_VOICE
) {
  console.warn(
    "[TTS] WARNING: Both ELEVEN_VOICE_ID and ELEVEN_VOICE are set and differ. Using ELEVEN_VOICE_ID."
  );
}

module.exports = async function ttsHandler(req, res) {
  try {
    // ---- Guardrails ----
    if (!ELEVEN_API_KEY || !ELEVEN_VOICE) {
      console.warn("[TTS] Missing ELEVEN_API_KEY or voice id. Returning 204.");
      return res.status(204).send();
    }

    const text = req.body && req.body.text ? String(req.body.text).trim() : "";
    if (!text) {
      console.warn("[TTS] Empty text. Returning 204.");
      return res.status(204).send();
    }

    // ---- Call ElevenLabs streaming endpoint ----
    const url =
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVEN_VOICE)}/stream`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        model_id: ELEVEN_MODEL,
        text,
        voice_settings: { stability: 0.4, similarity_boost: 0.8 },
        optimize_streaming_latency: 4,
        output_format: "mp3_44100_128",
      }),
    });

    if (!r.ok) {
      const msg = `[TTS] ElevenLabs error ${r.status}: ${await r.text()}`;
      console.error(msg);
      return res.status(502).send(msg);
    }

    // ---- Buffer the mp3 ----
    const arrayBuf = await r.arrayBuffer();
    const mp3Buffer = Buffer.from(arrayBuf);

    // ---- Save to backend/public/tmp ----
    const TMP_DIR = path.join(process.cwd(), "public", "tmp");
    fs.mkdirSync(TMP_DIR, { recursive: true });

    const id = `${crypto.randomUUID()}.mp3`;
    const outPath = path.join(TMP_DIR, id);
    fs.writeFileSync(outPath, mp3Buffer);

    // ---- Return a URL that browser + D-ID can fetch ----
    const host = req.get("host");
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const audio_url = `${proto}://${host}/tmp/${id}`;

    return res.json({ ok: true, audio_url });
  } catch (err) {
    console.error("[TTS] Unexpected error:", err);
    res.status(500).send("TTS failed");
  }
};
