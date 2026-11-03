# Verification plan and complete requirements traceability

**Document:** EXT-VERIFY-001 | **Version:** 1.0 | **Date:** 2026-11-03  
**Coverage:** 78/78 functional requirements and 18/18 nonfunctional requirements in FINAL-SRS.md.  
**Execution status (updated 2026-11-03):** E2E-008 PASS with independently committed evidence; other acceptance cases retain their recorded statuses. Historical source-system runs are not substituted as Terminals results.

## 1. Test method and evidence

Every test must generate a ledger row containing test ID, requirement ID, test fixture identity and SHA-256, input fields, workflow/parser revision, intended Git branch, run ID and attempt (if any), expected observation, actual observation, terminal exit, assertions, artifact ID, published path and SHA, readback comparison, start/end timestamp, operator, and **PASS/FAIL/BLOCKED/NOT RUN**. A green GitHub Actions mark without final remote content evidence is insufficient. Never record a test as PASS from the SRS text alone.

**Levels:** (1) static interface and policy tests; (2) pure parser unit tests over synthetic indexed tables; (3) offline saved-HTML fixture/golden tests; (4) mocked HTTP/path/Git fault injection; (5) staged GitHub Actions integration on controlled targets; (6) real public shared-URL end-to-end acceptance after privacy/permission approval; (7) remote-main byte readback and failure-injection reconciliation.

**Safety:** Destructive Git tests shall use a controlled test branch/repository and not corrupt main. Credential and malicious-script fixtures must be benign canaries; a test shall not contact disallowed destinations. Dynamic output paths stay below the approved workspaces location. Tests that require elevated permission must record that permission as a precondition.

## 2. Mandatory fixture corpus

| Fixture ID | Description | Required assertions |
| --- | --- | --- |
| FIX-001 | Checked-in valid known HTML from IssueStack sample, subject to licensing/access approval | Existing visible counts 85/40/61 and golden Markdown parity |
| FIX-002 | Synthetic valid linear-plus-mapping graph with unique ordered IDs | Both projections and comparison deterministic |
| FIX-003 | Linear order differs from ancestry selected order | Each method retains its own chronology |
| FIX-004 | Additional mapping-only alternate branch nodes | Not inserted into linear; differences reported |
| FIX-005 | Mixed user/commentary/final/tool/system/internal and nontext parts | Raw retention, visible filtering |
| FIX-006 | Null and no-message linear entries | All original indices accounted |
| FIX-007 | Missing, empty, invalid linear array variants | Complete profile fails, no fallback |
| FIX-008 | Missing mapping/current node, cycle and absent-parent variants | Branch failure, no linear fallback |
| FIX-009 | Malformed enqueue literal, invalid indexed array, unsupported sentinel, cycle, deep graph | Decoder safely fails |
| FIX-010 | Hostile inline script with harmless canary side effect | Script never executed |
| FIX-011 | Unicode, quotes, newlines and Markdown-special content | Exact HTML bytes and stable rendering |
| FIX-012 | Redirect/status/MIME/timeout/oversize HTTP simulation | Network bounds and allowlist |
| FIX-013 | Path escape, symlink ancestor/leaf, attempted overwrites | No unsafe filesystem effects |
| FIX-014 | Git conflicts, published-file drift, post-push failure | No lost updates or false VERIFIED |
| FIX-015 | Duplicate IDs and missing/invalid metadata | Diagnostics and raw preservation |
| FIX-016 | Source JSON nonrepresentable/cyclic special types | Explicit normalization policy or fail |
| FIX-017 | Repeat of same complete request under same controlled run metadata | Deterministic output bytes |
| FIX-018 | Valid large-page edge case near permitted HTML maximum | Resource limits, exact hashes and correct output |

A real historical StateMachines run reportedly returned 307 text records after traversing 2,989 ancestry nodes, and IssueStack has a known 186-record fixture. These are source-specific observations, not the synthetic test pass results here.

## 3. Functional acceptance matrix (complete)

Each line is an independently testable acceptance case. The final column is the **current** execution status, not a prediction.


