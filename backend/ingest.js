// backend/ingest.js (ESM)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- config ----------------------------------------------------
const OUT_PATH = path.resolve(__dirname, "memory.jsonl");
// take scan root from CLI arg, else default to ./data
const SCAN_ROOT = path.resolve(__dirname, process.argv[2] || "data");
// ---------------------------------------------------------------

console.log(`🔎 Scanning: ${SCAN_ROOT}`);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function htmlToText(html) {
  // strip <script>/<style>, tags, collapse whitespace
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadAsText(fp) {
  const ext = path.extname(fp).toLowerCase();
  try {
    if (ext === ".html" || ext === ".htm") {
      const raw = fs.readFileSync(fp, "utf8");
      return htmlToText(raw);
    }
    if (ext === ".txt" || ext === ".md") {
      return fs.readFileSync(fp, "utf8");
    }
    // skip unknown binary types for now (PDFs, images, etc.)
    return "";
  } catch {
    return "";
  }
}

const files = fs.existsSync(SCAN_ROOT) ? walk(SCAN_ROOT) : [];
let written = 0;

const out = fs.createWriteStream(OUT_PATH, { flags: "a" });

for (const fp of files) {
  const text = loadAsText(fp);
  if (!text) continue;

  const rel = path.relative(SCAN_ROOT, fp) || path.basename(fp);
  const rec = {
    id: `${Date.now()}-${written + 1}`,
    source: `ingest:${rel}`,
    text,
  };
  out.write(JSON.stringify(rec) + "\n");
  written++;
}

out.end(() => {
  console.log(`✅ Wrote ${written} records to memory.jsonl`);
});
