// backend/ttsHandler.cjs
// Robust ElevenLabs TTS handler for GarvanGPT / Almost Human.
// Works in both local dev and Render by accepting multiple env var names.

/* eslint-disable no-undef */

const fetch = globalThis.fetch || require("node-fetch");

function pickEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

module.exports = async function ttsHandler(text) {
  const apiKey = pickEnv("ELEVENLABS_API_KEY", "ELEVEN_API_KEY", "ELEVEN_API_K");
  const voiceId = pickEnv(
    "ELEVENLABS_VOICE_ID",
    "ELEVEN_VOICE_ID",
    "ELEVEN_VOICE",
    "ELEVENLABS_VOICE"
  );
  const modelId = pickEnv("ELEVENLABS_MODEL_ID", "ELEVEN_MODEL_ID") || "eleven_turbo_v2_5";
  const baseUrl = pickEnv("ELEVENLABS_BASE_URL") || "https://api.elevenlabs.io/v1";

  if (!apiKey) {
    throw new Error(
      "Missing ElevenLabs API key. Set ELEVENLABS_API_KEY (or ELEVEN_API_KEY)."
    );
  }
  if (!voiceId) {
    throw new Error(
      "Missing ElevenLabs voice id. Set ELEVENLABS_VOICE_ID (or ELEVEN_VOICE)."
    );
  }

  const url = `${baseUrl}/text-to-speech/${voiceId}`;

  const payload = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.35,
      similarity_boost: 0.85,
      style: 0.25,
      use_speaker_boost: true,
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed: ${r.status} ${r.statusText} ${errText}`);
  }

  const arrayBuf = await r.arrayBuffer();
  return Buffer.from(arrayBuf);
};
