#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <source-folder-under-ingest>  (e.g., health or content)" >&2
  exit 1
fi

src="$1"
indir="ingest/$src/raw"
outdir="ingest/$src/_normalized"

mkdir -p "$outdir"

shopt -s nullglob
count=0
for f in "$indir"/*; do
  if [ -f "$f" ]; then
    ./tools/normalize-one.sh "$f"
    count=$((count+1))
  fi
done
echo "Normalized $count files into $outdir"
