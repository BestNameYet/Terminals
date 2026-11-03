# Final Software Requirements Specification — Shared-conversation extraction and verified Git publication

**Document ID:** EXT-SRS-001  
**Version:** 1.0 — final proposed design baseline (not approved or deployed)  
**Date:** 2026-11-03  
**Repository:** BestNameYet/Terminals  
**Documents:** STUDY.md, INTERFACES-AND-SCHEMAS.md, VERIFICATION-PLAN.md, DECISIONS-AND-RISKS.md, SOURCES.md  
**Scope:** Complete source-linear structured extraction **and** independently derived selected visible-branch text extraction from a single public ChatGPT share page, invoked by workflow_dispatch with a JSON request and a default destination template.

## 1. Purpose, authority and status

This SRS defines a testable implementation target, not an assertion of operational software. It synthesizes **every one of the five Issue #4 comments**, which are retained in sources/issue-4-comments.json; the technical rationale and implementation observations are recorded in STUDY.md. The SRS is final as a documentation deliverable and remains **proposed** until authorized and its acceptance suite passes. No current Terminals extractor is certified by this document.

Normative terms: **SHALL** mandatory; **SHALL NOT** prohibited; **MAY** optional, with absent behavior documented. Evidence terms: **observed** = source inspected; **proposed** = requirement in this SRS; **verified** = successful execution evidence including final remote readback.

Design strategy: **one HTTPS capture, one nonexecuting indexed-stream decode, two distinct ordering projections, one validation/publishing pipeline**. The two output products must not masquerade as the same chronology: linear_conversation controls structured linear order; mapping/current_node parent ancestry controls selected-visible text order.

## 2. Goals and exact boundaries

### In scope

- User-dispatched GitHub Actions workflow, including GitHub CLI, Bash and authenticated REST dispatch.
- JSON-file input transport without requiring an input-file commit, and compatibility with existing target_url/write_path inputs.
- Dynamic default write_path template evaluated after URL validation.
- Public HTTPS shared-conversation HTML retrieval with bounded redirects, response size/time guards and saved original bytes.
- Nonexecuting decoding of supported React Router stream-controller enqueue literals and indexed references.
- Full available decoded conversation and original linear_conversation node order, with raw content and metadata.
- Independently reconstructed mapping/current_node selected branch, and readable Markdown/JSON filtered to user and assistant commentary/final text.
- Diagnostics of absent, excluded, malformed and inconsistent nodes and explicit linear-versus-branch comparisons.
- Deterministic file serialization, integrity receipts, fixture regression, independent count/order/hash validation, Actions artifacts, file allowlisting and repository publication.
- Source/run correlation, conflict handling, remote byte readback, failure receipts, operator instructions and acceptance evidence.

### Out of scope

- ChatGPT authentication, private chats or bypass of access controls.
- Guaranteed all-branch/full-account coverage, semantic completeness of unavailable data, video/audio OCR and browser UI replay.
- Arbitrary script execution from downloaded HTML.
- Silent replacement of a missing linear array with ancestry or vice versa.
- Changes to StateMachines or IssueStack repositories.
- Claiming GitHub dispatch acceptance, repository commit or artifact upload as proof of verified extraction.

## 3. Operational environment and responsibilities

| Component | Responsibility |
| --- | --- |
| Operator / caller | Prepare validated JSON request, invoke dispatch, follow correlated run, inspect final receipt |
| Issue #3 terminal adapter (optional) | Transport user command through its documented runOn/whatPrompt/forWhom schema; does not perform extraction itself |
| Existing .github/workflows/manual-dispatch.yml | Authoritative workflow_dispatch entry point, request admission, test gates, Node execution, Git publication and readback |
| Versioned Node.js extractor within authorized workspace | Secure HTTP capture, indexed source decoding, two projections, diagnostics, deterministic output and preliminary receipt |
| GitHub Actions artifacts | Preserve per-run capture and diagnostic evidence under configured access/retention |
| Repository main | Persist exactly approved run-scoped outputs; guard branch and concurrent writes |
| External final attestation | Bind run ID, published commit SHA, path, hashes and remote-readback result without a self-referential committed file |

