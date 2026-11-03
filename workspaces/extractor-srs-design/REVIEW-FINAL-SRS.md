# Design review — EXT-SRS-001 shared-conversation extractor

**Review document:** EXT-REVIEW-001  
**Date:** 2026-11-03  
**Target:** `workspaces/extractor-srs-design/FINAL-SRS.md`, Git blob `4088dbcbf709b50492ffe42a4379294f4af94cd5`  
**Related documents inspected:** `SRS.md`, `README.md`, `STUDY.md`, `INTERFACES-AND-SCHEMAS.md`, `DECISIONS-AND-RISKS.md`, `VERIFICATION-PLAN.md`, `VERIFICATION.md`, `SOURCES.md`, current Terminals `manual-dispatch.yml`, and Terminals Issue #4.  
**Disposition:** **CONDITIONAL — revise the SRS package before treating it as an unambiguous approved implementation baseline.** No implementation or regression tests were performed by this review.  
**Scope of this change:** Review document only. No SRS, workflow, parser, registry, or deployment file was modified.

## 1. Executive findings

The final proposed design is substantively stronger than the earlier single-method specifications. It correctly separates **source-linear** and **selected-visible-branch** output, requires nonexecuting page decoding, preserves original HTML and richer metadata, defines hash receipts and independent remote readback, and treats artifact upload or dispatch acceptance as insufficient evidence of completion. The 78 functional requirement IDs and 18 nonfunctional requirement IDs in `FINAL-SRS.md` are represented by 78 functional tests and 18 nonfunctional tests in `VERIFICATION-PLAN.md`. All new tests remain NOT RUN.

However, the repository contains contradictory descriptions of which document is authoritative, the archived Issue #4 corpus is now stale, and several design contracts need to become explicit enough to be implemented and independently verified without interpretation.

**Disposition by priority:** P0 = release-blocking specification/authorization issue; P1 = functional, security or test-design ambiguity; P2 = editorial or maintenance correction. Proposed wording is below and should be reviewed, not silently applied.

## 2. Findings, source evidence, and concrete corrections

### P0-01 — Two competing “final” baselines share the same document ID

**Evidence:** `SRS.md` calls itself “Final Software Requirements Specification,” identifier `EXT-SRS-001`, version 1.0, with **32** functional requirements and **18** nonfunctional requirements. `FINAL-SRS.md` separately calls itself final `EXT-SRS-001`, version 1.0, with **78** functional and **18** nonfunctional requirements. `README.md` still points at `SRS.md` as the final requirements. `VERIFICATION.md` says 32 functional requirements and 33 acceptance cases. `VERIFICATION-PLAN.md` instead traces 78 functional requirements.

**Correction:** Declare `FINAL-SRS.md` the unique **proposed current baseline** and assign it a distinguishable revision (e.g. `EXT-SRS-001 v1.1-draft-review`). Retain `SRS.md` as `SUPERSEDED-SRS-v1.0.md` or add an unambiguous obsolete/superseded banner and version lineage. Update `README.md`, `VERIFICATION.md`, and all links and counts. Keep the historical file's contents available for audit.

**Suggested replacement:** “The authoritative, unapproved implementation-target SRS is `FINAL-SRS.md` (EXT-SRS-001, version 1.1 proposed revision). `SRS.md` is a superseded earlier draft (32 FR). The governing acceptance package contains 78 FR cases, 18 NFR cases and 10 end-to-end scenarios; none has been executed.”

**Exit check:** There is one documented current baseline, one version number for it, and no conflicting current requirement/test counts across the package.

### P0-02 — Required source archive is not the current complete Issue #4

**Evidence:** `FINAL-SRS.md` §1 claims “every one of the five Issue #4 comments,” and `SOURCES.md`/`STUDY.md` identify exactly five. On this review, Terminals Issue #4 returns **seven** comments: `6601504904`, `6601564263`, `6601890052`, `6602365561`, `6602452432`, `6602632769`, and `6602684689`. The two additional comments are **candidate input-parser/validator scripts**, not verified production implementations.

**Correction:** Preserve “all five comments” strictly as a historical snapshot claim, not a current completeness claim. Refresh `sources/issue-4-comments.json` to seven comments after an authorization/refresh step; study the new candidate-script contracts and identify differences from canonical `request_json` mode (for example candidate scripts use `share_url` and a different output root). Do **not** silently adopt their input schema.

**Suggested replacement:** “This revision was derived from a timestamped five-comment source snapshot. Issue #4 now contains seven comments; newer candidate input-parser comments are pending independent reconciliation. The SRS is not certified to incorporate all current Issue #4 input contracts.”

