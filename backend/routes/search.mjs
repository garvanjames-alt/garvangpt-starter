import express from "express";
import { search } from "../retriever/retriever.mjs";

export const searchRouter = express.Router();

searchRouter.get("/search", async (req, res) => {
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