### Dispatch and admission

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-001 | EXT-FR-001 | Inspect workflow_dispatch event configuration | Existing workflow identifier preserved; request_json added and defaults safe | **NOT RUN** |
| EXT-AT-002 | EXT-FR-002 | Dispatch request_json containing serialized local request file | Typed object parsed and admitted | **NOT RUN** |
| EXT-AT-003 | EXT-FR-003 | Invoke through gh with local file but no Git input commit | Request accepted without staging a request file | **NOT RUN** |
| EXT-AT-004 | EXT-FR-004 | Invoke legacy URL-only and optional path arguments | Legacy request is accepted and normalized | **NOT RUN** |
| EXT-AT-005 | EXT-FR-005 | Supply request_json and legacy target_url concurrently | Explicit mixed-mode error before network | **NOT RUN** |
| EXT-AT-006 | EXT-FR-006 | Supply malformed JSON, unexpected keys, wrong types and invalid profile | Every invalid request rejected with structured error | **NOT RUN** |
| EXT-AT-007 | EXT-FR-007 | Supply and omit request_id in separate requests | Provided ID preserved; omitted ID generated without collision | **NOT RUN** |
| EXT-AT-008 | EXT-FR-008 | Inspect run context and extraction receipt | Run ID, attempt, SHA, input mode, request ID and timestamps recorded | **NOT RUN** |
| EXT-AT-009 | EXT-FR-009 | Observe accepted dispatch followed by extraction failure | Status machine never calls dispatch success VERIFIED | **NOT RUN** |
| EXT-AT-010 | EXT-FR-010 | Dispatch through Issue #3 $ and gh modes with actual documented permissions | Authorization proven or failure explicit; no false dispatch-success claim | **NOT RUN** |
| EXT-AT-011 | EXT-FR-011 | Run equivalent gh and REST requests with identical JSON | Same normalized request and workflow behavior | **NOT RUN** |
| EXT-AT-012 | EXT-FR-012 | Launch concurrent requests and correlate via returned or independently inspected run ID | No latest-run guess; exact run identity and output linked | **NOT RUN** |

### Input, destination and network safety

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-013 | EXT-FR-013 | Try HTTP, wrong host, invalid UUID, credentials, custom port and newline | All rejected before fetch | **NOT RUN** |
| EXT-AT-014 | EXT-FR-014 | Use uppercase UUID plus trailing slash and query | Normalized lowercase ID; path excludes query | **NOT RUN** |
| EXT-AT-015 | EXT-FR-015 | Pass URL and path containing shell metacharacters and line breaks | No execution or GITHUB_ENV/GITHUB_OUTPUT injection | **NOT RUN** |
| EXT-AT-016 | EXT-FR-016 | Omit write_path with known run ID and attempt | Default expanded only after URL validation | **NOT RUN** |
| EXT-AT-017 | EXT-FR-017 | Submit valid and unknown template placeholders and overlong expanded path | Only permitted tokens expand; unknown or >240 rejected | **NOT RUN** |
| EXT-AT-018 | EXT-FR-018 | Submit absolute, dot, traversal, backslash, encoded separator and disallowed roots | All unsafe destinations rejected | **NOT RUN** |
| EXT-AT-019 | EXT-FR-019 | Create symlink ancestor or leaf inside an otherwise valid test workspace | No write across symlink; explicit safety error | **NOT RUN** |
| EXT-AT-020 | EXT-FR-020 | Repeat and collide runs with different URLs or same path | Existing verified data not clobbered | **NOT RUN** |
| EXT-AT-021 | EXT-FR-021 | Serve permitted redirects and sixth fetch iteration via controlled HTTP test server | Every URL revalidated; iteration limit enforced | **NOT RUN** |
| EXT-AT-022 | EXT-FR-022 | Use stalled HTTP response, 25 MiB and 25 MiB+1 body | Timeout and size ceiling enforced exactly | **NOT RUN** |
| EXT-AT-023 | EXT-FR-023 | Serve 404, 500, wrong MIME, zero body and missing redirect Location | Capture fails without success | **NOT RUN** |
| EXT-AT-024 | EXT-FR-024 | Provide stable HTML bytes with non-ASCII content | response.html identical byte-for-byte to source capture | **NOT RUN** |
| EXT-AT-025 | EXT-FR-025 | Scan logs, receipts and artifacts with canary secrets | No GitHub token or private headers exposed | **NOT RUN** |

