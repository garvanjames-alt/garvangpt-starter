# Format Policy (v1)

This policy defines how we normalize raw sources before ingestion so the app gets clean, consistent text.

## Normalization rules
1. All text encoded in **UTF-8**.
2. **One logical document per file** (no merges).
3. Strip non-content regions (navbars, footers, cookie banners, ads).
4. Preserve **medical casing/terms** (e.g., “COVID-19”, “ACE inhibitors”).
5. Save normalized output under a sibling folder named `_normalized/` with the **same filename stem**.

## Output schema
Each normalized text file must begin with this header block:


