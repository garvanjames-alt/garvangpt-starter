// backend/retriever/retriever.mjs
// Transparent, reloadable retriever.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embedBatch } from "./embeddings.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow override via env; default to the existing embeddings.json
const DEFAULT_FILE = process.env.EMBEDDINGS_FILE ||
  path.join(__dirname, "..", "data", "embeddings.json");

let INDEX = null;
let LOADED_PATH = null;
let LOADED_MTIME = 0;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y; na += x * x; nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export function loadIndex(filePath = DEFAULT_FILE) {
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) return null;

  const stat = fs.statSync(p);
  const raw = fs.readFileSync(p, "utf8");
  INDEX = JSON.parse(raw);
  LOADED_PATH = p;
  LOADED_MTIME = stat.mtimeMs;
  return INDEX;
}

export function reloadIfChanged() {
  const p = LOADED_PATH || DEFAULT_FILE;
  if (!fs.existsSync(p)) return false;
  const stat = fs.statSync(p);
  if (!INDEX || stat.mtimeMs !== LOADED_MTIME) {
    loadIndex(p);
    return true;
  }
  return false;
}

export function getIndexInfo() {
  const p = LOADED_PATH || DEFAULT_FILE;
  let count = 0, model = "unknown", createdAt = null, sampleSources = [];
  if (INDEX?.items?.length) {
    count = INDEX.items.length;
    model = INDEX.model || model;
    createdAt = INDEX.createdAt || null;
    const uniq = new Set(INDEX.items.map(it => it.source));
    sampleSources = Array.from(uniq).slice(0, 8);
  }
  return { file: p, count, model, createdAt, sampleSources, loadedMtime: LOADED_MTIME };
}

export async function search(query, topK = 5) {
  if (!INDEX) loadIndex();           // initial load
  reloadIfChanged();                 // hot-reload if file changed
  if (!INDEX || !INDEX.items?.length) {
    return { query, hits: [] };
  }
  const [qv] = await embedBatch([query], 1);
  const scored = INDEX.items.map(it => ({
    text: it.text,
    source: it.source,
    score: cosine(qv, it.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return { query, hits: scored.slice(0, topK) };
}