The existing workflow presently only prints target_url/write_path. The proposed implementation SHALL replace that stub behavior only after required tests and authorization.

## 4. External interfaces

### 4.1 Dispatch transport

Maintain .github/workflows/manual-dispatch.yml as the public workflow identifier. Accept a preferred **request_json** string containing a JSON object whose content can be supplied from a caller's local JSON file. Also preserve legacy target_url and write_path for compatibility. In a request_json dispatch, legacy fields must be **empty**; the YAML default for the legacy target URL must be removed. Mixed request modes SHALL fail clearly. Legacy mode requires target_url and accepts optional write_path. A dispatch with neither request form SHALL fail.

A JSON input file may be sent using GitHub CLI: gh workflow run manual-dispatch.yml -R BestNameYet/Terminals -r main -f "request_json=$(cat request.json)". Alternatively, use jq -Rs '{request_json: .}' request.json and pipe it to gh workflow run ... --json. REST dispatch may pass inputs.request_json as a JSON string. Operator input does **not** need to be committed to main.

Input request fields: target_url required; write_path optional and defaulting to workspaces/shared-conversations/{share_uuid}/{run_id}-{run_attempt}; request_id optional; export_profile optional, default complete. Unknown fields SHALL be rejected. The canonical schema and full examples are in INTERFACES-AND-SCHEMAS.md.

### 4.2 Destination semantics

The default write_path is a **repository-relative directory template**. Legal tokens are {share_uuid}, {run_id}, {run_attempt}, and no others; tokens are substituted once, after share UUID and run context validation. Unknown tokens and unresolved brackets SHALL cause failure. No share URL query string is used to derive a path. Valid custom paths are honored **exactly after expansion**, subject to authorization and collision constraints; rejected custom paths are never silently replaced by the default.

All generated repository content SHALL reside below workspaces/shared-conversations for production output. The SRS and implementation itself remain inside workspaces/extractor-srs-design for the design phase. A production implementation change outside that project workspace, including modification of .github/workflows/manual-dispatch.yml, requires separately authorized promotion.

### 4.3 Output contract

The complete profile SHALL generate these eight files in each resolved destination:

| File | Meaning |
| --- | --- |
| response.html | Exact HTTP response bytes after the permitted redirect chain |
| conversation-raw.json | Full decoded conversation object supported by current decoder, without silent role/content filtering |
| linear-conversation.json | Every available linear_conversation entry, preserving original index, raw node and supported normalization |
| conversation.json | Selected-branch visible text, with schema chatgpt.shared-conversation.visible.v1 or a versioned compatible successor |
| conversation.md | Readable selected-branch text, ordered from current_node ancestry |
| diagnostics.json | Discovery, structural anomalies, role/channel/media distributions, exclusions and cross-projection discrepancies |
| receipt.json | Immutable content file hashes, lengths, methods, source/run provenance; does not hash itself |
| execution.json | Precommit execution evidence/status and stage outcomes; does not contain a claim about its own future commit SHA |

An independent **final Actions attestation** SHALL report the definitive publication SHA and readback outcome. Its content is not required to be embedded in the commit it describes. Exact schemas, JSON nullability, normalization rules and examples are in INTERFACES-AND-SCHEMAS.md.

## 5. Functional requirements

Each requirement is mandatory for the complete-profile implementation unless explicitly marked MAY. Identifiers remain stable for traceability.

### 5.1 Admission, dispatch and correlation

