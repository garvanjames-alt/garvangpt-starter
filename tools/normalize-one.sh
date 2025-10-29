#!/usr/bin/env bash
set -euo pipefail

in="$1"
[[ -f "$in" ]] || { echo "Input file not found: $in" >&2; exit 1; }

# Figure paths
dir="$(dirname "$in")"
stem="$(basename "$in")"
stem="${stem%.*}"
outdir="$(dirname "$dir")/_normalized"
mkdir -p "$outdir"
out="$outdir/$stem.txt"

# Header required by Format Policy
header=$'# Normalized\n# Encoding: UTF-8\n# Format: plain-text\n# Source-Stem: '"$stem"$'\n---\n'

# Naive HTML → text and cleanup (sufficient for smoke test)
# If you later install pandoc, replace the sed pipeline with `pandoc -f html -t plain`.
body="$(
  sed -E 's/<[^>]+>//g' "$in" \
  | sed -E 's/[[:space:]]+/ /g' \
  | sed -E 's/ ?(Site nav|Cookies?|cookie banner|disclaimers?) ?//Ig'
)"

printf "%s%s\n" "$header" "$body" > "$out"
echo "Wrote: $out"
