// backend/server.mjs
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// middleware
app.use(cors());                  // safe even if we front it with rewrites
app.use(express.json({ limit: "1mb" }));

// health
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

// ---- NEW: answer endpoint ----
app.post("/api/respond", (req, res) => {
  const question = (req.body && req.body.question) || "";
  // minimal stub answer so the UI can render something
  const answer =
    question
      ? `Stub answer: "${question}" is an antibiotic in the penicillin family.`
      : "Hello from /api/respond (stub).";

  res.json({ ok: true, echoed: question, answer });
});

// ---- TTS stub: returns a tiny WAV so audio can play ----
app.post("/api/tts", async (req, res) => {
  // generate a tiny 0.35s 440Hz beep @ 8000Hz mono, 16-bit PCM
  const sampleRate = 8000;
  const durationSec = 0.35;
  const freq = 440;
  const samples = Math.floor(sampleRate * durationSec);
  const pcm = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    pcm[i] = Math.floor(0.25 * 32767 * Math.sin((2 * Math.PI * freq * i) / sampleRate));
  }

  // build WAV header + data
  const byteRate = sampleRate * 2; // mono * 16-bit
  const blockAlign = 2;
  const dataBytes = pcm.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  // RIFF/WAVE header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);          // PCM chunk size
  buffer.writeUInt16LE(1, 20);           // PCM format
  buffer.writeUInt16LE(1, 22);           // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);          // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < pcm.length; i++) {
    buffer.writeInt16LE(pcm[i], 44 + i * 2);
  }

  res.setHeader("Content-Type", "audio/wav");
  res.status(200).send(buffer);
});

// start
app.listen(PORT, () => {
  console.log(`[boot] backend listening on :${PORT}`);
});
