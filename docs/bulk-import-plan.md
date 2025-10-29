# Bulk Import Plan (v1)

## Order of operations
1) Normalize S-01 (health site articles) → `ingest/health/_normalized/`
2) Normalize S-02 (blog posts) → `ingest/content/_normalized/`
3) Build searchable index from normalized sets into `data/` (JSONL), keep provenance.

## Batching
- ~50–100 docs per batch.
- Validate a 5% sample per batch for **Format Policy** and **PII Policy** compliance.

## Rollback
- Keep raw under `ingest/<corpus>/raw/` (read-only).
- Normalized outputs under `_normalized/` with same stems.
- Rebuild the index **only** from `_normalized/`.

## Acceptance checklist (per batch)
- [ ] Paths follow `ingest/<corpus>/_normalized/…`
- [ ] Files begin with the required header block from Format Policy
- [ ] PII policy checks pass on the 5% sample
- [ ] Spot-check 3 docs for content fidelity after stripping
