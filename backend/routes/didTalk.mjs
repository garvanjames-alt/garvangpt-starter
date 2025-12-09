// backend/routes/didTalk.mjs
// Creates a D-ID "talk" video from a still image + text OR an external audio URL.
// Uses Studio REST API Basic auth.
// IMPORTANT: DID_API_KEY must be the literal string "API_USERNAME:API_PASSWORD"
// from D-ID Studio → API Keys (NOT the client_key, NOT base64).

import express from "express";

const router = express.Router();
const DID_API_BASE = "https://api.d-id.com";

// Studio REST key (username:password)
const DID_API_KEY = process.env.DID_API_KEY;

// Default public HTTPS image URL (must return 200 image/* without redirects)
const DEFAULT_SOURCE_URL = (
  process.env.DID_SOURCE_URL ||
  "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg"
).trim();

function didAuthHeader() {
  if (!DID_API_KEY) return null;
  const token = Buffer.from(DID_API_KEY).toString("base64");
  return `Basic ${token}`;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

router.post("/did/talk", async (req, res) => {
  try {
    const auth = didAuthHeader();
    if (!auth) {
      return res.status(500).json({ ok: false, error: "Missing DID_API_KEY" });
    }

    // Allow overriding source_url for debugging (optional)
    const sourceUrl = (req.body?.source_url || DEFAULT_SOURCE_URL || "").trim();
    if (!sourceUrl) {
      return res.status(500).json({ ok: false, error: "Missing DID_SOURCE_URL" });
    }

    const text = (req.body?.text || "").trim();
    const audioUrl = (req.body?.audio_url || "").trim();

    if (!text && !audioUrl) {
      return res.status(400).json({ ok: false, error: "Provide text or audio_url" });
    }

    // If audio_url provided, it MUST be public https for D-ID
    if (audioUrl && !/^https:\/\//i.test(audioUrl)) {
      return res.status(400).json({
        ok: false,
        error:
          "audio_url must be a PUBLIC HTTPS url (D-ID cannot fetch localhost or http).",
        got: audioUrl,
      });
    }

    // Optional provider override from body (text mode only)
    // Example (ElevenLabs): { type:"elevenlabs", voice_id:"..." }
    const provider = req.body?.provider;

    // ✅ IMPORTANT FIX:
    // If caller sends audio_url, trust it and DO NOT override.
    const script = audioUrl
      ? { type: "audio", audio_url: audioUrl }
      : { type: "text", input: text, ...(provider ? { provider } : {}) };

    const payload = {
      source_url: sourceUrl,
      script,
      config: { result_format: "mp4" },
    };

    const createResp = await fetch(`${DID_API_BASE}/talks`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const createText = await createResp.text();
    if (!createResp.ok) {
      return res.status(createResp.status).json({
        ok: false,
        error: `D-ID create failed (${createResp.status}): ${createText}`,
        status: createResp.status,
        sent: payload,
      });
    }

    let created;
    try {
      created = JSON.parse(createText);
    } catch {
      return res
        .status(502)
        .json({ ok: false, error: "Bad JSON from D-ID", raw: createText });
    }

    const talkId = created.id;
    if (!talkId) {
      return res
        .status(502)
        .json({ ok: false, error: "No talk id returned", created });
    }

    // Poll until done (up to ~30s)
    let resultUrl = null;
    let lastStatus = null;

    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const getResp = await fetch(`${DID_API_BASE}/talks/${talkId}`, {
        headers: { Authorization: auth, Accept: "application/json" },
      });
      if (!getResp.ok) continue;

      const talk = await getResp.json();
      lastStatus = talk.status;

      if (talk.status === "done" && talk.result_url) {
        resultUrl = talk.result_url;
        break;
      }

      if (talk.status === "error") {
        return res
          .status(502)
          .json({ ok: false, error: "D-ID talk errored", talk });
      }
    }

    if (!resultUrl) {
      return res.status(504).json({
        ok: false,
        error: "Timed out waiting for D-ID video",
        last_status: lastStatus,
        talk_id: talkId,
      });
    }

    return res.json({ ok: true, result_url: resultUrl, talk_id: talkId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
