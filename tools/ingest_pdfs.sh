#!/usr/bin/env zsh
set -euo pipefail
setopt null_glob

MEMFILE=${MEMFILE:-memory.jsonl}
touch "$MEMFILE"

for f in ingest/pdfs/*.pdf; do
  echo "→ Processing $f"
  ocrmypdf -l eng --force-ocr "$f" /tmp/ocr-$$.pdf >/dev/null 2>&1
  pdftotext -layout /tmp/ocr-$$.pdf - | python - "$f" <<'PY'
import sys, json, uuid, re, datetime
path = sys.argv[1]
raw = sys.stdin.read()
text = __import__('re').sub(r"\s+", " ", raw).strip()
rec = {
  "id": str(uuid.uuid4()),
  "source": "pdf",
  "path": path,
  "timestamp": datetime.datetime.utcnow().isoformat()+"Z",
  "text": text
}
print(json.dumps(rec))
PY
  rm -f /tmp/ocr-$$.pdf
done | grep -v '^{'    # keep progress echos only (JSON lines get filtered)
