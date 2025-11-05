#!/usr/bin/env node
/**
 * Almost Human — MVC Ingest Script (Step 96)
 * File: scripts/ingest-from-urls.mjs
 * Node >= 18 (uses global fetch)
 * No external deps.
 *
 * Usage (from repo root, NEW terminal):
 * node scripts/ingest-from-urls.mjs \
 *   --backend https://almosthuman-starter-staging.onrender.com \
 *   --cookie "gh_session=<PASTE_COOKIE_VALUE>" \
 *   --file data/urls.txt \
 *   --chunk 700
 *
 * Flags:
 * --backend   Required. Full backend base URL.
 * --cookie    Required. Value of gh_session cookie (no quotes inside).
 * --file      Required. Path to urls.txt (one URL per line).
 * --chunk     Optional. Target chunk size in characters (default 700).
 * --overlap   Optional. Overlap between chunks in characters (default 80).
 * --dry-run   Optional. If present, does not POST, only prints what would upload.
 */

import { readFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// ---------------------- CLI PARSE ----------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((arg, i, all) => {
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = all[i + 1];
      if (!next || next.startsWith('--')) return [key, true];
      return [key, next];
    }
    return [arg, true];
  })
);

if (args.help || args.h) {
  console.log(`\nUsage:\n  node scripts/ingest-from-urls.mjs \\\n    --backend https://almosthuman-starter-staging.onrender.com \\\n    --cookie "gh_session=<PASTE_COOKIE_VALUE>" \\\n    --file data/urls.txt \\\n    --chunk 700\n`);
  process.exit(0);
}

const BACKEND = String(args.backend || '').trim();
const COOKIE = String(args.cookie || '').trim();
const FILE = String(args.file || '').trim();
const CHUNK = Number(args.chunk || 700);
const OVERLAP = Number(args.overlap || 80);
const DRY = !!args['dry-run'];

function fatal(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

if (!BACKEND) fatal('Missing --backend');
if (!COOKIE || !/^gh_session=/.test(COOKIE)) fatal('Missing --cookie (expected format: gh_session=<value>)');
if (!FILE) fatal('Missing --file');

// ---------------------- HELPERS ----------------------
function normalizeWhitespace(str) {
  return str
    .replace(/\r/g, '')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(html) {
  if (!html) return '';
  // Remove scripts/styles
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Convert block elements to newlines for better separation
  html = html.replace(/<(\/?)(p|div|section|article|header|footer|main|aside|nav|h[1-6]|li|ul|ol|br)[^>]*>/gi, (m) => {
    return /<\//.test(m) || /<br\b/i.test(m) ? '\n' : '\n';
  });
  // Remove all remaining tags
  html = html.replace(/<[^>]+>/g, '');
  // Decode a few common entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  html = html.replace(/&(amp|lt|gt|quot|#39);/g, (m) => entities[m] || m);
  return normalizeWhitespace(html);
}

function chunkText(text, size = 700, overlap = 80) {
  const chunks = [];
  if (!text) return chunks;
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    let chunk = text.slice(i, end);
    // Try to end on sentence boundary when possible
    if (end < text.length) {
      const lastStop = Math.max(
        chunk.lastIndexOf('\n\n'),
        chunk.lastIndexOf('. '),
        chunk.lastIndexOf('! '),
        chunk.lastIndexOf('? ')
      );
      if (lastStop > size * 0.6) {
        chunk = chunk.slice(0, lastStop + 1);
      }
    }
    chunks.push(chunk.trim());
    if (end >= text.length) break;
    i = i + (chunk.length - Math.min(overlap, chunk.length));
  }
  return chunks.filter(Boolean);
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  return stripHtml(html);
}

async function postMemory({ backend, cookie, text, meta }) {
  const res = await fetch(`${backend.replace(/\/$/, '')}/api/memory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({ text, meta }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`POST /api/memory failed: ${res.status} ${body}`);
  }
  return res.json().catch(() => ({}));
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------- MAIN ----------------------
(async () => {
  try {
    // Ensure urls file exists
    const filePath = resolve(FILE);
    await stat(filePath).catch(() => fatal(`URLs file not found: ${FILE}`));
    const content = await readFile(filePath, 'utf-8');
    const urls = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    if (urls.length === 0) fatal('No URLs found in file. Add one URL per line.');

    console.log(`\n📥 Reading ${urls.length} URL(s) from ${FILE}`);

    const allChunks = [];
    let uploaded = 0;

    for (let idx = 0; idx < urls.length; idx++) {
      const url = urls[idx];
      process.stdout.write(`\n→ [${idx + 1}/${urls.length}] Fetching ${url} ... `);
      try {
        const text = await fetchText(url);
        console.log(`ok (${text.length.toLocaleString()} chars)`);

        const chunks = chunkText(text, CHUNK, OVERLAP);
        console.log(`   • Chunked into ${chunks.length} piece(s) (size≈${CHUNK}, overlap=${OVERLAP})`);

        for (let c = 0; c < chunks.length; c++) {
          const payload = {
            backend: BACKEND,
            cookie: COOKIE,
            text: chunks[c],
            meta: {
              source: 'url',
              url,
              fetched_at: nowIso(),
              idx: c,
              total: chunks.length,
            },
          };

          if (DRY) {
            console.log(`   • [dry-run] Would upload chunk ${c + 1}/${chunks.length} (${payload.text.length} chars)`);
            allChunks.push(payload);
          } else {
            await postMemory(payload);
            uploaded++;
            process.stdout.write(`   • Uploaded chunk ${c + 1}/${chunks.length} \n`);
          }
          // Gentle pacing to avoid rate limits
          await sleep(120);
        }
      } catch (err) {
        console.error(`\n   ✖ Error on ${url}: ${err.message}`);
      }
    }

    if (DRY) {
      console.log(`\n🧪 Dry run complete. Would upload ${allChunks.length} chunk(s).`);
    } else {
      console.log(`\n✅ Done. Uploaded ${uploaded} chunk(s) to ${BACKEND}/api/memory`);
    }
  } catch (e) {
    fatal(e.message || String(e));
  }
})();

