#!/usr/bin/env node
/* ingest.cjs
 * Append a text file into memory.jsonl as ONE record with:
 * { id: <filename>, text: <file contents>, source: <filename>#1 }
 *
 * Usage: node ingest.cjs data/<file>.txt
 */

const fs = require("fs");
const path = require("path");

// ---- CLI args --------------------------------------------------------------
const inputArg = process.argv[2];
if (!inputArg) {
  console.error("Usage: node ingest.cjs data/<file>.txt");
  process.exit(1);
}

// Resolve paths
const cwd = process.cwd();
const absInputPath = path.resolve(cwd, inputArg);
const memoryPath = path.resolve(__dirname, "memory.jsonl");

// ---- Read & validate input file -------------------------------------------
if (!fs.existsSync(absInputPath)) {
  console.error(`❌ Input file not found: ${absInputPath}`);
  process.exit(1);
}

let content = fs.readFileSync(absInputPath, "utf8");
// normalize line endings, trim
content = content.replace(/\r\n/g, "\n").trim();

if (!content) {
  console.error("❌ Input file is empty after trimming.");
  process.exit(1);
}

// ---- Build record ----------------------------------------------------------
const fileBase = path.basename(absInputPath); // e.g., "travel_vaccines_faq.txt"

// We store the whole file as ONE chunk to match your current pattern.
const record = {
  id: fileBase,                 // keeps existing behavior you already rely on
  text: content,                // entire file contents
  source: `${fileBase}#1`,      // NEW: enables per-chunk citations in UI
};

// ---- Ensure memory.jsonl exists -------------------------------------------
if (!fs.existsSync(memoryPath)) {
  fs.writeFileSync(memoryPath, "", "utf8");
}

// ---- Append JSONL line -----------------------------------------------------
try {
  fs.appendFileSync(memoryPath, JSON.stringify(record) + "\n", "utf8");
  console.log(`Appended ${fileBase} to memory.jsonl`);
} catch (err) {
  console.error("❌ Failed to append to memory.jsonl:", err.message);
  process.exit(1);
}
