// backend/retriever/retriever.mjs
// Mini retriever for Lynch's Pharmacy corpus (Render + local)
//
// - Reads backend/data/embeddings.json
// - Supports multiple index shapes (old + new)
// - Uses OpenAI embeddings for query vector
// - Exports: loadIndex, reloadIfChanged, search, getIndexInfo

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_PATH =
  process.env.RETRIEVER_INDEX_PATH ||
  path.join(__dirname, "..", "data", "embeddings.json");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let cache = {
  index: null,
  mtimeMs: 0,
};

/**
 * Try to normalise whatever JSON format we find on disk into:
 * { documents: [{ text, source }], embeddings: number[][], dim: number }
 */
function normalizeIndex(raw) {
  let documents = [];
  let embeddings = [];
  let dim = 0;

  if (!raw) {
    throw new Error("Empty embeddings.json");
  }

  // Case 1: Array of rows
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      throw new Error("Empty index array");
    }

    const first = raw[0];

    // 1a) [{ embedding: [...], text, source }]
    if (typeof first === "object" && !Array.isArray(first)) {
      if (Array.isArray(first.embedding) || Array.isArray(first.vector)) {
        embeddings = raw.map((r) => r.embedding || r.vector);
        documents = raw.map((r, i) => ({
          text: r.text || r.content || r.chunk || "",
          source:
            r.source ||
            r.path ||
            r.id ||
            (r.metadata && (r.metadata.source || r.metadata.path)) ||
            `doc_${i}`,
        }));
      } else {
        throw new Error(
          "Unexpected array index format: objects missing embedding/vector"
        );
      }
    }

    // 1b) [[...embedding..., text, source]]
    else if (Array.isArray(first)) {
      const rowLen = first.length;
      if (rowLen < 3) {
        throw new Error("Array row too short to contain embedding + payload");
      }
      const payloadCols = 2; // text, source
      const embedLen = rowLen - payloadCols;

      embeddings = raw.map((row) => row.slice(0, embedLen));
      documents = raw.map((row, i) => ({
        text: row[embedLen] ?? "",
        source: row[embedLen + 1] ?? `doc_${i}`,
      }));
    } else {
      throw new Error(
        "Unexpected embeddings.json format: array elements not recognised"
      );
    }
  }

  // Case 2: Object wrapper
  else if (typeof raw === "object") {
    // 2a) { documents: [...], embeddings: [...], dim?, metadata? }
    if (Array.isArray(raw.documents) && Array.isArray(raw.embeddings)) {
      embeddings = raw.embeddings;
      const docs = raw.documents;

      documents = docs.map((d, i) => {
        if (typeof d === "string") {
          return {
            text: d,
            source:
              (raw.sources && raw.sources[i]) ||
              (raw.metadata &&
                raw.metadata[i] &&
                (raw.metadata[i].source || raw.metadata[i].path)) ||
              `doc_${i}`,
          };
        }

        // object-ish
        return {
          text: d.text || d.content || d.chunk || "",
          source:
            d.source ||
            d.path ||
            d.id ||
            (d.metadata && (d.metadata.source || d.metadata.path)) ||
            `doc_${i}`,
        };
      });

      dim = raw.dim || (embeddings[0] ? embeddings[0].length : 0);
    }

    // 2b) { items: [...] } – older or experimental shapes
    else if (Array.isArray(raw.items)) {
      const first = raw.items[0];
      if (
        first &&
        typeof first === "object" &&
        (Array.isArray(first.embedding) || Array.isArray(first.vector))
      ) {
        embeddings = raw.items.map((r) => r.embedding || r.vector);
        documents = raw.items.map((r, i) => ({
          text: r.text || r.content || r.chunk || "",
          source:
            r.source ||
            r.path ||
            r.id ||
            (r.metadata && (r.metadata.source || r.metadata.path)) ||
            `doc_${i}`,
        }));
      } else {
        throw new Error(
          "Unexpected { items: [] } format: objects missing embedding/vector"
        );
      }
    } else {
      console.error(
        "[retriever] Unknown embeddings.json object keys:",
        Object.keys(raw)
      );
      throw new Error(
        "Unexpected embeddings.json format: expected array or { documents: [] }"
      );
    }
  } else {
    throw new Error("Unexpected embeddings.json root type");
  }

  if (!embeddings.length || !documents.length) {
    throw new Error("Index has no documents or embeddings");
  }

  dim = dim || (embeddings[0] ? embeddings[0].length : 0);

  return { documents, embeddings, dim };
}

async function loadIndex() {
  const stat = await fs.stat(INDEX_PATH);
  const mtimeMs = stat.mtimeMs;

  if (cache.index && cache.mtimeMs === mtimeMs) {
    return cache.index;
  }

  const jsonText = await fs.readFile(INDEX_PATH, "utf8");
  const raw = JSON.parse(jsonText);

  const { documents, embeddings, dim } = normalizeIndex(raw);

  const index = { documents, embeddings, dim };
  cache = { index, mtimeMs };

  console.log(
    `[retriever] Loaded index from ${INDEX_PATH} – ${documents.length} docs, dim=${dim}`
  );

  return index;
}

async function reloadIfChanged() {
  try {
    await loadIndex();
  } catch (err) {
    console.error("[retriever] reloadIfChanged failed:", err.message);
  }
}

async function embedQuery(query) {
  const trimmed = (query || "").trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty query");
  }

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: trimmed,
  });

  const vec = res.data[0]?.embedding;
  if (!Array.isArray(vec)) {
    throw new Error("Failed to get query embedding");
  }
  return vec;
}

function cosineSim(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }

  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function search(query, limit = 5) {
  const index = await loadIndex();
  const q = await embedQuery(query);

  const scores = index.embeddings.map((vec, i) => ({
    i,
    score: cosineSim(q, vec),
  }));

  scores.sort((a, b) => b.score - a.score);

  const top = scores.slice(0, limit).map(({ i, score }) => {
    const doc = index.documents[i] || {};
    return {
      text: doc.text || "",
      source: doc.source || `doc_${i}`,
      score,
    };
  });

  return top;
}

function getIndexInfo() {
  if (!cache.index) {
    return {
      loaded: false,
      documents: 0,
      dim: 0,
    };
  }

  return {
    loaded: true,
    documents: cache.index.documents.length,
    dim: cache.index.dim,
  };
}

export { loadIndex, reloadIfChanged, search, getIndexInfo };