### Nonexecuting indexed decoder

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-026 | EXT-FR-026 | Feed HTML with supported enqueue string literal in script | Decoder discovers serialized table without executing script | **NOT RUN** |
| EXT-AT-027 | EXT-FR-027 | Feed escaped literals and indexed keys/references | Table faithfully decoded to expected source structure | **NOT RUN** |
| EXT-AT-028 | EXT-FR-028 | Feed invalid JSON, missing stream and unsupported tag | Explicit decoder versioned error; no partial success | **NOT RUN** |
| EXT-AT-029 | EXT-FR-029 | Feed self-referential and deep references | Bounded traversal; valid references preserved, cycles detected | **NOT RUN** |
| EXT-AT-030 | EXT-FR-030 | Feed loader-path and unique structural fallback fixtures plus ambiguous candidates | Correct conversation chosen or ambiguity rejected | **NOT RUN** |
| EXT-AT-031 | EXT-FR-031 | Feed conversation with omitted optional title/model fields | Known values preserved and missing values not fabricated | **NOT RUN** |
| EXT-AT-032 | EXT-FR-032 | Embed arbitrary JS with observable side effect in HTML | Side effect never runs; no vm, eval or Function | **NOT RUN** |
| EXT-AT-033 | EXT-FR-033 | Instrument source fetch and decoder invocation | Exactly one page capture and one shared decode for both outputs | **NOT RUN** |

### Source-linear full projection

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-034 | EXT-FR-034 | Feed a valid nonempty linear_conversation array | Full profile requires it and proceeds | **NOT RUN** |
| EXT-AT-035 | EXT-FR-035 | Remove, null, empty or change linear_conversation type | No ancestry fallback; complete profile fails | **NOT RUN** |
| EXT-AT-036 | EXT-FR-036 | Feed null and no-message entries interleaved with messages | Every index retained and classified | **NOT RUN** |
| EXT-AT-037 | EXT-FR-037 | Feed tool, internal and mixed-media nodes | Raw content and metadata preserved in structured output | **NOT RUN** |
| EXT-AT-038 | EXT-FR-038 | Feed all enumerated metadata fields | Normalized fields and raw values faithfully retained | **NOT RUN** |
| EXT-AT-039 | EXT-FR-039 | Feed missing fields and media-only content | Null/absent representations explicit; no invented text | **NOT RUN** |
| EXT-AT-040 | EXT-FR-040 | Feed duplicate node IDs and malformed nodes | Duplicates and anomalies preserved and diagnosed | **NOT RUN** |
| EXT-AT-041 | EXT-FR-041 | Feed nonmonotonic timestamps | Source array order unchanged | **NOT RUN** |
| EXT-AT-042 | EXT-FR-042 | Run range and uniqueness assertions on every linear record index | Exactly indices 0 through length-1 | **NOT RUN** |
| EXT-AT-043 | EXT-FR-043 | Feed mapping with alternate nodes and extra metadata | Raw conversation retains all safely representable fields | **NOT RUN** |
| EXT-AT-044 | EXT-FR-044 | Feed unsupported cyclic/special value without declared lossless encoding | Complete profile fails instead of truncating data | **NOT RUN** |

### Selected visible projection

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-045 | EXT-FR-045 | Remove mapping or current_node from otherwise valid linear fixture | Selected branch fails without linear substitution | **NOT RUN** |
| EXT-AT-046 | EXT-FR-046 | Feed ancestry cycle and missing parent in separate fixtures | Explicit graph errors; no fabricated chain | **NOT RUN** |
| EXT-AT-047 | EXT-FR-047 | Construct disagreeing linear and selected parent orders | Visible ordering follows ancestry only | **NOT RUN** |
| EXT-AT-048 | EXT-FR-048 | Feed system, tool, assistant analysis, user, commentary and final text | Only allowed visible text projected | **NOT RUN** |
| EXT-AT-049 | EXT-FR-049 | Feed mixed textual and image/content objects | Text part order preserved; no fake media text | **NOT RUN** |
| EXT-AT-050 | EXT-FR-050 | Feed no user or no final records | Selected product rejected as incomplete | **NOT RUN** |
| EXT-AT-051 | EXT-FR-051 | Validate role-channel combinations and count sums | Existing visible v1 schema observed exactly | **NOT RUN** |
| EXT-AT-052 | EXT-FR-052 | Compare Markdown output and JSON records on golden fixture | One-to-one labels, counts, order and formatting | **NOT RUN** |
| EXT-AT-053 | EXT-FR-053 | Inspect metadata/projection provenance statements | Readable subset never represented as complete raw export | **NOT RUN** |
| EXT-AT-054 | EXT-FR-054 | Feed mismatching linear and selected ID lists | Differences logged; both independent outputs unmodified | **NOT RUN** |