| ID | Requirement |
| --- | --- |
| EXT-FR-001 | The workflow SHALL expose workflow_dispatch on the default branch and preserve the existing manual-dispatch.yml entry point. |
| EXT-FR-002 | It SHALL accept a complete JSON request through request_json as one string-form dispatch input. |
| EXT-FR-003 | A caller SHALL be able to supply request_json from a local UTF-8 JSON file without committing the file. |
| EXT-FR-004 | The workflow SHALL retain valid legacy target_url and write_path inputs, with empty YAML defaults and explicit mode selection. |
| EXT-FR-005 | The workflow SHALL reject simultaneous nonempty request_json and legacy target_url/write_path fields. |
| EXT-FR-006 | It SHALL validate JSON syntax, object type, exact allowed keys, required nonempty target_url, string types and enumerated export_profile values. |
| EXT-FR-007 | It SHALL accept an optional request_id and generate a collision-resistant correlation value if absent; it SHALL not equate request_id with an Actions run ID. |
| EXT-FR-008 | It SHALL record Actions run ID, attempt, source revision, input method, request_id and timestamps. |
| EXT-FR-009 | It SHALL distinguish dispatch requested, dispatch accepted, run started, extraction succeeded, published and remotely VERIFIED. |
| EXT-FR-010 | The Issue #3 runner adapter MAY be used only after confirming authorization to dispatch workflows and preserving its documented JSON command schema. |
| EXT-FR-011 | Authenticated REST and gh CLI calls SHALL lead to the same workflow validation rules and outputs for identical requests. |
| EXT-FR-012 | A caller SHALL correlate any running or completed job using an independently verified run identifier, never merely the latest workflow run. |

### 5.2 Input validation, path safety and network boundary

| ID | Requirement |
| --- | --- |
| EXT-FR-013 | The workflow SHALL require HTTPS chatgpt.com/share/<UUID> URLs and reject credentials, custom ports, malformed UUIDs, unsupported hosts/schemes and line breaks. |
| EXT-FR-014 | Valid share URLs MAY contain trailing slash and query parameters; neither shall alter the normalized lowercase share UUID. |
| EXT-FR-015 | It SHALL bind network input as data, not shell source, and SHALL prevent input injection via quoting/environment-file delimiters. |
| EXT-FR-016 | The workflow SHALL apply the default path template only after validating target_url and extracting share_uuid. |
| EXT-FR-017 | It SHALL expand only the three approved tokens, reject unknown or unresolved tokens, and enforce a maximum resolved path length of 240 characters. |
| EXT-FR-018 | It SHALL reject absolute paths, backslash separators, empty/dot/dot-dot components, traversal, encoded bypasses and unauthorized roots. |
| EXT-FR-019 | Before writing it SHALL reject symlinked existing path components, symlink output leaves and path resolutions escaping the permitted root. |
| EXT-FR-020 | It SHALL reject collisions with unrelated source URLs, run IDs, or unexpected preexisting files; repeated invocations shall not overwrite previous verified runs. |
| EXT-FR-021 | It SHALL issue at most five HTTP fetch iterations, validating the effective target URL before each request and any following redirect. |
| EXT-FR-022 | It SHALL enforce a per-request 45-second timeout and a 25 MiB decoded-response-body byte ceiling. |
| EXT-FR-023 | It SHALL reject non-success HTTP status, unsupported HTML/XHTML content type, missing redirect location, empty body or oversize content. |
| EXT-FR-024 | It SHALL retain exact original acquired HTML bytes and record actual final URL, status and redirect count. |
| EXT-FR-025 | It SHALL not authenticate to ChatGPT or log authorization tokens, GitHub credentials or private HTTP headers. |

### 5.3 Safe source decoder

| ID | Requirement |
| --- | --- |
| EXT-FR-026 | It SHALL read recognized script elements containing window.__reactRouterContext.streamController.enqueue(...) calls from original HTML, without executing their code. |
| EXT-FR-027 | It SHALL parse only supported literal serialized arguments, unescape their JSON encoding and validate the indexed table structure. |
| EXT-FR-028 | It SHALL reject malformed unsupported payloads and report which decoder strategy/version was attempted. |
| EXT-FR-029 | It SHALL reconstruct supported indexed references/keys, preserve representable source types and use bounded traversal with cycle detection. |
| EXT-FR-030 | It SHALL locate the conversation through a documented loader path or bounded structural discovery; ambiguous unrelated candidates SHALL fail rather than be arbitrarily selected. |
| EXT-FR-031 | It SHALL preserve source conversation identity/title/model metadata when supplied, without fabricating missing values. |
| EXT-FR-032 | No untrusted inline HTML, page JavaScript expression, serialized function or markup shall be evaluated via vm, eval or Function. |
| EXT-FR-033 | The decoder SHALL produce one shared in-memory representation used for both projection methods; it SHALL NOT fetch or decode the same page separately merely to generate each output. |