**Exit check:** Archive count, IDs, retrieval time, source SHA/digest and study coverage agree. New candidates are classified as candidates, not operational evidence.

### P0-03 — Raw capture publication requires an explicit privacy decision

**Evidence:** `FINAL-SRS.md` §4.3/FR-065–073 requires all eight files including `response.html`, broad decoded conversation and tool/internal metadata to be committed and retained as an artifact. `DECISIONS-AND-RISKS.md` ADR-027 leaves owner approval OPEN. The repository metadata currently reports `BestNameYet/Terminals` as **private**, but repository visibility alone is not a sufficient classification/retention policy.

**Correction:** Treat private repository status as an observed condition, not standing approval. Require a recorded owner decision about audience, secrets/identifiers, source HTML retention, artifact retention, branch/history persistence and policy for shared links. Include a prepublication privacy gate in the release criteria and a controlled end-to-end test source. Do not redefine a reduced product without approval.

**Suggested replacement:** “Before enabling a live complete-profile run that persists raw content, the operator SHALL approve the exact repository and artifact recipients, retained data classes, retention period and deletion limitations of Git history. Until approved, live raw publication is BLOCKED.”

### P0-04 — No tested authority to promote the stub workflow into production

**Evidence:** The current `.github/workflows/manual-dispatch.yml` is a print-only dispatch stub. `FINAL-SRS.md` §10 and FR-078 state that modification outside `workspaces/extractor-srs-design` requires separate promotion authorization. `VERIFICATION-PLAN.md` records every proposed test NOT RUN.

**Correction:** Record two independent gates: (a) authorized source/workflow promotion out of the workspace; (b) proven live dispatch, branch publication and all tests. Do not mark `EXT-SRS-001` “approved/deployed” based on documentation publication. The target path, intended commit, test branch and rollback owner must be stated.

### P1-05 — Request naming conflicts with the candidate parsers

**Evidence:** `INTERFACES-AND-SCHEMAS.md` defines `request_json` wrapping `target_url`, `write_path`, `request_id`, `export_profile`; earlier Terminals candidate parser comments use `share_url`, `write_path`, `request_id`, `include_metadata`, `include_raw_conversation`. `FINAL-SRS.md` correctly preserves legacy `target_url` but does not explicitly resolve candidate integration.

**Correction:** State that canonical `request_json.target_url` is the sole baseline JSON-key name, that `share_url` is **not** an accepted synonym unless an explicit adapter is specified, and that the candidate flags do not silently change the complete-profile requirement. Create a field-by-field parser compatibility matrix and rejection fixtures for alias/mixed fields.

**Suggested replacement:** “The normalized request contains exactly `target_url`, optional `write_path`, optional `request_id`, and optional `export_profile=complete`. Unknown fields, including `share_url` in canonical JSON mode, SHALL be rejected unless a versioned compatibility adapter has been separately approved.”

### P1-06 — Dispatch-to-run correlation lacks a deterministic acceptance algorithm

**Evidence:** FR-007–012 require robust correlation and forbid choosing merely the latest run, but do not define how to associate a dispatch accepted by REST (often with no immediately usable run identifier) with one particular queued run under concurrent submissions. The `gh workflow run` CLI may return a run URL when available, but this is not guaranteed in every invocation.

**Correction:** Define a two-part request/run correlation contract: validated unique `request_id` embedded in workflow `run-name` or early run metadata, plus `github.run_id`, `github.run_attempt`, workflow path, source ref and trigger provenance. Require a bounded polling algorithm verifying all dimensions; do not use only wall-clock ordering or “latest”. Distinguish `DISPATCH_ACCEPTED` from `RUN_IDENTIFIED`, and define ambiguity/timeout failures.

**Suggested replacement:** “If dispatch does not return a run ID, the caller SHALL discover a unique run only by matching request correlation, workflow identifier, ref and an allowed time window, followed by readback of its run metadata; zero or multiple matches fail correlation rather than selecting the latest.”

### P1-07 — Source ref consistency between dispatch and checkout is underspecified

**Evidence:** The target `manual-dispatch.yml` accepts `-r main` and §3 says the stub is retained, but the SRS lacks a precise rule tying the workflow dispatch ref, checked-out commit and extractor source revision together. Concurrency and concurrent workflow edits can change current `main` between dispatch and checkout.

**Correction:** Pin the checkout to the exact `github.sha` used for the running workflow (or an explicitly verified equivalent immutable revision), record it in receipt and attestation, and reject mixed workflow/parser revisions. Publish to `main` only after the authorized release policy is satisfied.