### Diagnostics and integrity

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-055 | EXT-FR-055 | Run fixture with missing nodes, duplicates, nontext and exclusions | Diagnostics include source discovery, categories, anomalies and differences | **NOT RUN** |
| EXT-AT-056 | EXT-FR-056 | Run same captured source twice with identical declared parameters | Content outputs stable except run-varying metadata | **NOT RUN** |
| EXT-AT-057 | EXT-FR-057 | Measure exact UTF-8 bytes and SHA-256 for six content data files | Receipt digests and byte sizes match | **NOT RUN** |
| EXT-AT-058 | EXT-FR-058 | Modify array index, schema, role and Markdown count one at a time | Independent validation rejects each mismatch | **NOT RUN** |
| EXT-AT-059 | EXT-FR-059 | Flip one byte in each hashed data file one test at a time | Every tamper attempt blocks publication | **NOT RUN** |
| EXT-AT-060 | EXT-FR-060 | Run locked known HTML fixture before live URL fetch | Golden outputs pass; invalid golden prevents network access | **NOT RUN** |
| EXT-AT-061 | EXT-FR-061 | Run mandatory negative fixture corpus | Each documented malformed case gets explicit expected error | **NOT RUN** |
| EXT-AT-062 | EXT-FR-062 | Fail a required stage while artifact upload is enabled | Artifact marked unverified and final run not VERIFIED | **NOT RUN** |
| EXT-AT-063 | EXT-FR-063 | Inspect receipt with actual run/source metadata | Both method IDs, paths, counts, hashes and provenance present | **NOT RUN** |
| EXT-AT-064 | EXT-FR-064 | Inspect precommit execution.json before publication | No guessed future commit SHA or premature verified status | **NOT RUN** |

### Artifact, Git publication and final proof

| Test | Requirement | Stimulus / setup | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-AT-065 | EXT-FR-065 | Run full export with Actions artifact enabled | All eight files uploaded under run identity and retention configured | **NOT RUN** |
| EXT-AT-066 | EXT-FR-066 | Create output directory and symlink race fixture | Only allowlisted eight files copied to authorized resolved path | **NOT RUN** |
| EXT-AT-067 | EXT-FR-067 | Run with no Terminals registry convention and with documented registry fixture | No invented config registry; actual required inventory processed | **NOT RUN** |
| EXT-AT-068 | EXT-FR-068 | Inspect git staged diff after validated outputs | Exactly eight approved files and separately authorized metadata paths | **NOT RUN** |
| EXT-AT-069 | EXT-FR-069 | Re-run bytes-identical export to same permitted run target fixture | No redundant commit; remote readback still performed | **NOT RUN** |
| EXT-AT-070 | EXT-FR-070 | Launch two concurrent exports to same branch | No lost updates; queued/serialized push operations | **NOT RUN** |
| EXT-AT-071 | EXT-FR-071 | Inject non-fast-forward conflicts repeatedly | No more than three bounded publish attempts; safe fail on exhaustion | **NOT RUN** |
| EXT-AT-072 | EXT-FR-072 | After push fetch remote main and inspect each of eight required files | Every remote file byte-identical and hash-equal | **NOT RUN** |
| EXT-AT-073 | EXT-FR-073 | Delete or alter one required remote file before final readback | VERIFIED denied and error identifies path | **NOT RUN** |
| EXT-AT-074 | EXT-FR-074 | Inspect final Actions attestation on passing run | Real run, commit SHA, all paths, hashes, explicit remote proof | **NOT RUN** |
| EXT-AT-075 | EXT-FR-075 | Force failure after push and before remote readback | PUBLISHED_UNVERIFIED or FAILED, no fictional rollback | **NOT RUN** |
| EXT-AT-076 | EXT-FR-076 | Allow artifact upload or successful push but break mandatory readback | Final run fails; false VERIFIED prohibited | **NOT RUN** |
| EXT-AT-077 | EXT-FR-077 | Check checked-in parser SHA and intercept attempted external source load | Versioned local runtime only; mutable remote runtime code disallowed | **NOT RUN** |
| EXT-AT-078 | EXT-FR-078 | Attempt workflow mutation outside design workspace without separate approval | Promotion blocked; documentation modifications remain in workspace | **NOT RUN** |

## 4. Nonfunctional acceptance matrix

