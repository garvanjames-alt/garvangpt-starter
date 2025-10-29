// backend/scripts/crawl_site_no_sitemap.mjs
// Minimal site crawler (no sitemap). No external deps. Node >=18 (global fetch).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { URL as NodeURL } from "url";

// ---------- CLI ARGS ----------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  })
);

// Defaults – you can override with flags, e.g.:
//   node backend/scripts/crawl_site_no_sitemap.mjs --start=http://lynchspharmacy.com/ --host=lynchspharmacy.com --out=backend/data/ingest/website --max=50
const START_URL   = (args.start ?? "http://lynchspharmacy.com/").toString();
const BASE_HOST   = (args.host  ?? "lynchspharmacy.com").toString(); // domain only
const OUTPUT_DIR  = args.out ?? "backend/data/ingest/website";
const MAX_PAGES   = Number(args.max ?? 50);
const RATE_LIMIT_MS = Number(args.rate ?? 800); // ~1 req / 0.8s (polite)

// Skip obvious non-HTML files
const EXCLUDE_PATTERNS = [
  /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|mp3|mp4|mov|avi|webm|png|jpe?g|gif|svg)(\?.*)?$/i,
  /(#|replytocom=)/i,
];

// ---------- Helpers ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

function isInternal(urlStr) {
  try {
    const u = new NodeURL(urlStr, START_URL);
    return (u.hostname.replace(/^www\./, "") === BASE_HOST.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

function shouldExclude(urlStr) {
  return EXCLUDE_PATTERNS.some(rx => rx.test(urlStr));
}

function normalizeUrl(urlStr, base) {
  try {
    const u = new NodeURL(urlStr, base);
    u.hash = ""; // drop fragments
    return u.toString();
  } catch {
    return null;
  }
}

function urlToFilePath(u) {
  // Map URL to a safe file path under OUTPUT_DIR
  const url = new NodeURL(u);
  let p = url.pathname;
  if (p.endsWith("/")) p += "index.html";
  if (!path.extname(p)) p += ".html";
  // Sanitize
  p = p.replace(/[^a-zA-Z0-9._/-]/g, "_");
  const full = path.join(OUTPUT_DIR, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  return full;
}

function extractLinks(html, baseUrl) {
  // Lightweight href extractor (good enough for initial crawl)
  const links = new Set();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const abs = normalizeUrl(m[1], baseUrl);
    if (!abs) continue;
    if (!/^https?:\/\//i.test(abs)) continue;
    if (!isInternal(abs)) continue;
    if (shouldExclude(abs)) continue;
    links.add(abs);
  }
  return Array.from(links);
}

// ---------- Crawl ----------
async function crawl() {
  console.log(`[${nowIso()}] 🚀 Start crawl`);
  console.log(`  start: ${START_URL}`);
  console.log(`  host:  ${BASE_HOST}`);
  console.log(`  out:   ${OUTPUT_DIR}`);
  console.log(`  max:   ${MAX_PAGES}\n`);

  const queue = [START_URL];
  const visited = new Set();
  const manifest = [];

  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);

    if (shouldExclude(url) || !isInternal(url)) continue;

    console.log(`[${nowIso()}] GET ${url}`);
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url, {
        headers: { "User-Agent": "AlmostHuman-Crawler/0.1 (+https://almosthuman.ai)" },
        signal: controller.signal,
      });

      clearTimeout(to);

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/html")) {
        console.log(`  ⚪ skip (non-HTML): ${ct}`);
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const html = await res.text();

      // Save page
      const filePath = urlToFilePath(url);
      fs.writeFileSync(filePath, html, "utf8");

      // Extract a simple title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";

      manifest.push({ url, file: path.relative(OUTPUT_DIR, filePath), title });

      // Queue internal links
      const found = extractLinks(html, url);
      for (const link of found) {
        if (!visited.has(link) && queue.length + visited.size < MAX_PAGES) {
          queue.push(link);
        }
      }

      console.log(`  ✅ saved -> ${path.relative(process.cwd(), filePath)} (+${found.length} links)`);
    } catch (err) {
      console.log(`  ❌ error: ${err.message}`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Save manifest
  const manifestPath = path.join(OUTPUT_DIR, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ started: nowIso(), pages: manifest }, null, 2));
  console.log(`\n[${nowIso()}] 🏁 Done. Pages saved: ${manifest.length}`);
  console.log(`Manifest: ${manifestPath}`);
}

crawl().catch(e => {
  console.error(e);
  process.exit(1);
});
