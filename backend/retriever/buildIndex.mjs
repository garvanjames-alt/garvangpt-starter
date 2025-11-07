// Build an embeddings index from /ingest and backend/memory.jsonl (batched)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embedBatch } from "./embeddings.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND = path.join(__dirname, "..");
const INGEST_DIR = path.join(BACKEND, "..", "ingest");
const MEMORY_FILE = path.join(BACKEND, "memory.jsonl");
const OUT_DIR = path.join(BACKEND, "data");
const OUT_FILE = path.join(OUT_DIR, "embeddings.json");

function chunkText(text, maxLen = Number(process.env.RAG_CHUNK_LEN||600)) {
  const tokens = text.split(/\s+/);
  const parts = [];
  let buf = [];
  for (const t of tokens) {
    buf.push(t);
    if (buf.join(" ").length >= maxLen) { parts.push(buf.join(" ")); buf = []; }
  }
  if (buf.length) parts.push(buf.join(" "));
  return parts;
}
function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) files.push(...walk(p));
    else if (st.isFile()) files.push(p);
  }
  return files;
}
function readJsonl(fp) {
  const docs = [];
  if (!fs.existsSync(fp)) return docs;
  const lines = fs.readFileSync(fp, "utf8").split(/\n+/).filter(Boolean);
  for (const line of lines) { try { docs.push(JSON.parse(line)); } catch {} }
  return docs; // expects {text, source?}
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const items = [];

  // ingest
  for (const fp of walk(INGEST_DIR)) {
    const rel = path.relative(INGEST_DIR, fp);
    const raw = fs.readFileSync(fp, "utf8");
    for (const chunk of chunkText(raw)) items.push({ text: chunk, source: `ingest/${rel}` });
  }

  // memory.jsonl
  for (const row of readJsonl(MEMORY_FILE)) {
    if (!row?.text) continue;
    for (const chunk of chunkText(row.text)) items.push({ text: chunk, source: row.source || "memory.jsonl" });
  }

  const MAX=Number(process.env.RAG_MAX_CHUNKS||2000);
const pool=items.slice(0,MAX);
console.log(`Indexing ${pool.length} chunks (of ${items.length})...`);
  if (items.length === 0) console.warn("No content found — index will be empty.");

  const vectors = items.length ? await embedBatch(items.map(i => i.text), 4) : [];

  const index = pool.map((it, i) => ({
    id: i,
    text: it.text,
    source: it.source,
    vector: vectors[i],
  }));

  const payload = {
    model: "text-embedding-3-small",
    dims: vectors[0]?.length || 1536,
    createdAt: new Date().toISOString(),
    count: index.length,
    items: index,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
}

if (import.meta.url === `file://${__filename}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