### 5.4 Source-linear complete structured projection

| ID | Requirement |
| --- | --- |
| EXT-FR-034 | A complete export SHALL require linear_conversation to be a nonempty array in the decoded conversation. |
| EXT-FR-035 | Missing, null, wrong-type or empty linear_conversation SHALL fail the complete profile explicitly with no ancestry fallback. |
| EXT-FR-036 | Every linear array entry SHALL be accounted for in its original index order, including null/nonmessage nodes with explicit normalization markers. |
| EXT-FR-037 | Output SHALL preserve each original linear node and its message/content object without dropping non-text data or unknown supported metadata. |
| EXT-FR-038 | Normalized records SHALL include source index, node ID/parent, role, author name, channel, recipient, times, content type, status, end_turn, model identifiers and derived text when available. |
| EXT-FR-039 | Missing fields SHALL be represented as absent or null per schema; extracted text SHALL NOT be invented for nontext parts. |
| EXT-FR-040 | Duplicate IDs, unsupported part shapes and nodes with no message SHALL be retained/diagnosed rather than silently deleted or merged. |
| EXT-FR-041 | The array order SHALL NOT be changed to timestamp order or selected ancestry order. |
| EXT-FR-042 | It SHALL verify linear output count equals the source linear array length, with each zero-based index present exactly once. |
| EXT-FR-043 | The raw conversation JSON SHALL retain available decoded source graph data, including mapping and other fields, subject only to explicitly reported lossless-JSON normalization. |
| EXT-FR-044 | If the serialization includes unsupported non-JSON/cyclic values that prevent a faithful export, the complete profile SHALL fail and preserve diagnostic evidence, not silently truncate. |

### 5.5 Independently selected visible-branch projection

| ID | Requirement |
| --- | --- |
| EXT-FR-045 | It SHALL require mapping/current_node for the selected-branch product and reject missing or malformed graph roots. |
| EXT-FR-046 | It SHALL resolve message IDs to nodes, follow parent references from current_node, detect missing parent links and cycles, and reverse ancestry to chronological order. |
| EXT-FR-047 | Selected-branch order SHALL derive only from the validated ancestry, not linear_conversation, timestamps or prior exports. |
| EXT-FR-048 | It SHALL retain substantive text-bearing user records and assistant commentary/final records only in the selected-visible transcript. |
| EXT-FR-049 | It SHALL join textual content parts in original part order, distinguish user channel null from assistant commentary/final, and retain no synthetic text for other parts. |
| EXT-FR-050 | It SHALL require at least one user and one assistant final record and consistent category/message counts for a successful selected-visible export. |
| EXT-FR-051 | The selected JSON SHALL record schema identifier, original URL, exact ordered records and user/commentary/final counts. |
| EXT-FR-052 | The Markdown SHALL render the same records in the same order with distinct user, assistant commentary and assistant final labels and deterministic formatting. |
| EXT-FR-053 | The workflow SHALL explicitly document that selected-visible text is a subset rather than the complete raw conversation. |
| EXT-FR-054 | It SHALL compare source-linear and selected-branch node IDs/counts and emit differences without modifying either output or automatically failing merely because the representations differ. |

### 5.6 Diagnostics, integrity and evidence

