// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// --- middleware ---
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// --- health check ---
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, service: "backend" });
});

// --- respond endpoint (POST for app; GET for quick browser check) ---
app.post("/api/respond", async (req, res) => {
  try {
    const question = (req.body?.question || "").slice(0, 200);
    console.log(`[respond] ${new Date().toISOString()} q="${question}"`);
    return res.status(200).json({ ok: true, echoed: question });
  } catch (err) {
    console.error("[respond] error", err);
    return res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/respond", (req, res) => {
  res.json({ ok: true, note: "POST /api/respond is ready" });
});

// --- TTS endpoint: returns a small WAV beep so we can test audio flow ---
function wavBeepBuffer({
  freq = 880,
  duration = 0.4,
  sampleRate = 16000,
  volume = 0.25,
} = {}) {
  const samples = Math.floor(duration * sampleRate);
  const data = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const s = Math.sin(2 * Math.PI * freq * t) * volume;
    data[i] = Math.max(-1, Math.min(1, s)) * 0x7fff;
  }

  const byteRate = sampleRate * 2; // mono 16-bit
  const blockAlign = 2;
  const subchunk2Size = data.length * 2;
  const chunkSize = 36 + subchunk2Size;

  const buf = Buffer.alloc(44 + subchunk2Size);
  let o = 0;
  buf.write("RIFF", o); o += 4;
  buf.writeUInt32LE(chunkSize, o); o += 4;
  buf.write("WAVE", o); o += 4;
  buf.write("fmt ", o); o += 4;
  buf.writeUInt32LE(16, o); o += 4;              // PCM header size
  buf.writeUInt16LE(1, o); o += 2;               // PCM format
  buf.writeUInt16LE(1, o); o += 2;               // channels: mono
  buf.writeUInt32LE(sampleRate, o); o += 4;
  buf.writeUInt32LE(byteRate, o); o += 4;
  buf.writeUInt16LE(blockAlign, o); o += 2;
  buf.writeUInt16LE(16, o); o += 2;              // bits per sample
  buf.write("data", o); o += 4;
  buf.writeUInt32LE(subchunk2Size, o); o += 4;

  // PCM data
  for (let i = 0; i < data.length; i++, o += 2) {
    buf.writeInt16LE(data[i], o);
  }
  return buf;
}

app.post("/api/tts", async (req, res) => {
  try {
    const text = (req.body?.text || "").slice(0, 200);
    console.log(`[tts] ${new Date().toISOString()} text="${text}"`);
    const audio = wavBeepBuffer(); // placeholder beep
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audio);
  } catch (err) {
    console.error("[tts] error", err);
    res.status(500).json({ error: "TTS error" });
  }
});

// Convenience GET to test in a browser
app.get("/api/tts", (req, res) => {
  const audio = wavBeepBuffer();
  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(audio);
});

// --- start server ---
app.listen(PORT, () => {
  console.log(`[boot] server listening on :${PORT}`);
});
