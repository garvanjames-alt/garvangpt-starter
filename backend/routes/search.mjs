// backend/routes/search.mjs
import express from "express";
import {
  search,
  getIndexInfo,
  loadIndex,
  reloadIfChanged,
} from "../retriever/retriever.mjs";

const router = express.Router();

// GET /api/search?q=...&limit=...
router.get("/", async (req, res) => {
  const q = (req.query.q || "").toString();
  const limitParam = parseInt(req.query.limit ?? "5", 10);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 5;

  if (!q) {
    return res.json({ query: "", hits: [] });
  }

  try {
    // Make sure index is loaded (and reloaded if needed)
    await reloadIfChanged();
    await loadIndex();

    const result = await search(q, limit);
    return res.json(result);
  } catch (err) {
    console.error("[/api/search] Error during search:", err);
    return res.status(500).json({
      error: "search_failed",
      message: err.message || "Unknown error",
      // stack is useful in local dev; on Render you’ll at least get message
    });
  }
});

// Optional: GET /api/search/info for debugging
router.get("/info", async (req, res) => {
  try {
    await loadIndex();
    const info = await getIndexInfo();
    return res.json(info);
  } catch (err) {
    console.error("[/api/search/info] Error:", err);
    return res.status(500).json({
      error: "info_failed",
      message: err.message || "Unknown error",
    });
  }
});

export default router;
