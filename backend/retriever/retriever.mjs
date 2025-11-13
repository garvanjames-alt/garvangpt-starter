// backend/retriever/retriever.mjs
// Mini cosine-similarity retriever over backend/data/embeddings.json

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This is where buildIndex.lite.mjs writes your Lynch's Pharmacy index
const INDEX_PATH = path.join(__dirname, "..", "data", "embeddings.json");

// In-memory index: [{ id, text, source, embedding, norm }]
let _docs = null;
let _loaded = false;
let _dim = 0;

function l2Norm(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    sum += v * v;
  }
  return Math.sqrt(sum) || 1e-8;
}

function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// ---------------- INDEX LOADING ----------------

async function loadIndex() {
  if (_loaded) return;

  const raw = await fs.readFile(INDEX_PATH, "utf8");
  const parsed = JSON.parse(raw);

  let docsRaw;
  if (Array.isArray(parsed)) {
    docsRaw = parsed;
  } else if (Array.isArray(parsed.documents)) {
    docsRaw = parsed.documents;
  } else {
    throw new Error(
      "Unexpected embeddings.json format: expected array or { documents: [] }"
    );
  }

  _docs = docsRaw.map((doc, idx) => {
    const embedding =
      doc.embedding || doc.vector || doc.embedding_vector || [];
    const text = doc.text || doc.content || "";
    const source =
      doc.source ||
      (doc.meta && (doc.meta.source || doc.meta.path || doc.meta.url)) ||
      "";
    return {
      id: doc.id ?? idx,
      text,
      source,
      embedding,
      norm: l2Norm(embedding),
    };
  });

  _dim = _docs[0]?.embedding?.length ?? 0;
  _loaded = true;

  console.log(
    `[retriever] Loaded ${_docs.length} docs (dim=${_dim}) from ${INDEX_PATH}`
  );
}

// Basic info used by /api/search and /health routes
async function getIndexInfo() {
  if (!_loaded) {
    await loadIndex();
  }
  return {
    ok: true,
    count: _docs.length,
    dim: _dim,
    path: INDEX_PATH,
  };
}

// On Render we don't watch the filesystem; just ensure it's loaded.
// This keeps the old API shape without complexity.
async function reloadIfChanged() {
  if (!_loaded) {
    await loadIndex();
    return { reloaded: true };
  }
  return { reloaded: false };
}

// ---------------- QUERY EMBEDDING ----------------

async function embedQuery(query) {
  const model =
    process.env.EMBEDDING_MODEL || "text-embedding-3-small";

  const res = await openai.embeddings.create({
    model,
    input: query,
  });

  const embedding = res.data[0].embedding;
  return {
    embedding,
    norm: l2Norm(embedding),
  };
}

// ---------------- MAIN SEARCH API ----------------

async function search(query, limit = 5) {
  if (!_loaded) {
    await loadIndex();
  }

  if (!query || typeof query !== "string") {
    return { query: query ?? "", hits: [] };
  }

  const { embedding: qVec, norm: qNorm } = await embedQuery(query);

  const scored = _docs.map((d) => {
    const dot = cosineSimilarity(qVec, d.embedding);
    const score = dot / (qNorm * d.norm || 1e-8);
    return {
      text: d.text,
      source: d.source,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const hits = scored.slice(0, limit);

  return {
    query,
    hits,
  };
}

// ---------------- EXPORTS ----------------

// Named exports expected around the codebase:
export { search, loadIndex, getIndexInfo, reloadIfChanged };

// Aliases in case other modules use older names
export const initRetriever = loadIndex;
export const init = loadIndex;
export const searchIndex = search;
export const searchDocuments = search;

// Default export for `import retriever from ...`
const retriever = {
  search,
  loadIndex,
  getIndexInfo,
  reloadIfChanged,
  initRetriever: loadIndex,
  init: loadIndex,
  searchIndex: search,
  searchDocuments: search,
};

export default retriever;
