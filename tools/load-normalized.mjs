import { promises as fs } from "fs";
import path from "path";

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("Usage: node tools/load-normalized.mjs <folder1/_normalized> [folder2/_normalized] ...");
  process.exit(1);
}

const MEMO_PATH = "memory.jsonl";           // root-level memory store loaded at boot
const SOURCE_PREFIX = "ingest:";            // we’ll tag sources so UI shows provenance

function toTitle(stem) {
  // stem like: "blog-amoxicillin" -> "Blog Amoxicillin"
  return stem.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function ensureFile(p) {
  if (!(await fileExists(p))) await fs.writeFile(p, "", "utf8");
}

async function main() {
  await ensureFile(MEMO_PATH);

  const seen = new Set(); // avoid duplicate rels
  for (const root of roots) {
    const abs = path.resolve(root);
    const entries = await fs.readdir(abs);
    for (const name of entries) {
      if (!name.endsWith(".txt")) continue;
      const fpath = path.join(abs, name);
      const raw = await fs.readFile(fpath, "utf8");

      // First 2–3 lines are our header block (## Normalized | ## Encoding | ## Format | ## Source-Stem)
      const body = raw.replace(/^##.*\n?/gm, "").trim();
      const stem = (raw.match(/^##\s*Source-Stem:\s*(.+)$/m)?.[1] || name.replace(/\.txt$/, "")).trim();

      const rel = path.relative(process.cwd(), fpath).replaceAll("\\", "/");
      if (seen.has(rel)) continue;
      seen.add(rel);

      const item = {
        id: `ing-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        file: "memory.jsonl",
        source: `${SOURCE_PREFIX}${root}`,
        rel,
        text: body.slice(0, 4000), // safety cap per item
        title: toTitle(stem),
        createdAt: new Date().toISOString()
      };

      await fs.appendFile(MEMO_PATH, JSON.stringify(item) + "\n", "utf8");
      console.log("Added:", rel);
    }
  }
  console.log("Done. Wrote to", MEMO_PATH);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