| Test | Requirement | Stimulus / method | Pass condition | Status |
| --- | --- | --- | --- | --- |
| EXT-NAT-001 | EXT-NFR-001 | Node and runner version verification | Node version and Ubuntu match approved tested matrix | **NOT RUN** |
| EXT-NAT-002 | EXT-NFR-002 | Job exceeding configured 15-minute timeout | Job ends unsuccessfully at bound | **NOT RUN** |
| EXT-NAT-003 | EXT-NFR-003 | Redirect/request timeout/body limit at edge values | 45s per request, five iterations, 25 MiB cap enforced | **NOT RUN** |
| EXT-NAT-004 | EXT-NFR-004 | Malicious HTML JS and shell injection fixtures | No source code evaluation or command injection | **NOT RUN** |
| EXT-NAT-005 | EXT-NFR-005 | Redirect attempt to off-allowlist URL | Redirect disallowed before fetch | **NOT RUN** |
| EXT-NAT-006 | EXT-NFR-006 | Path escape and symlink graph fixtures | Never writes outside approved workspace | **NOT RUN** |
| EXT-NAT-007 | EXT-NFR-007 | Instrumentation over B,S,L,M,P controlled growth | One capture/decoder, expected linear-time component behavior | **NOT RUN** |
| EXT-NAT-008 | EXT-NFR-008 | Deep graph and cyclic/index bomb fixture | Bounded memory/time and controlled failure | **NOT RUN** |
| EXT-NAT-009 | EXT-NFR-009 | Stable input repeated with fixed run metadata | Byte-identical deterministic files | **NOT RUN** |
| EXT-NAT-010 | EXT-NFR-010 | Tampered source/output and remote mirror | All SHA-256 and remote-equality checks catch mutation | **NOT RUN** |
| EXT-NAT-011 | EXT-NFR-011 | Authorization scopes and log-secret canaries | Only required privileges; no secret exposure | **NOT RUN** |
| EXT-NAT-012 | EXT-NFR-012 | Raw data privacy and repository visibility audit | Explicit access-control acceptance before live publication | **NOT RUN** |
| EXT-NAT-013 | EXT-NFR-013 | Concurrent branch writes and same-run collision | No lost update or overwrite | **NOT RUN** |
| EXT-NAT-014 | EXT-NFR-014 | One failure injected at every mandatory stage | Correct structured non-success state | **NOT RUN** |
| EXT-NAT-015 | EXT-NFR-015 | Fixture drift and version-upgrade regression | Unsupported changed serialization fails closed | **NOT RUN** |
| EXT-NAT-016 | EXT-NFR-016 | Semantic completeness review vs independent UI reference | Unproven or measured limitations disclosed | **NOT RUN** |
| EXT-NAT-017 | EXT-NFR-017 | Artifact expiration setting and raw Git persistence review | 30-day artifact target and separate Git privacy approval | **NOT RUN** |
| EXT-NAT-018 | EXT-NFR-018 | Full versus selected output scope assertion | Raw full content not silently filtered; visible scope labeled | **NOT RUN** |

## 5. Full end-to-end scenarios and completion gates

**E2E-001 — JSON-file transport:** Create request.json following INTERFACES-AND-SCHEMAS.md; submit as workflow_dispatch request_json through GitHub CLI; obtain a correlated Actions run; fixture test precedes live fetch; retain original HTML; produce both independent projections and diagnostics; independently validate all bytes; upload eight files; commit eight run-specific files; fetch remote main; compare all bytes/hashes; emit external attestation with real commit SHA. **Status: NOT RUN**.

**E2E-002 — REST dispatch:** Issue an authenticated dispatch with inputs.request_json; retain actual run identifier (if returned), or correlate from verified workflow metadata; validate the same outputs and constraints as E2E-001. **Status: NOT RUN**.

**E2E-003 — legacy URL-only:** Submit target_url without request_json; default output template derived from UUID, run ID and attempt; no fixed sample UUID and no request-file commit. **Status: NOT RUN**.

**E2E-004 — explicit path:** Supply a legitimate permitted write_path template; confirm that path is used exactly after expansion, while an invalid override fails and is not silently substituted. **Status: NOT RUN**.

**E2E-005 — Issue #3 terminal adapter:** From the documented Issue #3 command schema issue a gh or Bash workflow dispatch; verify Actions permission or report a bounded authorization failure; correlate terminal command receipt to extraction run and final Git proof. **Status: NOT RUN**.

