// backend/server.mjs
import express from 'express';

/**
 * Minimal backend for Almost Human (staging)
 * - GET  /api/ping      -> { ok: true, service: 'backend' }
 * - POST /api/respond   -> { ok: true, echoed, answer }  (stub text answer)
 * - POST /api/tts       -> audio/wav (real ElevenLabs if key present; beep fallback)
 *
 * Env:
 *   ELEVENLABS_API_KEY   required for real TTS
 *   ELEVENLABS_VOICE_ID  optional voice id (defaults to Rachel)
 *   FRONTEND_ORIGIN      optional, e.g. https://almosthuman-frontend-staging.onrender.com
 *   PORT                 provided by Render
 */

const app = express();

// ---------- Basic CORS (allow staging frontend or fallback to "*") ----------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,xi-api-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '1mb' }));

// ---------- Health check ----------
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, service: 'backend' });
});

// ---------- Stub QA route (keeps UI flowing while we iterate) ----------
app.post('/api/respond', async (req, res) => {
  try {
    const question = (req.body?.question || '').toString().trim();
    let answer = 'This is a stub answer. Connect your model for live responses.';

    if (question) {
      const q = question.toLowerCase();
      if (q.includes('amoxicillin')) {
        answer = 'Amoxicillin is a penicillin-class antibiotic used to treat many bacterial infections.';
      } else {
        answer = `Stub answer: "${question}" is an example question.`;
      }
    } else {
      answer = 'Please provide a question.';
    }

    res.status(200).json({ ok: true, echoed: question, answer });
  } catch (err) {
    console.error('[respond] error:', err);
    res.status(500).json({ ok: false, error: 'respond_failed' });
  }
});

// ---------- REAL TTS with ElevenLabs (beep fallback if no key) ----------
app.post('/api/tts', async (req, res) => {
  try {
    const text = (req.body?.text || '').toString().trim();
    if (!text) return res.status(400).json({ ok: false, error: 'Missing text' });

    const KEY   = process.env.ELEVENLABS_API_KEY || '';
    const VOICE = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

    // Fallback: short WAV beep if no API key is configured
    if (KEY.length < 10) {
      const blockAlign = 2;
      const sampleRate = 16000;
      const seconds = 0.15;
      const frames = Math.floor(sampleRate * seconds);
      const pcm = new Int16Array(frames);
      const freq = 880;
      for (let i = 0; i < frames; i++) {
        pcm[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * 0x3FFF;
      }

      const dataBytes = pcm.length * blockAlign;
      const buf = Buffer.alloc(44 + dataBytes);
      // WAV header
      buf.write('RIFF', 0);
      buf.writeUInt32LE(36 + dataBytes, 4);
      buf.write('WAVE', 8);
      buf.write('fmt ', 12);
      buf.writeUInt32LE(16, 16);
      buf.writeUInt16LE(1, 20);   // PCM
      buf.writeUInt16LE(1, 22);   // mono
      buf.writeUInt32LE(sampleRate, 24);
      buf.writeUInt32LE(sampleRate * blockAlign, 28);
      buf.writeUInt16LE(blockAlign, 32);
      buf.writeUInt16LE(16, 34);  // 16-bit
      buf.write('data', 36);
      buf.writeUInt32LE(dataBytes, 40);
      for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);

      res.setHeader('Content-Type', 'audio/wav');
      return res.status(200).send(buf);
    }

    // Real provider call
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
      method: 'POST',
      headers: {
        'xi-api-key': KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
      },
      body: JSON.stringify({ text })
    });

    if (!r.ok) {
      const raw = await r.text().catch(() => '');
      console.error('[TTS] provider error:', r.status, raw);
      return res.status(502).json({ ok: false, error: 'tts_provider_error', status: r.status });
    }

    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/wav');
    return res.status(200).send(audio);
  } catch (err) {
    console.error('[TTS] exception:', err);
    return res.status(500).json({ ok: false, error: 'tts_exception' });
  }
});

// ---------- Boot ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[boot] backend listening on :${PORT}`);
});
