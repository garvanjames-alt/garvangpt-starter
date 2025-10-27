// --- ElevenLabs TTS proxy ----------------------------------------------------
import express from "express";
import fetch from "node-fetch"; // If Node 22+, global fetch exists; this import is safe either way.

const VOICE_IDS = {
  // Default high-quality voice; change later if you like.
  Rachel: "21m00Tcm4TlvDq8ikWAM",
};

app.post("/tts", express.json(), async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ELEVENLABS_API_KEY is not set" });
    }

    const { text, voiceId = VOICE_IDS.Rachel } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text (string) is required" });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: { stability: 0.4, similarity_boost: 0.7 },
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(r.status).send(errText || "TTS failed");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    // Stream audio back to the browser
    r.body.pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message || "tts error" });
  }
});
