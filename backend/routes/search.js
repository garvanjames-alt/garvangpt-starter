import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const r = Router();

// Path to the synonyms file (relative to this route file)
const SYN_PATH = path.resolve(__dirname, "../search/synonyms.json");

function readSynonyms() {
  if (!fs.existsSync(SYN_PATH)) {
    return { ok: false, error: "synonyms.json not found", synonyms: [] };
  }
  try {
    const raw = fs.readFileSync(SYN_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return { ok: false, error: "synonyms.json must be an array", synonyms: [] };
    }
    return { ok: true, synonyms: data };
  } catch (e) {
    return { ok: false, error: e.message, synonyms: [] };
  }
}

// --- 1) Read-only endpoint to fetch all synonyms ---
// GET /api/admin/search/synonyms
r.get("/admin/search/synonyms", (_req, res) => {
  const result = readSynonyms();
  if (!result.ok) return res.status(404).json({ ok: false, error: result.error });
  return res.json({ ok: true, synonyms: result.synonyms });
});

// --- 2) Expand a single query to its synonym set ---
// GET /api/admin/search/expand?q=<term>
r.get("/admin/search/expand", (req, res) => {
  const q = (req.query.q ?? "").toString().trim();
  if (!q) return res.status(400).json({ ok: false, error: "missing q" });

  const result = readSynonyms();
  if (!result.ok) return res.status(404).json({ ok: false, error: result.error });

  const lc = q.toLowerCase();
  let expanded = null;
  for (const group of result.synonyms) {
    const terms = Array.isArray(group?.terms) ? group.terms : [];
    const match = terms.some(t => t.toLowerCase() === lc);
    if (match) {
      expanded = [...new Set(terms.map(t => t.toLowerCase()))];
      break;
    }
  }

  if (!expanded) {
    expanded = [lc];
  }

  return res.json({ ok: true, query: q, expanded });
});

export default r;
