// backend/routes/didRouter.mjs
import express from "express";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

const DID_BASE = "https://api.d-id.com";
const DID_SOURCE_URL = process.env.DID_SOURCE_URL; // optional override

// EXPECTATION: DID_API_KEY must be the literal string "API_USERNAME:API_PASSWORD"
// (from D-ID Studio → API Keys). We will base64 encode it here.
const DID_API_KEY = process.env.DID_API_KEY || process.env.DID_KEY;

if (!DID_API_KEY) {
  console.warn("[D-ID] Missing DID_API_KEY env var. /api/did routes will fail.");
}

// Simple on-disk cache for talk statuses (so we can poll)
const talksDir = path.join(process.cwd(), "data", "talks");
async function ensureTalksDir() {
  await fs.mkdir(talksDir, { recursive: true });
}
async function writeTalk(id, obj) {
  await ensureTalksDir();
  const p = path.join(talksDir, `${id}.json`);
  await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf8");
}
async function readTalk(id) {
  try {
    const p = path.join(talksDir, `${id}.json`);
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function didHeaders() {
  if (!DID_API_KEY) {
    return {
      "Content-Type": "application/json",
    };
  }
  const token = Buffer.from(DID_API_KEY).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function createTalkOnDid(audio_url) {
  const payload = {
    script: { type: "audio", audio_url },
    source_url: DID_SOURCE_URL,
    config: { result_format: "mp4" },
  };

  const r = await fetch(`${DID_BASE}/talks`, {
    method: "POST",
    headers: didHeaders(),
    body: JSON.stringify(payload),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.message || j?.error || `D-ID create failed (${r.status})`;
    throw new Error(msg);
  }
  return j; // contains id
}

async function getTalkFromDid(id) {
  const r = await fetch(`${DID_BASE}/talks/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: didHeaders(),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.message || j?.error || `D-ID status failed (${r.status})`;
    throw new Error(msg);
  }
  return j; // contains status + result_url when done
}

// POST /api/did/talk
router.post("/talk", async (req, res) => {
  try {
    const { audio_url } = req.body || {};
    if (!audio_url) return res.status(400).json({ ok: false, error: "missing audio_url" });
    if (!DID_API_KEY) return res.status(500).json({ ok: false, error: "Missing DID_API_KEY" });

    const created = await createTalkOnDid(audio_url);
    const talk_id = created?.id;
    if (!talk_id) throw new Error("D-ID returned no talk id");

    await writeTalk(talk_id, { id: talk_id, status: "created", created_at: Date.now() });

    return res.status(202).json({ ok: true, talk_id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// GET /api/did/talk/:id
router.get("/talk/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: "missing id" });
    if (!DID_API_KEY) return res.status(500).json({ ok: false, error: "Missing DID_API_KEY" });

    const didTalk = await getTalkFromDid(id);
    const status = didTalk?.status || "unknown";
    const result_url = didTalk?.result_url || null;

    await writeTalk(id, { id, status, result_url, raw: didTalk, updated_at: Date.now() });

    return res.json({ ok: true, status, result_url });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