| ID | Requirement |
| --- | --- |
| EXT-FR-055 | diagnostics.json SHALL include network/serialization discovery, decoder strategy, source node counts, normalized node outcomes, role/channel/content distributions, excluded visible-message reasons and representation differences. |
| EXT-FR-056 | It SHALL produce all eight required files deterministically for identical captured input and declared parameters, except explicitly identified run metadata. |
| EXT-FR-057 | It SHALL compute SHA-256 and exact byte size for each nonreceipt, nonexecution data file, and the receipt SHALL enumerate those values. |
| EXT-FR-058 | It SHALL independently reopen output bytes and validate declared schemas, array indices, role/channel constraints, count totals and Markdown/JSON parity. |
| EXT-FR-059 | It SHALL independently recompute every receipt digest and byte count; a mismatch SHALL block publication. |
| EXT-FR-060 | It SHALL run versioned offline HTML fixture regression tests before live retrieval, including exact expected outputs for linear and selected branch. |
| EXT-FR-061 | It SHALL include negative fixtures for missing/malformed linear array, broken ancestry, hostile scripts, indexed reference cycles, nontext content and tampered hashes. |
| EXT-FR-062 | It SHALL retain failure diagnostics and partial files only as clearly unverified artifacts; mandatory failure SHALL prevent a VERIFIED report. |
| EXT-FR-063 | The receipt SHALL identify both extraction methods, source URL/final URL, request_id, run ID/attempt, source revision, decoder version, output counts, hashes and destination. |
| EXT-FR-064 | The precommit execution file SHALL name stages, status and encountered errors, and SHALL NOT claim a future commit SHA or verified readback. |

### 5.7 Git publication and final verification

| ID | Requirement |
| --- | --- |
| EXT-FR-065 | The complete profile SHALL upload all eight run files as a correlated Actions artifact with declared retention; initial requested retention is 30 days. |
| EXT-FR-066 | After all validation gates pass, the workflow SHALL copy the exact eight allowlisted files to the resolved run-specific destination, with symlink and path checks immediately before writes. |
| EXT-FR-067 | It SHALL inspect and obey a real Terminals inventory convention if one exists; SHALL NOT fabricate config/file-metadata.json merely because IssueStack uses it. |
| EXT-FR-068 | It SHALL stage only the run-specific output files and any separately authorized actual Terminals inventory files; never git add the entire repository. |
| EXT-FR-069 | It SHALL avoid an unnecessary commit when all staged bytes are unchanged while still performing readback. |
| EXT-FR-070 | It SHALL serialize potentially conflicting main publication operations and SHALL NOT cancel an active publication to replace it with a newer request. |
| EXT-FR-071 | It SHALL push with no more than three bounded attempts and non-destructive fetch/rebase/reconciliation, failing explicitly on exhausted conflicts. |
| EXT-FR-072 | It SHALL fetch remote main after publication and compare **every required committed file** byte-for-byte with generated local bytes and SHA-256 values. |
| EXT-FR-073 | Missing remote file, different bytes, unverified main ref or incomplete source set SHALL fail VERIFIED status. |
| EXT-FR-074 | The Actions final attestation and summary SHALL include run ID/attempt, source SHA, published commit SHA, repository links, path, methods, counts, hash summary and explicit remote-readback result. |
| EXT-FR-075 | It SHALL distinguish uncommitted, partially published, published-unverified and VERIFIED states; Git publication is not falsely claimed transactional. |
| EXT-FR-076 | A successful artifact upload, dispatch response, local hash, or Git push alone SHALL NOT satisfy the final acceptance gate. |
| EXT-FR-077 | The implementation SHALL preserve source/workflow code version provenance and SHALL NOT download and execute mutable parser source from another repository at runtime. |
| EXT-FR-078 | Any required modification to workflow/configuration paths outside the authorized project workspace SHALL require separately approved promotion, not an implicit workspace-scope exception. |

## 6. Quality, security and operational requirements

