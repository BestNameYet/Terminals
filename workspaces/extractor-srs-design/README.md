# Extractor SRS design package

This folder contains the final extractor design and standalone input-validator implementation/tests. **The extractor is not deployed.**

## Files

- [STUDY.md](STUDY.md) — comprehensive comparison of the five Terminals Issue #4 comments, current StateMachines/IssueStack implementations, algorithm tradeoffs, efficiency, security and design decisions.
- [SRS.md](SRS.md) — final implementation-oriented requirements, canonical request JSON, schemas, 32 functional requirements, 18 nonfunctional requirements, invariants, failure behavior and 33 acceptance cases.
- [sources/issue-4-comments.json](sources/issue-4-comments.json) — verbatim complete bodies of **all five** source comments, with IDs, URLs, source ordering and metadata.
- [SOURCES.md](SOURCES.md) — exact source pointers and implementation evidence.
- [VERIFICATION.md](VERIFICATION.md) — documentation delivery verification and explicitly unexecuted implementation tests.
- [input-validator.js](input-validator.js) — final Node.js 20+ request/CLI validator aligned with EXT-SRS-001 and reconciled from Issue #4 candidate comments 6602632769 and 6602684689.
- [input-validator.test.js](input-validator.test.js) — 123 standalone tests for canonical/legacy modes, URL, run isolation, schema, symlinks, collisions, CLI and GitHub step outputs.

## Selected design

One `workflow_dispatch` Node.js pipeline accepts a JSON request with a public ChatGPT share URL and templated destination; fetches HTML once; decodes the indexed stream once **without evaluating downloaded scripts**; preserves the full `linear_conversation` order; independently reconstructs `mapping/current_node` selected ancestry; generates raw, linear, selected Markdown/JSON, diagnostics and receipts; publishes eight outputs and performs remote readback.

The current Terminals manual-dispatch.yml is a stub and has **not** been replaced by an extractor as part of this documentation task. See SRS.md for the precise release gates.

## Validator usage (not the extractor)

```bash
node --test workspaces/extractor-srs-design/input-validator.test.js

GITHUB_RUN_ID=12345 GITHUB_RUN_ATTEMPT=1 GITHUB_WORKSPACE="$PWD" \\
  node workspaces/extractor-srs-design/input-validator.js \\
  --target-url 'https://chatgpt.com/share/<UUID>'
```

The URL above is a placeholder: replace `<UUID>` with an actual share ID. For canonical dispatch JSON, pass `--request-json '{"target_url":"https://chatgpt.com/share/<UUID>"}'` instead, or set `INPUT_REQUEST_JSON`. JSON mode is mutually exclusive with legacy `INPUT_TARGET_URL`/`INPUT_WRITE_PATH`. `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, and `GITHUB_WORKSPACE` are trusted execution context, not accepted request fields. `GITHUB_OUTPUT` receives normalized step outputs if present.

Local validation: **123/123 passed on Node.js v22.16.0**; the committed code and tests were independently read back and matched locally verified Git blob hashes. GitHub Actions execution, extractor integration, source HTML retrieval, and publication/readback of extracted conversations remain untested. The original acceptance matrix is still the release gate.
