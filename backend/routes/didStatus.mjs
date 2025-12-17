// backend/routes/didStatus.mjs
// Poll D-ID for a talk status (server-side, safe for browser).

import express from "express";

const router = express.Router();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// GET /api/did/status?talk_id=tlk_...
router.get("/did/status", async (req, res) => {
  try {
    const talkId = String(req.query.talk_id || "").trim();
    if (!talkId) return res.status(400).json({ ok: false, error: "Missing talk_id" });

    const email = requireEnv("DID_EMAIL");
    const apiKey = requireEnv("DID_API_KEY");
    const basic = Buffer.from(`${email}:${apiKey}`).toString("base64");

    const url = `https://api.d-id.com/talks/${encodeURIComponent(talkId)}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = json?.error || json?.Message || json?.message || `D-ID status failed (${resp.status})`;
      return res.status(502).json({ ok: false, error: msg, did_status: resp.status, did_body: json });
    }

    // Pass-through (includes status + result_url when ready)
    return res.json({ ok: true, did: json });
  } catch (err) {
    console.error("[didStatus] error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;
