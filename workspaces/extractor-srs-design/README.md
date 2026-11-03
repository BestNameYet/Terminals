# ChatGPT shared-conversation extractor — design and implementation

**Repository:** BestNameYet/Terminals  
**Current implementation status:** Node.js extractor and dispatch workflows committed. [Live workflow run 41645489733](https://github.com/BestNameYet/Terminals/actions/runs/41645489733) completed successfully, published all eight files and uploaded an external final attestation. A [separate independent audit](acceptance/RESULT-41645489733.md) rechecked the source-linear projection, selected branch, every published file and final attestation; 149 existing automated tests passed. **Full EXT-SRS-001 acceptance certification remains open.**

## Active workflow entry points

- [Named extractor workflow](../../.github/workflows/chatgpt-shared-conversation-extractor.yml): `workflow_dispatch` plus `workflow_call`; validates a canonical `request_json` or legacy URL/path, runs tests, fetches HTML, performs both projections, prepares eight files, uploads an artifact, publishes them to Git, checks remote bytes, and uploads an external final attestation.
- [Legacy manual dispatch alias](../../.github/workflows/manual-dispatch.yml): forwards existing `target_url` and `write_path` dispatches to the named extractor; it no longer simply prints inputs.

## Runtime and tests

- [runtime/dispatch-validator.js](runtime/dispatch-validator.js): admission validation, URL checks, template expansion and run context.
- [runtime/html-response-parser.js](runtime/html-response-parser.js): nonexecuting React Router serialization decoder; linear and ancestry projections.
- [runtime/capture-and-parse.js](runtime/capture-and-parse.js): HTTP acquisition, rendering and eight-output preparation.
- [tests/dispatch-validator.test.js](tests/dispatch-validator.test.js)
- [tests/html-response-parser.test.js](tests/html-response-parser.test.js)
- [tests/capture-and-parse.test.js](tests/capture-and-parse.test.js)

Run the current combined test suite: `node --test --test-concurrency=4 workspaces/extractor-srs-design/tests/*.test.js workspaces/extractor-srs-design/input-validator.test.js`.

**Verified repository-side test receipts:** initial [23-test run](https://github.com/BestNameYet/Terminals/issues/3#issuecomment-6603513786); most recent [independent live audit and 149-test run](../terminalruns/GPT6_0000000071-independent_audit_retry-Terminals_20261103T143310413Z.json) (149 PASS, zero FAIL).

## Specifications and documentation

- [FINAL-SRS.md](FINAL-SRS.md): expanded 78-functional-requirement final proposed baseline.
- [INTERFACES-AND-SCHEMAS.md](INTERFACES-AND-SCHEMAS.md): request, output and receipt contracts.
- [VERIFICATION-PLAN.md](VERIFICATION-PLAN.md): proposed requirement tests (implementation acceptance suite not yet run).
- [DECISIONS-AND-RISKS.md](DECISIONS-AND-RISKS.md): architectural decisions and unresolved risks.
- [REVIEW-FINAL-SRS.md](REVIEW-FINAL-SRS.md): review findings and suggested corrections.
- [SRS.md](SRS.md): earlier 32-requirement specification; superseded by FINAL-SRS.md for the current implementation target.
- [STUDY.md](STUDY.md), [SOURCES.md](SOURCES.md), [VERIFICATION.md](VERIFICATION.md), [sources/issue-4-comments.json](sources/issue-4-comments.json): original research and historical documentation.
- [HTML-PARSER-CANDIDATE.md](HTML-PARSER-CANDIDATE.md): earlier parser candidate notes (local artifact; not required for production).
- [acceptance/verify-live-export.js](acceptance/verify-live-export.js) and [acceptance/RESULT-41645489733.md](acceptance/RESULT-41645489733.md): independent live eight-file content/provenance auditor and actual run evidence.

## Important limits

- A real live export, Git commit and byte-level readback have now succeeded for the **specific public share tested**; independent audit of that result also passed. These tests do **not** prove semantic completeness against every ChatGPT UI or every source format.
- Privacy and raw-data publication policy must be reviewed before storing a real conversation in Git.
- The current code covers only a subset of the full SRS verification plan; no universal serialization-compatibility claim is made.
- The final SRS and legacy SRS share an identifier with conflicting counts; the [review](REVIEW-FINAL-SRS.md) records this documentation issue.