**E2E-006 — missing linear:** Supply valid HTML lacking linear_conversation but containing mapping/current_node; full profile MUST fail with linear-specific error, preserving optional partial diagnostics; ancestry transcript must NOT be relabeled complete export. **Status: NOT RUN**.

**E2E-007 — missing selected branch:** Supply valid nonempty linear_conversation but broken ancestry; full profile MUST fail with branch-specific error; linear records must NOT be relabeled selected visible transcript. **Status: NOT RUN**.

**E2E-008 — concurrency:** Dispatch at least two public shares simultaneously, capture both run IDs, allow serial noncancelled publication, prove no overwritten paths and verify all required files for both outputs. **Status: PASS** (2026-11-03; [independent two-share evidence](acceptance/E2E-008-DISTINCT-SHARES-20261103.md)).

**E2E-009 — partial publication:** Simulate successful push followed by remote mismatch; final result is PUBLISHED_UNVERIFIED or FAILED with run/path evidence and no false VERIFIED. **Status: NOT RUN**.

**E2E-010 — semantic review:** Independently compare selected-visible output against a rendered public ChatGPT share under a repeatable inspection protocol. Report unsupported/nontext portions and uncertainty; no unproven completeness claim. **Status: NOT RUN**.

## 6. System invariants and failure-state coverage

| Invariant | Coverage |
| --- | --- |
| I-01 URL determines normalized share UUID | EXT-AT-013, 014 |
| I-02 destination validated after template expansion | EXT-AT-016 through 020 |
| I-03 one capture and decode | EXT-AT-024, 033 |
| I-04 each linear index preserved | EXT-AT-036, 041, 042 |
| I-05 ancestry controls selected chronology | EXT-AT-046, 047 |
| I-06 no silent fallback | EXT-AT-035, 045, 047, E2E-006, E2E-007 |
| I-07 JSON and Markdown count parity | EXT-AT-050 through 052, 058 |
| I-08 receipt hashes reflect bytes | EXT-AT-057, 059 |
| I-09 exact approved Git staging | EXT-AT-066 through 068 |
| I-10 remote equality before success | EXT-AT-072, 073, 074 |
| I-11 no self-referential commit receipt | EXT-AT-064, 074 |
| I-12 failed mandatory stage cannot end VERIFIED | EXT-AT-009, 062, 075, 076 |

All 12 failure IDs EXT-ERR-INPUT, PATH, DISPATCH, HTTP, DECODE, LINEAR, BRANCH, CONTENT, INTEGRITY, ARTIFACT, PUBLISH and READBACK require at least one injected negative test, exact failure stage and a negative VERIFIED assertion. Their coverage is spread across the functional acceptance matrix and E2E-006 through 009.

## 7. Release acceptance criteria

1. All 78 functional tests pass with machine-readable evidence; **zero failures, zero BLOCKED and zero NOT RUN** at release gate.
2. All 18 nonfunctional tests pass, or a requirement is formally revised and the test traceability updated before release; a waiver cannot silently change scope.
3. E2E-001 through E2E-010 are each executed and PASS, including a real public-source run and actual remote file byte readback.
4. Privacy/access policy is approved for committing raw source, metadata and internal/tool-role information to the repository; no credential or sensitive-header leakage.
5. Terminal dispatch permissions and repository branch policy are verified; any required workflow/source promotion outside the project workspace has been separately approved.
6. Final attestation lists all **eight** committed files, their remote bytes/hashes, correlation ID, run ID, commit SHA and readback VERIFIED result.
7. Every assumption and deviation in DECISIONS-AND-RISKS.md is resolved or explicitly classified as a disclosed compatibility limitation.

## 8. Recorded status for this SRS delivery

Requirements documented: **78 functional, 18 nonfunctional.** Acceptance cases specified: **78 functional, 18 nonfunctional, 10 integration scenarios**, with 18 required fixture classes. **New extractor acceptance tests run for this design delivery: 0.** Do not infer functionality from the presence of the SRS, study or archived comments.


## 9. Post-delivery execution addendum (2026-11-03)

[E2E-008](acceptance/E2E-008-DISTINCT-SHARES-20261103.md) passed for two distinct public shares dispatched in the same recorded second; all 16 repository output files and both final attestations independently verified. This does not imply that the remaining listed acceptance tests have passed.
