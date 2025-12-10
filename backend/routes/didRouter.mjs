// backend/routes/didRouter.mjs
// Full file. Drop this in backend/routes/didRouter.mjs
// Then import+use it from server.mjs (see note at bottom).

import express from "express";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

const DID_API_KEY = process.env.DID_API_KEY || process.env.DID_KEY;
const DID_BASE = "https://api.d-id.com";
const DID_SOURCE_URL = process.env.DID_SOURCE_URL; // optional override

if (!DID_API_KEY) {
  console.warn("[D-ID] Missing DID_API_KEY env var. /did routes will fail.");
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
  return {
    Authorization: `Basic ${DID_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function createTalkOnDid(audio_url) {
  const payload = {
    script: {
      type: "audio",
      audio_url,
    },
    source_url: DID_SOURCE_URL, // if undefined, D-ID uses default avatar from your DID account
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
  const r = await fetch(`${DID_BASE}/talks/${id}`, {
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
// IMPORTANT: returns immediately (202) with talk_id. Browser won’t 504 anymore.
router.post("/talk", async (req, res) => {
  try {
    const { audio_url } = req.body || {};
    if (!audio_url) return res.status(400).json({ ok: false, error: "missing audio_url" });

    const created = await createTalkOnDid(audio_url);
    const talk_id = created?.id;
    if (!talk_id) throw new Error("D-ID returned no talk id");

    await writeTalk(talk_id, { id: talk_id, status: "created", created_at: Date.now() });

    // 202 Accepted — frontend should poll status endpoint
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

    const didTalk = await getTalkFromDid(id);
    const status = didTalk?.status || "unknown";
    const result_url = didTalk?.result_url;

    await writeTalk(id, { id, status, result_url, raw: didTalk, updated_at: Date.now() });

    return res.json({ ok: true, status, result_url });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;

/*
SERVER WIRING (tiny change in backend/server.mjs):

1) Add at top:
   import didRouter from "./routes/didRouter.mjs";

2) Add where you set routes:
   app.use("/api/did", didRouter);

3) Remove/disable any old /api/did/talk handler to avoid duplicates.
*/

