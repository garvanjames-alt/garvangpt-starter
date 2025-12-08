// backend/routes/didClientKey.mjs
// Provides a browser-safe way for the frontend to get a D‑ID client_key.
// IMPORTANT:
// - We *prefer* a pre-generated key in DID_CLIENT_KEY to avoid plan/policy blocks.
// - Only fall back to D‑ID API if DID_CLIENT_KEY is missing.

import express from "express";

const router = express.Router();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// GET /api/did/client-key
router.get("/did/client-key", async (_req, res) => {
  try {
    const envClientKey = process.env.DID_CLIENT_KEY;
    if (envClientKey) {
      return res.json({ ok: true, client_key: envClientKey, source: "env" });
    }

    const email = requireEnv("DID_EMAIL");
    const apiKey = requireEnv("DID_API_KEY");

    const basic = Buffer.from(`${email}:${apiKey}`).toString("base64");

    // Try GET first
    let resp = await fetch("https://api.d-id.com/agents/client-key", {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
    });

    // If GET fails, try POST to create
    if (!resp.ok) {
      resp = await fetch("https://api.d-id.com/agents/client-key", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    }

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json?.client_key) {
      const msg = json?.error || json?.Message || json?.message || "Unable to get D‑ID client key";
      throw new Error(msg);
    }

    return res.json({ ok: true, client_key: json.client_key, source: "api" });
  } catch (err) {
    console.error("[didClientKey] error:", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;
