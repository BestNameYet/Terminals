# Extractor SRS design package

This folder is a **documentation deliverable**, not a deployed extractor.

## Files

- [STUDY.md](STUDY.md) — comprehensive comparison of the five Terminals Issue #4 comments, current StateMachines/IssueStack implementations, algorithm tradeoffs, efficiency, security and design decisions.
- [SRS.md](SRS.md) — final implementation-oriented requirements, canonical request JSON, schemas, 32 functional requirements, 18 nonfunctional requirements, invariants, failure behavior and 33 acceptance cases.
- [sources/issue-4-comments.json](sources/issue-4-comments.json) — verbatim complete bodies of **all five** source comments, with IDs, URLs, source ordering and metadata.
- [SOURCES.md](SOURCES.md) — exact source pointers and implementation evidence.
- [VERIFICATION.md](VERIFICATION.md) — documentation delivery verification and explicitly unexecuted implementation tests.

## Selected design

One `workflow_dispatch` Node.js pipeline accepts a JSON request with a public ChatGPT share URL and templated destination; fetches HTML once; decodes the indexed stream once **without evaluating downloaded scripts**; preserves the full `linear_conversation` order; independently reconstructs `mapping/current_node` selected ancestry; generates raw, linear, selected Markdown/JSON, diagnostics and receipts; publishes eight outputs and performs remote readback.

The current Terminals manual-dispatch.yml is a stub and has **not** been replaced by an extractor as part of this documentation task. See SRS.md for the precise release gates.
