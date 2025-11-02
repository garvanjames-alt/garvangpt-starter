// backend/ttsHandler.cjs
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_MODEL   = process.env.ELEVEN_MODEL || 'eleven_turbo_v2_5';
const ELEVEN_VOICE   = process.env.ELEVEN_VOICE; // e.g. paRTfYnet0rTukxfEm1J

module.exports = async function ttsHandler(req, res) {
  try {
    // Guard rails
    if (!ELEVEN_API_KEY || !ELEVEN_VOICE) {
      console.warn('[TTS] Missing ELEVEN_API_KEY or ELEVEN_VOICE. Returning 204.');
      return res.status(204).send();
    }

    const text = (req.body && req.body.text ? String(req.body.text) : '').trim();
    if (!text) {
      console.warn('[TTS] Empty text. Returning 204.');
      return res.status(204).send();
    }

    // Keep it modest length (avoid API timeouts / huge payloads)
    const maxChars = 600; // adjust if you like
    const speak = text.length > maxChars ? text.slice(0, maxChars) : text;

    // ElevenLabs streaming endpoint → we’ll still buffer before sending
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}/stream` +
                `?optimize_streaming_latency=3&output_format=mp3_44100_128`;

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        text: speak,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.3, similarity_boost: 0.7 }
      })
    });

    if (!r.ok) {
      console.error('[TTS] ElevenLabs error', r.status, await safeReadText(r));
      return res.status(204).send();
    }

    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);

    // Critical headers so the browser audio element is happy:
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes'
    });

    return res.status(200).send(buf);
  } catch (err) {
    console.error('[TTS] Unexpected error', err);
    return res.status(204).send();
  }
};

async function safeReadText(r) {
  try { return await r.text(); } catch { return '<no body>'; }
}
