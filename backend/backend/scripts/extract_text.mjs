// Minimal HTML -> text extractor + chunker
// Usage (from repo root or inside backend/):
// node backend/scripts/extract_text.mjs \
//   --in=backend/data/ingest/website \
//   --out=backend/data/ingest/website_text \
//   --json=backend/data/ingest/website_chunks.jsonl \
//   --chunk=1200 --overlap=150

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { load } from "cheerio";// <-- correct ESM import

// ---------------- CLI args ----------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a, true];
  })
);

const IN_DIR = args.in || "backend/data/ingest/website";
const OUT_DIR = args.out || "backend/data/ingest/website_text";
const JSONL_OUT = args.json || "backend/data/ingest/website_chunks.jsonl";
const CHUNK = Number(args.chunk ?? 1200);
const OVERLAP = Number(args.overlap ?? 150);

// ---------------- utils ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureParentDir(p) {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function readFileUTF8(p) {
  return await fs.readFile(p, "utf8");
}

function htmlToText(html) {
  const $ = load(html);

  // Remove obviously noisy bits
  $("script, style, noscript, iframe").remove();
  // optional: nav/footer sidebars
  $("nav, footer").remove();

  const text = $("body").text() || $.root().text();
  // normalize whitespace
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoChunks(text, size = 1200, overlap = 150) {
  if (!text) return [];
  const chunks = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const end = Math.min(i + size, len);
    const slice = text.slice(i, end).trim();
    if (slice) chunks.push(slice);
    if (end >= len) break;
    i = end - overlap; // step back for overlap
    if (i < 0) i = 0;
  }
  return chunks;
}

function relFromIn(p) {
  return path.relative(IN_DIR, p);
}

// ---------------- main ----------------
async function main() {
  let files = 0;
  let chunksTotal = 0;

  await ensureParentDir(JSONL_OUT);
  // Truncate JSONL on each run
  await fs.writeFile(JSONL_OUT, "", "utf8");
  await fs.mkdir(OUT_DIR, { recursive: true });

  for await (const fp of walk(IN_DIR)) {
    if (!fp.match(/\.html?$/i)) continue;

    const html = await readFileUTF8(fp);
    const text = htmlToText(html);
    if (!text) continue;

    // write a .txt sibling in OUT_DIR mirroring structure
    const rel = relFromIn(fp).replace(/\.html?$/i, ".txt");
    const outTxt = path.join(OUT_DIR, rel);
    await ensureParentDir(outTxt);
    await fs.writeFile(outTxt, text, "utf8");

    const chunks = splitIntoChunks(text, CHUNK, OVERLAP);
    // append JSONL
    const lines = chunks.map((c) =>
      JSON.stringify({
        source: "website",
        file: fp,
        rel,
        text: c,
      })
    );
    await fs.appendFile(JSONL_OUT, lines.join("\n") + "\n", "utf8");

    files++;
    chunksTotal += chunks.length;
  }

  console.log(`\n✅ Done. Files processed: ${files}. Chunks written: ${chunksTotal}.`);
  console.log(`Text dir: ${OUT_DIR}`);
  console.log(`JSONL :  ${JSONL_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
