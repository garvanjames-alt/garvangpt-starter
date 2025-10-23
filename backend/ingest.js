// backend/ingest.js  (ESM; Node >= 18)

import { createWriteStream } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const OUT_FILE = path.join(__dirname, "memory.jsonl");

function splitIntoChunks(text, max = 1000) {
  const paras = text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max) {
      if (buf) chunks.push(buf.trim());
      if (p.length > max) {
        for (let i = 0; i < p.length; i += max) chunks.push(p.slice(i, i + max));
      } else {
        buf = p;
      }
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

async function main() {
  const files = (await readdir(DATA_DIR))
    .filter(f => /\.(txt|md|mdx)$/i.test(f))
    .map(f => path.join(DATA_DIR, f));

  console.log(`🔎  Scanning: ${DATA_DIR}`);
  const stream = createWriteStream(OUT_FILE, { flags: "w" });
  let total = 0;

  for (const file of files) {
    const rel = path.relative(__dirname, file);
    const text = await readFile(file, "utf8");
    const chunks = splitIntoChunks(text, 1000);

    chunks.forEach((chunk, idx) => {
      const rec = {
        id: `${path.basename(file)}:${idx}`,
        source: rel,
        text: chunk,
        ts: Date.now(),
        tags: ["ingested"],
      };
      stream.write(JSON.stringify(rec) + "\n");
      total++;
    });

    console.log(`• Ingested ${rel} → ${chunks.length} chunk(s)`);
  }

  stream.end();
  await new Promise(res => stream.on("close", res));
  console.log(`✅ Wrote ${total} records to ${path.relative(__dirname, OUT_FILE)}`);
}

main().catch(err => {
  console.error("❌ Ingest failed:", err);
  process.exit(1);
});
