# E2E-008 — concurrent extraction of two distinct public shares

**Status:** PASS  
**Date:** 2026-11-03  
**Scope:** EXT-VERIFY-001 / E2E-008 only. Other functional, nonfunctional, and end-to-end acceptance requirements are not automatically certified by this result.

## Input and dispatch evidence

Two GitHub Actions workflow_dispatch requests were launched concurrently through the authorized Terminals Issue #3 command interface ([submission comment 6606550338](https://github.com/BestNameYet/Terminals/issues/3#issuecomment-6606550338)). Both GitHub run records show `created_at = 2026-11-03T14:33:50Z` (zero-second creation-time separation). The workflow serializes publication using `terminals-shared-conversation-publication`, with `cancel-in-progress: false`.

| Share UUID | Run | Source-linear nodes | Selected visible messages | Publication commit | Verified files |
|---|---:|---:|---:|---|---:|
| 6ae6b576-9fa8-83e8-a040-4091fe0218e3 | [41654917999](https://github.com/BestNameYet/Terminals/actions/runs/41654917999) | 1,302 | 186 | [dd3d20089678604c71e6f4e522a6e2052ad20be0](https://github.com/BestNameYet/Terminals/commit/dd3d20089678604c71e6f4e522a6e2052ad20be0) | 8 |
| 6ae9dd85-7ff0-83e8-90c3-4592305a2362 | [41654917547](https://github.com/BestNameYet/Terminals/actions/runs/41654917547) | 5,912 | 592 | [2b0d75f33f707d137651824ba904c33ea24185da](https://github.com/BestNameYet/Terminals/commit/2b0d75f33f707d137651824ba904c33ea24185da) | 8 |

## Independent verification

The independent auditor ran through [Issue #3 comment 6606622231](https://github.com/BestNameYet/Terminals/issues/3#issuecomment-6606622231). [Its committed result](../../terminalruns/GPT6_20261103_E2E008_distinct_independent_audit_20261103T143644503Z.json) contains `result: PASS`, `distinct_share_count: 2`, `verified_file_count: 16`, and `verified_attestations: 2`.

For both runs the audit checked: GitHub Actions conclusion `success`; receipt correlation with request ID, URL UUID, run ID, and destination; exactly eight expected output files under separate run-scoped paths; SHA-256 and size of every receipt-covered output; both independently downloaded final-attestation JSON artifacts; attested SHA-256 and sizes for all eight files; noncollision of output paths and publication commits; and the dispatch creation-time separation.

The first run committed to `workspaces/shared-conversations/6ae6b576-9fa8-83e8-a040-4091fe0218e3/41654917999-1/`; the second to `workspaces/shared-conversations/6ae9dd85-7ff0-83e8-90c3-4592305a2362/41654917547-1/`.

## Verdict and limits

**E2E-008: PASS.** The two different public-share dispatches were created in the same recorded second, both completed successfully, both pushed distinct eight-file commits, and all sixteen saved files passed independent hash/attestation checks. This is evidence for the specified concurrent-publication scenario; it does not prove every possible concurrency interleaving, future serialization format, privacy-policy approval, or the remaining acceptance matrix.
