#!/usr/bin/env node
/**
 * Almost Human — URL Collector for A–Z sections
 * File: scripts/collect-urls.mjs
 * Node >= 18 (uses global fetch)
 * No external deps.
 *
 * Purpose: Crawl 1–3 starting pages (e.g., site "Health A–Z" and "Medicines A–Z" hubs),
 * follow links that match provided include patterns, and write a de‑duplicated list to data/urls.txt.
 *
 * Usage (from repo root):
 * node scripts/collect-urls.mjs \
 *   --start https://YOUR-DOMAIN/health-a-z/ \
 *   --start https://YOUR-DOMAIN/medicines-a-z/ \
 *   --include /health-a-z/,/medicines-a-z/ \
 *   --limit 60 \
 *   --out data/urls.txt
 */

import { writeFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((arg, i, all) => {
    if (!arg.startsWith('--')) return [];
    const key = arg.slice(2);
    const next = all[i + 1];
    if (!next || next.startsWith('--')) return [[key, true]];
    return [[key, next]];
  })
);

if (args.help || args.h) {
  console.log(`\nUsage:\n  node scripts/collect-urls.mjs \\\n    --start <URL> [--start <URL> ...] \\\n    --include <comma-separated substrings> \\\n    --limit 60 \\\n    --out data/urls.txt\n`);
  process.exit(0);
}

function toArray(val) {
  if (!val) return [];
  if (val === true) return [];
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const STARTS = toArray(args.start) // when passed like "--start a,b" OR repeat flag twice, both cases handled below
  .concat(
    process.argv
      .slice(2)
      .filter((x, i, a) => x === '--start' && a[i + 1] && !a[i + 1].startsWith('--'))
      .map((_, i, a) => process.argv[process.argv.indexOf('--start', 2 * i + 2) + 1])
  )
  .filter(Boolean);

const INCLUDES = toArray(args.include);
const LIMIT = Number(args.limit || 60);
const OUT = String(args.out || 'data/urls.txt');

if (STARTS.length === 0) {
  console.error('\n❌ Provide at least one --start URL.');
  process.exit(1);
}
if (INCLUDES.length === 0) {
  console.error('\n❌ Provide --include patterns (e.g., /health-a-z/,/medicines-a-z/).');
  process.exit(1);
}

const firstOrigin = new URL(STARTS[0]).origin;

function extractLinks(html, baseUrl) {
  const links = new Set();
  const re = /href\s*=\s*(["'])(.*?)\1/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const raw = m[2].trim();
      if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('#')) continue;
      const abs = new URL(raw, baseUrl).toString();
      links.add(abs);
    } catch (_) {}
  }
  return [...links];
}

function shouldKeep(url) {
  try {
    const u = new URL(url);
    if (u.origin !== firstOrigin) return false; // same origin only
    const bad = [/\.(jpg|jpeg|png|gif|svg|webp|pdf|docx?|xlsx?|zip|mp3|mp4)(?:$|\?)/i];
    if (bad.some((r) => r.test(u.pathname))) return false;
    return INCLUDES.some((inc) => url.includes(inc));
  } catch {
    return false;
  }
}

async function fetchHtml(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function crawl() {
  const queue = [...new Set(STARTS)];
  const visited = new Set();
  const results = new Set();

  while (queue.length && results.size < LIMIT) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    process.stdout.write(`→ Scan ${url} ... `);
    try {
      const html = await fetchHtml(url);
      console.log('ok');
      const links = extractLinks(html, url);
      for (const link of links) {
        if (!shouldKeep(link)) continue;
        // Heuristic: prefer deeper article pages (not just the index) by avoiding mega index pages repeatedly
        results.add(link);
        if (!visited.has(link) && queue.length < LIMIT * 2) queue.push(link);
        if (results.size >= LIMIT) break;
      }
    } catch (e) {
      console.log(`skip (${e.message})`);
    }
  }

  const final = [...results].slice(0, LIMIT).sort();
  await writeFile(resolvePath(OUT), final.join('\n') + '\n', 'utf-8');
  console.log(`\n✅ Wrote ${final.length} URL(s) to ${OUT}`);
}

crawl().catch((e) => {
  console.error('\n❌', e.message || e);
  process.exit(1);
});

