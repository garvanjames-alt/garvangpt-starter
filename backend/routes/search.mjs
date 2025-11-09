// backend/routes/search.mjs
import express from "express";
import { search } from "../retriever/retriever.mjs";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load synonyms from backend/search/synonyms.json
const synonymsPath = path.resolve(__dirname, "../search/synonyms.json");
let SYNONYMS = [];
try {
  if (fs.existsSync(synonymsPath)) {
    const text = fs.readFileSync(synonymsPath, "utf8");
    SYNONYMS = JSON.parse(text);
  }
} catch (e) {
  console.error("synonyms_load_error", e?.message || e);
}

// helpers
function expandQuery(q) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return [];
  for (const group of SYNONYMS) {
    const terms = (group?.terms || []).map(t => String(t).trim());
    const found = terms.find(t => t.toLowerCase() === needle);
    if (found) return terms;
  }
  // not found → echo back the original term (UI expects an array)
  return [needle];
}

const router = express.Router();

/**
 * Public search endpoint: /api/search?q=...
 * (kept as-is for your retriever)
 */
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const k = Math.min(10, Math.max(1, Number(req.query.k || 5)));
    if (!q) return res.status(400).json({ error: "missing_q" });
    const result = await search(q, k);
    res.json(result);
  } catch (e) {
    console.error("search_error", e?.message || e);
    res.status(500).json({ error: "search_failed" });
  }
});

/**
 * Admin: list raw synonym groups
 * GET /api/admin/search/synonyms
 */
router.get("/admin/search/synonyms", (_req, res) => {
  if (!Array.isArray(SYNONYMS) || SYNONYMS.length === 0) {
    return res.json({ ok: false, error: "synonyms.json not found" });
  }
  res.json({ ok: true, synonyms: SYNONYMS });
});

/**
 * Admin: expand a term into its synonym group
 * GET /api/admin/search/expand?q=panadol
 */
router.get("/admin/search/expand", (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ ok: false, error: "missing_q" });
    const expanded = expandQuery(q);
    res.json({ ok: true, query: q, expanded });
  } catch (e) {
    console.error("expand_error", e?.message || e);
    res.status(500).json({ ok: false, error: "expand_failed" });
  }
});

// export both ways
export const searchRouter = router;
export default router;
