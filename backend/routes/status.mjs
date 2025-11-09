import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIndex } from "../retriever/retriever.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = Router();

r.get("/admin/search/status", (_req, res) => {
  const p = path.resolve(__dirname, "../data/embeddings.json");
  const exists = fs.existsSync(p);

  let size = 0;
  let itemsOnDisk = 0;

  if (exists) {
    try {
      size = fs.statSync(p).size;
      const d = JSON.parse(fs.readFileSync(p, "utf8"));
      itemsOnDisk = Array.isArray(d.items) ? d.items.length : 0;
    } catch (e) {
      return res.json({ ok: false, error: e.message });
    }
  }

  const idx = loadIndex() || null;
  const itemsInMemory = Array.isArray(idx?.items) ? idx.items.length : 0;
  const apiKeyPresent = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

  res.json({ ok: true, path: p, exists, size, itemsOnDisk, itemsInMemory, apiKeyPresent });
});

export default r;
