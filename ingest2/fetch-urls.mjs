import fs from "fs/promises";
import path from "path";

const inFile = process.argv[2];
const outDir = process.argv[3];
const offset = Number(process.argv[4] || 0);
const limit  = Number(process.argv[5] || 20);

if (!inFile || !outDir) {
  console.error("Usage: node fetch-urls.mjs <urls.txt> <outDir> [offset] [limit]");
  process.exit(1);
}
await fs.mkdir(outDir, { recursive: true });

const raw = await fs.readFile(inFile, "utf8");
const urls = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(offset, offset + limit);

// find the next available web_### index
async function nextIndex(dir) {
  let max = 0;
  for (const name of await fs.readdir(dir)) {
    const m = name.match(/^web_(\d{3})\.txt$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let ok = 0, fail = 0;
let index = await nextIndex(outDir);

for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = htmlToText(html);
    const fname = "web_" + String(index).padStart(3, "0") + ".txt";
    const outPath = path.join(outDir, fname);
    await fs.writeFile(outPath, text);
    console.log("✓", fname, "from", url, "-", text.length, "chars");
    ok++; index++;
  } catch (e) {
    console.log("✗", url, "-", e.message);
    fail++;
  }
}
console.log(`Done. Saved ${ok} files, ${fail} failed.`);