| ID | Nonfunctional requirement and acceptance interpretation |
| --- | --- |
| EXT-NFR-001 | Node.js 20 or an explicitly upgraded version tested against the same fixtures; Ubuntu GitHub Actions; no browser required for core extraction. |
| EXT-NFR-002 | Maximum job execution timeout: 15 minutes; this is an execution limit, not a successful completion SLA. |
| EXT-NFR-003 | HTTP: at most five request iterations, 45 seconds per request, 25 MiB response-body cap, redirect revalidation. |
| EXT-NFR-004 | Source scripts are **never executed**; input and output paths are tainted data. |
| EXT-NFR-005 | All external endpoints and redirect destinations must satisfy strict public ChatGPT share URL allowlist. |
| EXT-NFR-006 | All resolved publication paths remain within an explicitly authorized Git workspace, without traversal or unsafe symlinks. |
| EXT-NFR-007 | The algorithm shall target O(B + S + L + M + P) processing over HTML bytes B, serialized slots S, linear nodes L, mapping nodes M and chain length P; no repeated page fetches for each projection. |
| EXT-NFR-008 | Memory and parsing depth shall be bounded; unsupported cyclic/special values shall fail explicitly rather than trigger unbounded recursion. |
| EXT-NFR-009 | JSON serialization order and Markdown rendering shall be deterministic for fixed source and options; run-variant metadata shall be isolated. |
| EXT-NFR-010 | Content file integrity shall use SHA-256 and byte-level remote equality, not only name/existence checks. |
| EXT-NFR-011 | Publication shall use least-privilege GitHub permissions, safe command quoting and no token disclosure. |
| EXT-NFR-012 | Complete raw capture contains potentially sensitive metadata; access controls must be reviewed before exposing it in repository or downloadable artifacts. |
| EXT-NFR-013 | Concurrency shall prevent lost Git updates and overwriting another run's export. |
| EXT-NFR-014 | Failures shall have machine-readable stage/reason and a non-success final run outcome. |
| EXT-NFR-015 | Fixtures shall be versioned and provenance-recorded, with both positive and adversarial cases; upstream serializer drift shall fail closed. |
| EXT-NFR-016 | No assertion of universal semantic fidelity, alternate-branch completeness, or guaranteed service availability is allowed without separate empirical evidence. |
| EXT-NFR-017 | Artifact retention target is 30 days unless an explicit approved policy changes it; the Git committed record is a separately controlled retention surface. |
| EXT-NFR-018 | Complete export content shall not be silently reduced to user/final text, and selected-visible projection shall not be represented as all raw content. |

## 7. Execution state machine and invariant constraints

Stages: REQUESTED -> DISPATCH_ACCEPTED -> STARTED -> INPUT_VALIDATED -> FIXTURE_VERIFIED -> HTML_CAPTURED -> SOURCE_DECODED -> LINEAR_PROJECTED -> BRANCH_PROJECTED -> OUTPUTS_VALIDATED -> ARTIFACT_SAVED -> GIT_STAGED -> GIT_PUBLISHED -> REMOTE_READBACK -> VERIFIED. A failed mandatory transition reaches FAILED and may optionally save a failure artifact without entering VERIFIED. If push occurs but readback fails, use PUBLISHED_UNVERIFIED, not VERIFIED.

Invariants: (I-01) validated source URL determines share UUID; (I-02) output path is validated after token expansion; (I-03) one source capture feeds both methods; (I-04) source-linear indices exactly equal 0..L-1; (I-05) selected branch is reverse parent ancestry; (I-06) no silent chronology fallback; (I-07) JSON count parity and Markdown selected-visible parity; (I-08) receipt hashes match actual bytes; (I-09) committed path content is allowlisted; (I-10) all remote required bytes match before verified conclusion; (I-11) run/commit attestation has no circular self-reference; (I-12) no failed mandatory stage may produce verified success.

## 8. Failure classes and recovery semantics

