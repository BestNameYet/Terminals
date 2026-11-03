# ChatGPT shared-conversation extractor — design and implementation

**Repository:** BestNameYet/Terminals  
**Current implementation status:** Node.js candidate runtime and workflow committed. Repository-side unit tests passed (23/23) on 2026-11-03. **A live GitHub Actions export, publication and remote-readback test has not yet been executed.**

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

Run unit tests: `node --test workspaces/extractor-srs-design/tests/*.test.js`.

**Verified repository-side test receipt:** [Terminals Issue #3 command](https://github.com/BestNameYet/Terminals/issues/3#issuecomment-6603513786), [output file](../terminalruns/GPT6_0000000017-verify_shared_extractor-Terminals_20261103T121456776Z.json) (23 PASS, zero FAIL).

## Specifications and documentation

- [FINAL-SRS.md](FINAL-SRS.md): expanded 78-functional-requirement final proposed baseline.
- [INTERFACES-AND-SCHEMAS.md](INTERFACES-AND-SCHEMAS.md): request, output and receipt contracts.
- [VERIFICATION-PLAN.md](VERIFICATION-PLAN.md): proposed requirement tests (implementation acceptance suite not yet run).
- [DECISIONS-AND-RISKS.md](DECISIONS-AND-RISKS.md): architectural decisions and unresolved risks.
- [REVIEW-FINAL-SRS.md](REVIEW-FINAL-SRS.md): review findings and suggested corrections.
- [SRS.md](SRS.md): earlier 32-requirement specification; superseded by FINAL-SRS.md for the current implementation target.
- [STUDY.md](STUDY.md), [SOURCES.md](SOURCES.md), [VERIFICATION.md](VERIFICATION.md), [sources/issue-4-comments.json](sources/issue-4-comments.json): original research and historical documentation.
- [HTML-PARSER-CANDIDATE.md](HTML-PARSER-CANDIDATE.md): earlier parser candidate notes (local artifact; not required for production).

## Important limits

- 23/23 unit tests and GitHub source readback establish that the modules exist and pass synthetic tests, **not** that the workflow can successfully retrieve a live ChatGPT share or commit verified output.
- Privacy and raw-data publication policy must be reviewed before storing a real conversation in Git.
- The current code covers only a subset of the full SRS verification plan; no universal serialization-compatibility claim is made.
- The final SRS and legacy SRS share an identifier with conflicting counts; the [review](REVIEW-FINAL-SRS.md) records this documentation issue.
