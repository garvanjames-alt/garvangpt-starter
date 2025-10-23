const fs = require('fs');
const path = require('path');

const MEM = 'memory.jsonl';
const src = process.argv[2];
if (!src) { console.error('usage: node ingest.cjs data/<file>.txt'); process.exit(1); }

const text = fs.readFileSync(src, 'utf8').trim();
const id = path.basename(src);

// ensure memory.jsonl exists
if (!fs.existsSync(MEM)) fs.writeFileSync(MEM, '');

// skip if already present
const lines = fs.readFileSync(MEM, 'utf8').split('\n').filter(Boolean);
if (lines.some(l => { try { return JSON.parse(l).id === id; } catch { return false; } })) {
  console.log(`Already present: ${id}`);
  process.exit(0);
}

// append new record (embedding will be filled by backfill script)
fs.appendFileSync(MEM, JSON.stringify({ id, text, embedding: null }) + '\n');
console.log(`Appended ${id} to ${MEM}`);
