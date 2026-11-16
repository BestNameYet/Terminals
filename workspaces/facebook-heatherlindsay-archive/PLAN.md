# Extraction and initial analysis plan

**Procedure nonce:** `c12cbc20-17d7-43f9-9999-8bb43eb73bcf`

## Scope and observed source
- Source: `references/facebook-heatherlindsay258967-2026-11-10-Cf0QU2fg.zip` (retain unchanged).
- Target: `workspaces/facebook-heatherlindsay-archive/extracted/`.
- Outputs: `workspaces/facebook-heatherlindsay-archive/output/`.
- Metadata inspection of Codespace source: **1,205 ZIP members; 131,814,556 uncompressed bytes; 1,202 HTML, one TXT, one PNG, one JPG**. 1,201 members are under `data_logs/`. `data_logs/table_of_contents.html` exists. These are ZIP-directory observations, not a claim that all member data has passed CRC checks.

## Procedure
1. **Baseline.** Record SHA-256 and size of original source. List ZIP members; inventory extension, top-level path, compressed and uncompressed sizes, directory entries and duplicates. Keep provenance.
2. **Preflight.** Validate ZIP directory and read all members to check CRC. Reject absolute paths, path traversal, drive prefixes, symlinks, unsafe special files, normalized path collisions and extraction exceeding bounded file count or total bytes. Never follow extracted paths outside the target directory.
3. **Extract.** Create `extracted/` and stream each approved member to a safely resolved relative destination. Do not write to the original ZIP. Record per-member original name, uncompressed size, CRC, SHA-256, output path, and status to `output/extraction-manifest.json`. Compare member counts, sizes and hashes, and confirm original ZIP hash unchanged.
4. **Inventory.** Parse `data_logs/table_of_contents.html` and enumerate every member by original path and format. Build a category-level inventory derived from actual source paths and contents, preserving unknown and empty categories. Do not assume JSON format.
5. **Initial analysis.** Read HTML (using a robust HTML parser), identify document titles, tables, headings, timestamp formats and content families, and count records per category where the data supports the count. Create a source-linked chronology only where timestamps are explicitly present; retain unknown time zones. Report observed findings separately from hypotheses.
6. **Quality checks.** Independently verify sample HTML parsing, full manifest coverage (including zero-length files and directories), cross-check category totals and failures, and disclose content not interpreted. Source references must point to original relative paths.
7. **Publication.** Keep raw extracted data, private manifests and detailed analytics out of Git. Commit only purpose-built scripts, non-sensitive documentation and deliberate summaries. Check `git status`, `git check-ignore`, and final source SHA-256.

## Acceptance
- Preflight passes before any extraction; on failure, extract nothing and record the reason.
- ZIP and extraction output manifests account for all 1,205 source entries, including directories.
- Source hash remains unchanged; all file member CRC/hashes and output paths match.
- Every analysis claim traces back to one or more archive members, with explicit uncertainty for missing data.
- No raw extracted archive content is accidentally staged or committed.

## Current status
- **Completed:** ZIP directory/readability check and preliminary format/path inventory.
- **Not yet established:** complete CRC integrity, safe-path checks, extraction, member-level analysis, detailed chronology and content coverage.
