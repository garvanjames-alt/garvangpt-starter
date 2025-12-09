// backend/routes/speak.mjs
// ElevenLabs TTS -> returns { ok:true, audioUrl:"/api/audio/<id>.mp3" }
// We store a temp mp3 locally so D-ID can fetch it via your backend public URL later.

import express from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const router = express.Router();

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = process.env.ELEVEN_VOICE_ID; // your cloned voice
const ELEVEN_MODEL_ID = process.env.ELEVEN_MODEL_ID || "eleven_multilingual_v2";

const TMP_DIR = path.join(process.cwd(), "tmp_audio");

async function ensureTmpDir() {
  try { await fs.mkdir(TMP_DIR, { recursive: true }); } catch {}
}

// POST /api/speak  { text:"..." }
router.post("/speak", async (req, res) => {
  try {
    if (!ELEVEN_API_KEY || !ELEVEN_VOICE_ID) {
      return res.status(500).json({
        ok: false,
        error: "Missing ELEVEN_API_KEY or ELEVEN_VOICE_ID in backend/.env",
      });
    }

    const text = (req.body?.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`;

    const elevenResp = await fetch(elevenUrl, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL_ID,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!elevenResp.ok) {
      const errText = await elevenResp.text();
      return res.status(502).json({
        ok: false,
        error: `ElevenLabs failed (${elevenResp.status}): ${errText}`,
      });
    }

    const buf = Buffer.from(await elevenResp.arrayBuffer());
    await ensureTmpDir();

    const id = crypto.randomBytes(8).toString("hex");
    const fileName = `${id}.mp3`;
    const filePath = path.join(TMP_DIR, fileName);

    await fs.writeFile(filePath, buf);

    // Public-ish URL served by the route below
    return res.json({ ok: true, audioUrl: `/api/audio/${fileName}` });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// GET /api/audio/:file  -> serves temp mp3
router.get("/audio/:file", async (req, res) => {
  try {
    const file = req.params.file;
    const filePath = path.join(TMP_DIR, file);

    const data = await fs.readFile(filePath);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.send(data);
  } catch {
    return res.status(404).send("not found");
  }
});

export default router;