### P1-08 — Single-pass parser contract needs exact transport and structural limits

**Evidence:** FR-026–033 require nonexecuting parsing, one decode, memoization and cycle handling. `INTERFACES-AND-SCHEMAS.md` discusses sentinels/tags, but the supported `enqueue` argument grammar, numeric-index limits and multi-chunk selection policy are not a versioned machine-readable schema.

**Correction:** Specify exact supported literal expression forms, UTF-8 treatment, candidate-selection/disambiguation algorithm, devalue/index sentinel map, maximum table slots, maximum depth, maximum materialized nodes, special-type serialization policy and canonical error codes. Require fixtures for multiple enqueue streams, strings containing script-like text, malformed escape sequences and unsupported tagged types. An unsupported structure must fail rather than invoke a downloaded script.

### P1-09 — “Exact HTTP response bytes” is ambiguous under fetch decompression

**Evidence:** `FINAL-SRS.md` §4.3 requires `response.html` exact HTTP response bytes, while FR-022 refers to the decoded-response-body limit and the reference builders consume `fetch` body bytes. HTTP compression and transfer encoding mean raw wire bytes and delivered/decompressed body bytes are not the same thing.

**Correction:** Define `response.html` as the **exact content bytes exposed by the HTTP response-body reader after HTTP content decoding**, without text re-encoding; record status, final URL, MIME, content-encoding and byte length. If raw compressed wire bytes are wanted, specify a different capture interface and artifact. The 25 MiB cap must apply to the defined saved body bytes.

### P1-10 — Lossless raw serialization and JSON-only output need a precise boundary

**Evidence:** FR-037/043/044 promise complete raw preservation yet allow explicit failure for unsupported special/cyclic values. `INTERFACES-AND-SCHEMAS.md` discusses Date, NaN/Infinity and tagged encoding; strict losslessness remains underspecified.

**Correction:** Define a versioned value-tagging policy covering undefined, nonfinite numbers, Dates, reference identity, cycles, binary and other tagged values. State whether `raw_node` is a graph-preserving reference representation or JSON-normalized value. Avoid “lossless” for a partially supported graph decoder. Explicitly list what remains unsupported and the failure mode.

### P1-11 — Linear-node identity contract is internally ambiguous

**Evidence:** FR-036 requires entries including nulls; `linear-conversation.json` example for `record_kind=no_message` shows `node_id:null` while `raw_node.id` is `node-2`. This can be legitimate but leaves the normalization rule unclear.

**Correction:** State a deterministic rule: node ID derives from source `node.id` whether or not a message exists; it is null only when the source node has no valid ID. For null/nonobject source entries, `raw_node` preserves the actual entry and `record_kind=malformed` or a separate `null_node` enum explicitly distinguishes it. Add expected fixtures for each. Adjust the example's `node_id` to `node-2` unless illustrating a particular failed ID normalization case.

### P1-12 — “Selected-visible” does not necessarily prove ChatGPT UI equivalence

**Evidence:** FR-048–053 define a filtered role/channel representation from parent ancestry; NFR-016 disclaims universal semantic fidelity. User-facing UI can contain structured components/nontext content not represented as joined text parts.

**Correction:** Rename the acceptance claim to **selected-branch supported-text projection** or formally define “visible” as the supported role/channel text subset. Keep `conversation.json` schema compatibility, but make UI fidelity an independently measured test outcome, not an inference from roles. State whether user records with absent channel and assistant records with null channel are supported or excluded.

### P1-13 — Source-linear vs ancestry comparison must handle partial identity coverage

**Evidence:** FR-054 requires node ID/count differences and `diagnostics.json` has `comparison_available`. No specific matching/multiset/order algorithm is normative.

**Correction:** Specify treatment of duplicate/missing IDs, repeated identical IDs, node references present in mapping but not linear, and nonmessage entries. Emit `comparison_available=false` if a meaningful identity comparison cannot be made; supply explicit reason codes and do not produce invented matches. Include ordered-ID and multiset assertions in the verification plan.

### P1-14 — Destination isolation and publication safety require atomicity rules

**Evidence:** FR-018–020 and FR-066–073 require no traversal, no collision and serial Git publication. They do not specify how to prevent a race between symlink validation and file write, or how a retry deals with a competing unrelated change to the same destination.

**Correction:** Require creation in a run-owned, private temporary directory; validate all candidate names, types and content hashes; use safe exclusive file creation and no-follow/directory-descriptor operations where supported; stage exact allowlisted paths. Reject existing foreign output paths even if an attempted retry sees a successful prior commit. After a failed push/rebase, recheck destination ownership and remote state before retrying. Treat post-push partial state as PUBLISHED_UNVERIFIED until remote readback succeeds.

