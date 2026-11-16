# Extraction and analysis acceptance checks

Procedure nonce: `c12cbc20-17d7-43f9-9999-8bb43eb73bcf`.

| Requirement | Check | Result |
|---|---|---|
| DS1 | Plan `PLAN.md` exists on main | PASS |
| DS2 | Source archive SHA-256 recorded; script verifies unchanged source hash | PASS |
| DS3 | ZIP preflight validates 1,205 paths, disallowed types, collisions, total budgets and all-member CRC | PASS |
| DS4 | Extract 1,205 members, 131,814,556 uncompressed bytes; hash each extracted file and write manifest | PASS |
| DS5 | HTML inventory parsed 1,202 documents and recorded source-defined category counts | PASS |
| DS6 | Initial category/source index generated with unverified year tokens clearly identified; full semantic chronology and record-level validation remain future work | PARTIAL |
| DS7 | `.gitignore` verified using `git check-ignore` for extracted and output files | PASS |

## Observed command results
- ZIP source SHA-256: `480d2adfc5426cde80dc8ce28eee760473ba88cd1c3b1a24857c419259825a62`
- Archive entries: 1,205; total extracted bytes: 131,814,556
- HTML documents parsed: 1,202; HTML parser failures: 0
- Generated private artifacts: `output/extraction-manifest.json`, `output/initial-inventory.json`, and `output/html-source-index.json`
- Largest observed categories by *file count*: content_and_social_interactions_22 (504), device_and_connection_information_1 (175), search_and_navigation_interactions_24 (164), account_and_profile_interactions_21 (111).

## Follow-up analysis
Analyze actual HTML table structures, semantically identify records and timestamps, count events separately from page counts, resolve date/time representations, and cite concrete source paths for each finding. Do not treat the syntactic year tokens collected in the first index as verified event dates.