| Failure ID | Cause | Required outcome |
| --- | --- | --- |
| EXT-ERR-INPUT | Invalid JSON/URL/field/mixed mode | Fail before network |
| EXT-ERR-PATH | Invalid template, traversal, symlink, collision | Fail before writing/staging |
| EXT-ERR-DISPATCH | Insufficient dispatch permission/no correlated run | Do not claim accepted run |
| EXT-ERR-HTTP | Timeout, redirect, status, MIME, size | Fail capture, retain safe diagnostic evidence |
| EXT-ERR-DECODE | Missing/malformed recognized stream, ambiguous conversation, unsupported reference type | Fail both products |
| EXT-ERR-LINEAR | Missing, empty or invalid linear array | Fail complete profile, do not fallback |
| EXT-ERR-BRANCH | Mapping/current_node/parent invalid or cycle | Fail complete profile, do not substitute linear |
| EXT-ERR-CONTENT | Missing user/final or mismatched selected counts | Fail validation |
| EXT-ERR-INTEGRITY | Hash, byte length, source order, schema or Markdown mismatch | Fail before publication |
| EXT-ERR-ARTIFACT | Required artifact upload failed | Fail complete profile |
| EXT-ERR-PUBLISH | Branch policy/push/concurrency failure | Fail and describe partial/absent publication |
| EXT-ERR-READBACK | Any required remote file absent or unequal | Fail verified completion |

Do not automatically delete already pushed files on a later failure; Git rollback is a distinct auditable operation. Reattempts must not destroy earlier verified runs.

## 9. Traceability and test requirements

The independent verification plan in VERIFICATION-PLAN.md SHALL cover **all 78 functional requirements**, **all 18 nonfunctional requirements**, the failure classes and invariants. Tests SHALL record expected vs actual observations, fixture hash, run/workflow SHA, source URL, artifact IDs, commit SHA, and precise remote hashes when applicable. A "not run" test remains NOT RUN, not PASS.

A design review does not close the implementation gate. Acceptance requires: correct dispatch in both JSON-file and legacy modes; saved HTML; lossless supported linear projection; valid selected ancestry projection; independent parity and hash gates; artifact; bounded conflict-safe publication; and byte-identical readback of all eight committed files, with correlated final run attestation. Tests shall include concurrency, malformed data, source drift, path redirection and failure-after-push scenarios. See VERIFICATION-PLAN.md.

## 10. Implementation deliverables and promotion gates

Target implementation files (proposed, not presently created):

| Proposed path | Purpose |
| --- | --- |
| workspaces/extractor-srs-design/runtime/decoder.js | Nonexecuting indexed React Router decoder |
| workspaces/extractor-srs-design/runtime/extract.js | Network capture, linear and selected projection, diagnostics and receipts |
| workspaces/extractor-srs-design/runtime/validate.js | Independent schema/order/count/hash checks |
| workspaces/extractor-srs-design/runtime/publish.js | Safe path and publication/readback helper |
| workspaces/extractor-srs-design/tests/ | Fixtures, expected outputs, negative/contract/integration tests |
| workspaces/extractor-srs-design/README.md | Operator contract and artifact cross-references |
| .github/workflows/manual-dispatch.yml | **Separate promotion approval required:** replace input-printing stub with full orchestrator |

No runtime sources or workflow modifications were made to satisfy this documentation-only request. Changes outside the authorized workspace require separate authorization. Before any production claim, inspect available repository instructions, inventory rules and actual workflow permissions, and execute the acceptance plan.

## 11. Decision outcomes and still-unverified realities

This SRS **resolves at the design level** the central architecture choice (dual distinct projections sharing one safe decoder), URL transport (JSON file through workflow_dispatch, legacy compatibility), default dynamic path (run-isolated template), retention target (30-day artifact), and complete-profile publication (all eight data files plus separate final attestation). It does **not** claim empirical support for all ChatGPT serialized payload variants, universal linear array availability, permission for Issue #3 to dispatch, or the privacy approval necessary for storing complete source data in Git. Those are recorded in DECISIONS-AND-RISKS.md; failure to clear an operational gate is an implementation failure, not grounds to silently shrink the agreed scope.

**Final documentation result:** A full proposed, test-oriented SRS, with contracts and separate verification plan, synthesized from all five Issue #4 comments and current inspected source; the implemented extractor and all its end-to-end validation remain to be done.