### P1-15 — Artifact sequencing and failure evidence need defined behavior

**Evidence:** FR-062, FR-065 and FR-066 require failure diagnostics and an eight-file success artifact, but do not clarify whether failed runs upload a different artifact when all eight outputs are not available, and how those partial results avoid publication.

**Correction:** Define two artifact classes: `complete-export-<run_id>-<attempt>` only after all local validation passes, and `failed-export-diagnostics-<run_id>-<attempt>` on error (restricted and clearly marked unverified). Any failure artifact must not trigger Git staging or a successful publication receipt. Explicitly state which artifact step uses `if: always()`.

### P1-16 — Test plan is a traceability catalog, not executable test procedures

**Evidence:** `VERIFICATION-PLAN.md` maps all 78 FRs and 18 NFRs and defines 10 E2E scenarios, with every row `NOT RUN`. It does not yet provide a machine-readable test manifest, concrete fixture files, assertions/commands for every case, or automated collector for test evidence.

**Correction:** Add `tests/manifest.json` (or an equivalently versioned manifest), fixture SHA256s, executable test runner mappings, exact expected outputs, and a results ledger with failing stages. Add schema-validation tests for the eight files and final attestation, as well as property/fuzz tests for URL parsing, indexed references, path escapes, special values and formatting. Do not report 78/78 as PASS from an ID-mapping check.

### P1-17 — Terminals registry and artifact access controls need current verification

**Evidence:** `FINAL-SRS.md` wisely forbids inventing IssueStack's `config/file-metadata.json` in Terminals. The current tree does not show such a registry. However, if later one appears, the responsibility for updating it is not currently assigned to a specific component. In addition, GitHub Actions artifact access for raw contents depends on repository permissions.

**Correction:** Make the inventory contract explicit: if Terminals adopts an actual documented registry, name its exact path and validation step in a later approved revision; otherwise confirm no registry is required. Add artifact download/viewer access checks to privacy and E2E acceptance before live runs.

### P2-18 — Companion examples and documentary consistency

**Evidence:** `INTERFACES-AND-SCHEMAS.md` contains the spelling `coercced`; the example linear node `node_id` contradicts its `raw_node.id` as noted in P1-11. `README.md` omits `FINAL-SRS.md`, `INTERFACES-AND-SCHEMAS.md`, `VERIFICATION-PLAN.md`, and `DECISIONS-AND-RISKS.md` from its file listing. `VERIFICATION.md` lists the older five-document delivery and 32/33 counts. `SRS.md` contains a zero-width-character warning in a source filename, which should be removed when updating navigational text.

**Correction:** Fix grammar and example consistency; update the README package index; distinguish the old documentation receipt from a current review; ensure every file title, ID and version is consistent.

## 3. Suggested concrete text edits by file

| File | Proposed edit | Priority |
| --- | --- | --- |
| `FINAL-SRS.md` §1 | Make snapshot provenance explicit; distinguish current SRS from older `SRS.md` and any later candidate comments | P0 |
| `FINAL-SRS.md` §§3–4.1 | Add immutable source ref, dispatch-to-run correlation and explicit canonical name/adapter policy | P1 |
| `FINAL-SRS.md` §§4.2, 5.2 | Clarify path ownership, atomic writes and response-body byte semantics | P1 |
| `FINAL-SRS.md` §§5.3–5.5 | Add serialization type/sentinel grammar, non-executing parsing limits, node ID normalization and supported-text visibility definition | P1 |
| `FINAL-SRS.md` §§5.6–5.7 | Specify complete vs failure artifacts, final attestation transport and remote-readback assertions | P1 |
| `FINAL-SRS.md` §§9–11 | Add release gates for privacy approval, source promotion, executable test evidence and final implementation status | P0 |
| `INTERFACES-AND-SCHEMAS.md` §§2–8 | Resolve example ID conflict; specify formal JSON Schemas, type-tag encoding, comparison algorithm, and final attestation location | P1 |
| `VERIFICATION-PLAN.md` | Preserve 78+18+10 traceability; add runnable test definitions, fixture files, versioned expected results and execution receipts | P1 |
| `DECISIONS-AND-RISKS.md` | Record P0 baseline/version and privacy decisions; add response-body-byte, snapshot and dispatch correlation decisions | P1 |
| `README.md` | Index the actual full package and point only to the current SRS as authoritative | P0 |
| `SRS.md` | Mark earlier final version superseded; retain for history | P0 |
| `VERIFICATION.md` | Mark historical documentation verification, correct current summary or link to a distinct new documentation receipt | P0 |
| `SOURCES.md` and `sources/issue-4-comments.json` | Preserve original snapshot evidence and refresh to seven comments with versioned provenance | P0 |

