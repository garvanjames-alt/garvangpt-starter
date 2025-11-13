import fs from "fs";
import path from "path";
import { embedBatch } from "./embeddings.mjs";

const inDir = process.argv[2] || "ingest2/full_filtered";
const outFile = process.argv[3] || "backend/data/embeddings.json";

const absIn = path.resolve(inDir);
const absOut = path.resolve(outFile);

if (!fs.existsSync(absIn)) {
  console.error("Input folder missing:", absIn);
  process.exit(1);
}

// ---- simple paragraph-aware chunking ----
const MAX_CHARS = 4000;        // keep well under token limit
const MIN_CHARS = 600;         // avoid ultra-tiny fragments

function splitParagraphs(text) {
  return text.replace(/\r/g, "").split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
}
function chunkText(text) {
  const parts = splitParagraphs(text);
  const chunks = [];
  let buf = "";
  for (const p of parts) {
    // if a single paragraph is huge, slice it hard
    if (p.length > MAX_CHARS) {
      for (let i = 0; i < p.length; i += MAX_CHARS) {
        const slice = p.slice(i, i + MAX_CHARS);
        if (slice.trim()) chunks.push(slice.trim());
      }
      continue;
    }
    if ((buf + "\n\n" + p).length <= MAX_CHARS) {
      buf = buf ? (buf + "\n\n" + p) : p;
    } else {
      if (buf.length) chunks.push(buf);
      buf = p;
    }
  }
  if (buf.length) chunks.push(buf);

  // merge very small trailing chunks
  const out = [];
  for (const c of chunks) {
    if (out.length && (c.length < MIN_CHARS || out[out.length-1].length < MIN_CHARS) &&
        (out[out.length-1].length + c.length) <= MAX_CHARS) {
      out[out.length-1] = (out[out.length-1] + "\n\n" + c).trim();
    } else {
      out.push(c.trim());
    }
  }
  return out;
}

// collect chunks
const files = fs.readdirSync(absIn).filter(f => f.endsWith(".txt")).sort();
const chunks = [];
let cid = 0;
for (const f of files) {
  const p = path.join(absIn, f);
  const text = fs.readFileSync(p, "utf8").trim();
  if (!text) continue;
  const cs = chunkText(text);
  cs.forEach((c, i) => {
    chunks.push({ id: cid++, text: c, source: path.relative(process.cwd(), p) + "#c" + String(i+1) });
  });
}

if (chunks.length === 0) {
  console.error("No text chunks found in", absIn);
  process.exit(1);
}

// embed
const vectors = await embedBatch(chunks.map(c => c.text), 1);
const items = chunks.map((c, i) => ({ ...c, vector: vectors[i] }));

const out = {
  model: "text-embedding-3-small",
  dims: (vectors[0] || []).length,
  createdAt: new Date().toISOString(),
  count: items.length,
  items
};

fs.mkdirSync(path.dirname(absOut), { recursive: true });
fs.writeFileSync(absOut, JSON.stringify(out));
console.log("Wrote " + items.length + " items to " + absOut);
