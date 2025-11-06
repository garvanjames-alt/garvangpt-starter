// backend/server.mjs
import express from "express";

const app = express();
app.use(express.json());

// --- tiny util: generate a 3 kHz WAV "beep" so we can prove audio plumbing works ---
function waveBeepBuffer({ ms = 1200, freq = 3000 } = {}) {
  const sampleRate = 48000;
  const channels = 1;
  const samples = Math.floor((ms / 1000) * sampleRate);
  const headerSize = 44;
  const bytesPerSample = 2;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const dataSize = samples * bytesPerSample;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  let p = 0;
  const writeStr = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i)); };
  const writeU32 = (v) => { view.setUint32(p, v, true); p += 4; };
  const writeU16 = (v) => { view.setUint16(p, v, true); p += 2; };

  writeStr("RIFF");
  writeU32(36 + dataSize);         // chunk size
  writeStr("WAVE");

  // fmt  subchunk
  writeStr("fmt ");
  writeU32(16);                    // subchunk1 size (PCM)
  writeU16(1);                     // audio format = PCM
  writeU16(channels);
  writeU32(sampleRate);
  writeU32(byteRate);
  writeU16(blockAlign);
  writeU16(16);                    // bits per sample

  // data subchunk
  writeStr("data");
  writeU32(dataSize);

  // sine wave
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const amp = Math.sin(2 * Math.PI * freq * t);
    const s = Math.max(-1, Math.min(1, amp));       // clamp
    view.setInt16(p, s * 0x7fff, true);
    p += 2;
  }

  return Buffer.from(buffer);
}

// --- health / ping ---
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

// --- TTS endpoint (stub: returns a WAV beep so the browser can play audio) ---
app.post("/api/tts", async (req, res) => {
  try {
    // const { text } = req.body ?? {}; // currently unused by the stub
    const wav = waveBeepBuffer({ ms: 2000, freq: 1500 });
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(wav);
  } catch (err) {
    console.error("[/api/tts] error:", err);
    res.status(500).json({ error: "TTS error" });
  }
});

// (optional) GET helper to test quickly in a browser tab
app.get("/api/tts", (_req, res) => {
  const wav = waveBeepBuffer({ ms: 1200, freq: 1200 });
  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(wav);
});

// --- Respond: turn a question into an answer (stub that returns {answer}) ---
app.post("/respond", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Missing question" });

    let answer;
    if (/amoxicillin/i.test(question)) {
      answer =
        "Amoxicillin is a penicillin-type antibiotic used for bacterial infections such as ear, sinus, throat, chest and urinary infections.";
    } else {
      answer = `You asked: "${question}". This is a stub response proving the pipeline is wired end-to-end.`;
    }

    res.json({ answer });
  } catch (err) {
    console.error("[/respond] error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[boot] backend listening on :${PORT}`);
});
