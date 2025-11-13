// backend/routes/search.mjs
import express from "express";
import { search, getIndexInfo, loadIndex, reloadIfChanged } from "../retriever/retriever.mjs";

const router = express.Router();

// GET /api/search?q=...&k=5
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "");
  const k = Math.max(1, Math.min(20, Number(req.query.k || 5)));
  try {
    const out = await search(q, k);
    res.json(out);
  } catch (err) {
    console.error("[/api/search] error:", err);
    res.status(500).json({ error: "search_failed" });
  }
});

// GET /api/status → show retriever file, count, sources
router.get("/status", (_req, res) => {
  try {
    const info = getIndexInfo();
    res.json({ ok: true, retriever: info });
  } catch (e) {
    res.status(500).json({ ok: false, error: "status_failed" });
  }
});

// POST /api/reload → force reload
router.post("/reload", (_req, res) => {
  try {
    const changed = reloadIfChanged() || (!getIndexInfo().count && !!loadIndex());
    res.json({ ok: true, reloaded: changed, info: getIndexInfo() });
  } catch (e) {
    res.status(500).json({ ok: false, error: "reload_failed" });
  }
});

export default router;
