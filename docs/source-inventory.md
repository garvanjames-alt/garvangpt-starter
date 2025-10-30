# Source Inventory (v1)

This is the working list of all corpora we may ingest into GarvanGPT — with location, format, size, and ingestion status.

| ID | Corpus / Description                         | Location / Link (internal)                         | Format        | Approx Size | Access | Ingest Status |
|----|----------------------------------------------|----------------------------------------------------|---------------|-------------|-------|---------------|
| S-01 | Lynch’s Pharmacy A–Z health articles       | `ingest/health/`                                   | HTML          | ~150 pages  | Local | Not started   |
| S-02 | Blog & “In the News” posts                 | `ingest/content/`                                  | HTML/MD       | ~60 posts   | Local | Not started   |
| S-03 | Memory boot data (seed facts)              | `backend/memory.jsonl`                             | JSONL         | ~5–20 KB    | Local | ✅ Loaded at boot |
| S-04 | PDFs: patient handouts (clinic)            | `ingest/pdfs/`                                     | PDF           | TBD         | Local | Not started   |
| S-05 | External site snapshot (public pages)      | `ingest/site-snap/`                                | HTML          | TBD         | Local | Not started   |
| S-06 | Video transcripts (YouTube/shorts)         | `ingest/video/`                                    | TXT/VTT       | TBD         | Local | Not started   |
| S-07 | Policies (PII/redaction/rules)             | `docs/format-policy.md`                            | MD            | n/a         | Local | Planned       |
| S-08 | Third-party health references (curated)    | `ingest/refs/`                                     | PDF/HTML      | TBD         | Local | Planned       |

## Notes
- **Primary MVP set**: S-01, S-02, S-03.
- Each folder under `ingest/` will mirror this table (one subfolder per source).
- Ingestion scripts will normalize to **UTF-8** and **plain text** per file.
