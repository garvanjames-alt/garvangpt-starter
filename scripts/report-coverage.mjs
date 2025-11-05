#!/usr/bin/env node
/**
 * Almost Human — Coverage Report
 * Compares a master URL list (e.g., data/urls.all.txt) against what's already
 * in memory (via GET /api/memory) using your gh_session cookie.
 *
 * Usage:
 * node scripts/report-coverage.mjs \
 *   --backend https://almosthuman-starter-staging.onrender.com \
 *   --cookie "gh_session=<TOKEN>" \
 *   --file data/urls.all.txt
 *
 * Output:
 * - Prints counts (TOTAL, INGESTED, MISSING)
 * - Writes two files:
 *     data/urls.ingested.txt
 *     data/urls.missing.txt
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const flags = Object.fromEntries(
  process.argv.slice(2).map((arg, i, all) => {
    if (!arg.startsWith('--')) return [arg, true];
    const k = arg.slice(2);
    const v = all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true;
    return [k, v];
  })
);

const BACKEND = String(flags.backend || '').trim();
const COOKIE = String(flags.cookie || '').trim();
const FILE = String(flags.file || '').trim();

function die(msg) { console.error(`\n❌ ${msg}`); process.exit(1); }
if (!BACKEND) die('Missing --backend');
if (!COOKIE || !/^gh_session=/.test(COOKIE)) die('Missing --cookie (format: gh_session=<TOKEN>)');
if (!FILE) die('Missing --file path to master URLs');

async function getAllMemory(baseUrl, cookie) {
  // Simple single-shot fetch; backend returns all items. If your backend later
  // adds pagination, extend this to loop with `?cursor=` handling.
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/memory`, {
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET /api/memory failed: ${res.status} ${body}`);
  }
  const data = await res.json().catch(() => ({}));
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  return items;
}

function norm(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    return url.toString().replace(/\/$/, ''); // strip trailing slash
  } catch {
    return u.trim();
  }
}

(async () => {
  // Read master list
  const raw = await readFile(resolve(FILE), 'utf-8');
  const master = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(norm);
  const masterSet = new Set(master);

  // Pull memory and collect URLs
  const items = await getAllMemory(BACKEND, COOKIE);
  const ingestedSet = new Set();
  for (const it of items) {
    const meta = it?.meta || it?.metadata || {};
    const u = meta.url || meta.source_url || meta.source;
    if (u) ingestedSet.add(norm(u));
  }

  // Compute coverage
  const ingested = master.filter(u => ingestedSet.has(norm(u)));
  const missing = master.filter(u => !ingestedSet.has(norm(u)));

  await writeFile(resolve('data/urls.ingested.txt'), ingested.join('\n') + '\n', 'utf-8');
  await writeFile(resolve('data/urls.missing.txt'), missing.join('\n') + '\n', 'utf-8');

  console.log(`\n📊 Coverage Report`);
  console.log(`• Backend: ${BACKEND}`);
  console.log(`• Total in master: ${master.length}`);
  console.log(`• Ingested: ${ingested.length}`);
  console.log(`• Missing: ${missing.length}`);
  console.log(`\n✅ Wrote data/urls.ingested.txt and data/urls.missing.txt`);
})();

