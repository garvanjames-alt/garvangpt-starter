# Ingestion Snapshot

- Timestamp: 20251105-164511
- Backend: https://almosthuman-starter-staging.onrender.com
- Total in master:     1708
- Covered (ingested locally):     1708
- Missing (local diff):        0
- Normalized ingested list:     1708

## Files included
- urls.all.txt — original master list
- urls.master.norm.sorted.txt — normalized/sorted master
- urls.ingested.local.txt — raw local log of ingested URLs
- urls.ingested.local.norm.sorted.txt — normalized/sorted ingested
- urls.covered.local.txt — local coverage list
- urls.missing.local.txt — local diff (should be 0 lines now)
- any *final*/*backup* snapshots created during the run

## Sanity check (optional)
curl -s 'https://almosthuman-starter-staging.onrender.com/api/memory?limit=3' \
  -H 'Cookie: gh_session=<PASTE_TOKEN>' | head -c 600; echo
