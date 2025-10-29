# PII Policy (v1)

This policy defines what **personally identifiable information (PII)** must be removed
or masked during normalization/ingestion.

## Always redact
- Names of private individuals (patients, staff in internal notes)
- Phone numbers, email addresses, physical addresses
- Full dates tied to a person (e.g., DOB, appointment date)
- National IDs / MRNs / claim numbers / prescription numbers
- Credit card data, bank account or routing numbers
- Exact geolocation for a person (home/work coordinates)

## Masking format
- Use bracketed tags with type, e.g.:
  - `[NAME]`, `[PHONE]`, `[EMAIL]`, `[ADDRESS]`, `[DATE]`, `[ID]`
- Do not invent replacements; only tag what’s present.

## Keep as-is (non-PII)
- General medical facts, drug names, dosing guidelines
- Publicly available reference material and policy documents
- Aggregated statistics with no link to an individual

## Notes
- If a document cannot be safely anonymized, **exclude it** from ingestion.
- Prefer deleting small risky fragments over keeping them partially redacted.

## Verification checklist
- [ ] No raw names, contact info, or IDs remain
- [ ] Dates that could identify a person removed or generalized
- [ ] Masking uses approved tags only
- [ ] File still useful after redaction