## 4. Focused correction examples

### 4.1 Dispatch and provenance contract

> The workflow SHALL retain `manual-dispatch.yml` as the entry point; accept exactly one of canonical `request_json` or legacy `target_url`/optional `write_path`; validate inputs with a single normalization function; record the triggering source ref and immutable workflow/parser SHA; and publish a unique run correlation tuple `(repository, workflow_id, run_id, run_attempt, request_id, source_sha)`. A dispatch response alone SHALL NOT establish a running or completed export.

### 4.2 Raw and selected output scope

> A complete export SHALL generate two independently ordered projections from a single safely decoded source: `linear-conversation.json` preserves each available source-linear index and supported raw node, whereas `conversation.json` and `conversation.md` preserve the mapping-selected supported-text branch. Neither product SHALL silently stand in for the other. Raw JSON completeness SHALL be qualified by the declared versioned type normalization contract, and unsupported nonrepresentable structures SHALL fail explicitly.

### 4.3 Publication acceptance

> The workflow SHALL write exactly eight specified run-scoped files; upload a complete validated artifact; stage only authorized files; publish under a verified source/path ownership policy; fetch the remote destination from `main`; independently compare each required remote file's bytes and SHA-256 with its local generated counterpart; and only then emit a separate final attestation containing the actual commit SHA. Partial publication SHALL be reported as `PUBLISHED_UNVERIFIED`, not `VERIFIED`.

### 4.4 Verified result classification

> The run result SHALL separately represent `DISPATCH_ACCEPTED`, `RUN_IDENTIFIED`, `INPUT_VALIDATED`, `SOURCE_DECODED`, `OUTPUTS_VALIDATED`, `ARTIFACT_PUBLISHED`, `GIT_PUBLISHED`, `PUBLISHED_UNVERIFIED`, `VERIFIED` and `FAILED`. The workflow SHALL not fabricate the run ID, infer success from a green upstream dependency or reduce scope following an unsupported source format.

## 5. Recommended correction order and release gate

1. **Resolve P0 documentation identity and authority**: unique current `FINAL-SRS.md`, outdated `SRS.md` banner, README/verification counts, snapshot provenance.
2. **Resolve P0 publication authorization**: private repository audience/retention decision and permission to promote the workflow outside the design workspace.
3. **Freeze machine-readable contracts**: normalized dispatch request, run correlation, raw/linear/selected schemas, IDs, special value types, response-body byte definition, and paths.
4. **Specify safe execution**: no-eval decoding, resource limits, atomic writes, concurrency/conflict recovery, artifact/error ordering and readback.
5. **Make tests executable**: fixture corpus, code-backed acceptance cases, evidence collection and failing adversarial tests.
6. **Authorize and implement** without editing StateMachines or IssueStack source; conduct end-to-end verification and independently read back all required Git files.

**Review verdict:** The core dual-projection architecture is coherent and worth retaining. The document package should **not** yet be presented as an unambiguous approved release baseline because identity/version conflicts, snapshot coverage, live-data retention approval and implementation-level contracts remain unresolved. This review neither approves deployment nor asserts that a proposed Terminals extractor has passed a test.

## 6. Reviewed reference set

- [Target final SRS](FINAL-SRS.md) · [Earlier SRS](SRS.md) · [Interface and schemas](INTERFACES-AND-SCHEMAS.md) · [Verification plan](VERIFICATION-PLAN.md) · [Risk register](DECISIONS-AND-RISKS.md) · [Study](STUDY.md) · [Historical verification](VERIFICATION.md) · [Sources](SOURCES.md)
- [Terminals Issue #4](https://github.com/BestNameYet/Terminals/issues/4)
- [Current Terminals dispatch stub](https://github.com/BestNameYet/Terminals/blob/main/.github/workflows/manual-dispatch.yml)
- [GitHub CLI workflow dispatch manual](https://cli.github.com/manual/gh_workflow_run) — confirms `gh workflow run --json` accepts an inputs object from stdin and may return a run URL if available.
- [GitHub Actions workflow_dispatch documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) — supports typed inputs with a bounded overall payload and requires workflow definition on the default branch.

*The review's observations are based on retrieved repository documents and source files. Suggested corrections are design recommendations, not descriptions of code already implemented.*
