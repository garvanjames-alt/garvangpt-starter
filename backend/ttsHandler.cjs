// backend/ttsHandler.cjs
// Simple ElevenLabs TTS proxy that returns an audio stream to the browser.

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;  // <-- read these two names
const ELEVEN_VOICE  = process.env.ELEVEN_VOICE;     // e.g. "paRTfYnetOrTukxfEm1J"
const ELEVEN_MODEL  = process.env.ELEVEN_MODEL || "eleven_turbo_v2_5";

module.exports = async function ttsHandler(req, res) {
  try {
    // ---- Guardrails ----
    if (!ELEVEN_API_KEY || !ELEVEN_VOICE) {
      console.warn("[TTS] Missing ELEVEN_API_KEY or ELEVEN_VOICE. Returning 204.");
      return res.status(204).send(); // no content -> frontend should just skip audio
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
        output_format: "mp3_44100_128", // small, fast
      }),
    });

    if (!r.ok) {
      const msg = `[TTS] ElevenLabs error ${r.status}: ${await r.text()}`;
      console.error(msg);
      return res.status(502).send(msg);
    }

    // Stream audio back to the browser
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    const reader = r.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error("[TTS] Unexpected error:", err);
    res.status(500).send("TTS failed");
  }
};
