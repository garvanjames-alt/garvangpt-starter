// Load embeddings.json and provide cosine similarity search
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embedBatch } from "./embeddings.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_FILE = path.join(__dirname, "..", "data", "embeddings.json");

let INDEX = null;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; dot += x*y; na += x*x; nb += y*y; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export function loadIndex() {
  if (!fs.existsSync(OUT_FILE)) return null;
  INDEX = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  return INDEX;
}

export async function search(query, topK = 5) {
  if (!INDEX) loadIndex();
  if (!INDEX || !INDEX.items?.length) return { query, hits: [] };

  // Embed the query using embedBatch with batchSize=1
  const [qv] = await embedBatch([query], 1);

  const scored = INDEX.items.map(it => ({
    text: it.text,
    source: it.source,
    score: cosine(qv, it.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return { query, hits: scored.slice(0, topK) };
}
