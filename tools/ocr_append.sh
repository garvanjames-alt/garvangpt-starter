#!/usr/bin/env bash
set -euo pipefail

MEMFILE="memory.jsonl"
PDF_DIR="ingest/pdfs"

if ! command -v ocrmypdf >/dev/null 2>&1; then
  echo "ERROR: ocrmypdf not found. Install via Homebrew: brew install ocrmypdf poppler" >&2
  exit 1
fi
if ! command -v pdftotext >/dev/null 2>&1; then
  echo "ERROR: pdftotext (poppler) not found. Install via Homebrew: brew install poppler" >&2
  exit 1
fi
if ! command -v pdfinfo >/dev/null 2>&1; then
  echo "ERROR: pdfinfo (poppler) not found. Install via Homebrew: brew install poppler" >&2
  exit 1
fi

mkdir -p "$PDF_DIR"

shopt -s nullglob
for f in "$PDF_DIR"/*.pdf "$PDF_DIR"/*.PDF; do
  echo "→ Processing $f"
  tmp_pdf="$(mktemp -t ocr-XXXXXX).pdf"
  # OCR (idempotent; will skip if already text)
  ocrmypdf -l eng --force-ocr "$f" "$tmp_pdf" >/dev/null 2>&1 || true

  # Determine page count
  pages="$(pdfinfo "$tmp_pdf" 2>/dev/null | awk -F': *' '/^Pages:/ {print $2}')"
  if [[ -z "${pages:-}" ]]; then
    pages=1
  fi

  for ((p=1; p<=pages; p++)); do
    # Extract only page p with layout preserved
    page_txt="$(mktemp -t ptxt-XXXXXX).txt"
    pdftotext -layout -f "$p" -l "$p" "$tmp_pdf" "$page_txt" || true

    # Normalize whitespace
    text="$(tr -d '\r' < "$page_txt" | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^ +| +$//g')"
    rm -f "$page_txt"

    # Skip empty pages
    if [[ -z "$text" ]]; then
      continue
    fi

    # Append JSONL record
    node -e 'const fs=require("fs");const {randomUUID}=require("crypto");
      const f=process.argv[1], p=Number(process.argv[2]), text=process.argv.slice(3).join(" ");
      const rec={ id:randomUUID(), source:"pdf", path:`${f}#page=${p}`, page:p, timestamp:new Date().toISOString(), text };
      fs.appendFileSync("memory.jsonl", JSON.stringify(rec)+"\n");' "$f" "$p" "$text"

    printf "  ✓ page %d\n" "$p"
  done

  rm -f "$tmp_pdf"
  echo "✓ Finished $f"
done
