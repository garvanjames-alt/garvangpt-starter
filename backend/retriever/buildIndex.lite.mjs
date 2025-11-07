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

const MAX = Number(process.env.RAG_MAX_CHUNKS || 50);
const CHUNK_LEN = Number(process.env.RAG_CHUNK_LEN || 300);
const BATCH = Number(process.env.RAG_BATCH || 1);

function chunkText(text, maxLen = CHUNK_LEN) {
  const parts = [];
  let buf = [];
  for (const w of text.split(/\s+/)) {
    buf.push(w);
    if (buf.join(" ").length >= maxLen) { parts.push(buf.join(" ")); buf = []; }
    if (parts.length >= MAX) break;               // <- early stop inside chunking
  }
  if (buf.length && parts.length < MAX) parts.push(buf.join(" "));
  return parts;
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (st.isFile()) yield p;
    }
  }
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const items = [];

  // 1) memory.jsonl first (fast)
  if (fs.existsSync(MEMORY_FILE)) {
    const lines = fs.readFileSync(MEMORY_FILE, "utf8").split(/\n+/).filter(Boolean);
    for (const line of lines) {
      if (items.length >= MAX) break;
      let obj; try { obj = JSON.parse(line); } catch { continue; }
      if (!obj?.text) continue;
      for (const c of chunkText(obj.text)) { items.push({ text: c, source: "memory.jsonl" }); if (items.length >= MAX) break; }
    }
  }

  // 2) ingest folder, stop as soon as we hit MAX
  if (items.length < MAX && fs.existsSync(INGEST_DIR)) {
    for (const fp of walk(INGEST_DIR)) {
      if (items.length >= MAX) break;
      const rel = path.relative(INGEST_DIR, fp);
      const raw = fs.readFileSync(fp, "utf8");
      for (const c of chunkText(raw)) { items.push({ text: c, source: `ingest/${rel}` }); if (items.length >= MAX) break; }
    }
  }

  console.log(`Collected ${items.length} chunks (cap ${MAX}). Embedding with batch=${BATCH}…`);
  const vectors = items.length ? await embedBatch(items.map(i=>i.text), BATCH) : [];

  const payload = {
    model: "text-embedding-3-small",
    dims: vectors[0]?.length || 1536,
    createdAt: new Date().toISOString(),
    count: items.length,
    items: items.map((it, i) => ({ id:i, text:it.text, source:it.source, vector: vectors[i] })),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
