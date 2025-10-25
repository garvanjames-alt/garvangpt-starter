// backend/query.js
// Tiny local RAG indexer + retriever (no embeddings). Reads ./data/*.txt|md
// BM25-ish TF‑IDF scoring with quick sentence snippets.

const fs = require("fs");
const path = require("path");

// ---- Tokenizer (very lenient, ASCII fold-ish) ----
function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// ---- Build index ----
let _INDEX = null; // { docs: [...], df: Map, idf: Map, avgLen }

function buildIndex({ dataDir = path.join(__dirname, "data") } = {}) {
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => /\.(txt|md)$/i.test(f))
    .sort();

  const docs = [];
  const df = new Map(); // term -> doc frequency

  for (const file of files) {
    const full = path.join(dataDir, file);
    const text = fs.readFileSync(full, "utf8");

    // Keep a line-broken version to craft snippets later
    const lines = text.split(/\r?\n/);

    const tokens = tokenize(text);
    const len = tokens.length || 1;
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

    // doc frequency update (unique terms only)
    for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);

    docs.push({ id: docs.length, file: `data/${file}`, text, lines, tokens, tf, len });
  }

  const N = Math.max(1, docs.length);
  const idf = new Map();
  for (const [term, freq] of df.entries()) {
    // BM25 idf: ln((N - df + 0.5)/(df + 0.5) + 1)
    const val = Math.log((N - freq + 0.5) / (freq + 0.5) + 1);
    idf.set(term, val > 0 ? val : 0.0001);
  }

  const avgLen = docs.reduce((a, d) => a + d.len, 0) / N;

  _INDEX = { docs, df, idf, avgLen, N };
  console.log(
    `>>> RAG index built: { docs: ${N}, terms: ${idf.size}, avgLen: ${avgLen.toFixed(1)} }`
  );
  return _INDEX;
}

function ensureIndex() {
  return _INDEX || buildIndex();
}

// ---- Scoring (BM25-ish) ----
const k1 = 1.5;
const b = 0.75;

function scoreDoc(queryTokens, doc, idf) {
  let score = 0;
  for (const q of queryTokens) {
    const f = doc.tf.get(q) || 0;
    if (!f) continue;
    const idfQ = idf.get(q) || 0;
    const denom = f + k1 * (1 - b + (b * doc.len) / (ensureIndex().avgLen || 1));
    score += idfQ * ((f * (k1 + 1)) / denom);
  }
  return score;
}

// ---- Snippet: choose line with most query terms; fall back to first 200 chars ----
function bestSnippet(doc, queryTokens) {
  const qset = new Set(queryTokens);
  let best = "";
  let bestHits = -1;
  for (const line of doc.lines) {
    const hits = tokenize(line).filter((t) => qset.has(t)).length;
    if (hits > bestHits && line.trim().length > 0) {
      bestHits = hits;
      best = line.trim();
    }
  }
  if (!best) {
    best = doc.text.slice(0, 200).replace(/\s+/g, " ").trim();
  }
  return best;
}

// ---- Query API ----
function queryDocs(query, { k = 5 } = {}) {
  const idx = ensureIndex();
  const qTokens = tokenize(query).slice(0, 40);
  if (qTokens.length === 0) return [];

  const scored = idx.docs.map((d) => ({ doc: d, raw: scoreDoc(qTokens, d, idx.idf) }));
  scored.sort((a, b) => b.raw - a.raw);

  // normalize to [0,1]
  const max = Math.max(1e-9, scored[0]?.raw || 0);
  const top = scored.slice(0, k).map(({ doc, raw }) => ({
    file: doc.file,
    score: raw / max,
    snippet: bestSnippet(doc, qTokens),
  }));
  return top;
}

module.exports = { buildIndex, ensureIndex, queryDocs };
