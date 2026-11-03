# Design decisions, alternatives, risks and approval boundaries

**Document:** EXT-ADR-001 | **Version:** 1.0 | **Date:** 2026-11-03  
**Scope:** Terminals Issue #4 synthesis and final proposed extractor design.  
**Interpretation:** Decisions marked SELECTED are the SRS's proposed choices; they are not owner approval or evidence of a deployed system.

## 1. Architecture decision register

| ID | Subject | Decision | Status and rationale |
| --- | --- | --- | --- |
| ADR-001 | Requested input medium | Local JSON file transported as workflow_dispatch request_json string; no committed request-file prerequisite | **SELECTED.** Meets dispatch-plus-JSON requirement without StateMachines push trigger |
| ADR-002 | Legacy compatibility | Retain target_url and write_path as alternate legacy inputs; reject mixed mode | **SELECTED.** Existing Terminals stub exposes those names |
| ADR-003 | Default path | workspaces/shared-conversations/{share_uuid}/{run_id}-{run_attempt} | **SELECTED.** Avoids hardcoded sample UUID and overwrites between runs |
| ADR-004 | Write destination type | Repository-relative output directory, not individual filename | **SELECTED.** Stable eight-file output contract |
| ADR-005 | Decode method | Nonexecuting parse of recognized React Router serialized enqueue string literals and indexed references | **SELECTED.** Reuses safe parts of newer builders; explicitly rejects old vm evaluation |
| ADR-006 | Source acquisition | One bounded HTTPS capture, save exact bytes | **SELECTED.** Network/source provenance and efficiency |
| ADR-007 | Source parsing | One shared decoded representation with memoization | **SELECTED.** Avoids fetching/parsing source twice |
| ADR-008 | Primary linear ordering | Direct linear_conversation array index | **SELECTED.** Required by newest Issue #4 linear design |
| ADR-009 | Selected-visible ordering | mapping/current_node parent ancestry reversed | **SELECTED.** Preserves existing tested selected-branch semantics |
| ADR-010 | Missing linear array | Fail complete profile, without mapping fallback | **SELECTED.** Prevent false complete-linear claims |
| ADR-011 | Missing parent-chain graph | Fail complete profile, without linear fallback | **SELECTED.** Prevent false selected-visible claims |
| ADR-012 | Data scope | Preserve complete safely decoded raw/linear records and separately filter selected-visible text | **SELECTED.** Addresses both divergent Issue #4 designs without losing scope |
| ADR-013 | Output count | Eight per-run files in Git and artifact; separate final attestation after push | **SELECTED.** Full raw provenance and independent final publication proof |
| ADR-014 | Receipt self-reference | Hash six content files, not receipt or execution; put actual commit SHA in external attestation | **SELECTED.** Avoids recursive hash/commit SHA impossibility |
| ADR-015 | Fixture regression | Known saved-HTML golden fixture before live network, plus synthetic negative corpus | **SELECTED.** Incorporates IssueStack regression precedent |
| ADR-016 | Git publication | Exact-path staging, no duplicate commit on identical bytes, serialized publication with bounded retries | **SELECTED.** Incorporates StateMachines publication safeguards |
| ADR-017 | Final success gate | Fetch remote main and compare each of eight published files byte-for-byte | **SELECTED.** Stronger than IssueStack's reviewed active workflow |
| ADR-018 | Artifact retention | Initial target 30 days; explicit retention/privacy review | **SELECTED pending policy approval.** StateMachines precedent |
| ADR-019 | Source availability | Public shares only | **SELECTED.** No ChatGPT authenticated scraping |
| ADR-020 | Source changes | Versioned decoder, compatibility tests, fail closed when unsupported | **SELECTED.** No guarantee across future HTML revisions |
| ADR-021 | Historical extractor source | Preserve old linear implementation as feasibility evidence but do not run its vm strategy | **SELECTED.** Unsafe downloaded-code execution is disallowed |
| ADR-022 | Issue #3 adapter | Optional; authorization/dispatch permission must be demonstrated | **OPEN operational prerequisite.** Observed workflow does not declare actions:write |
| ADR-023 | Repository file registry | Do not invent missing Terminals config/file-metadata.json | **SELECTED.** Different repositories have different metadata conventions |
| ADR-024 | Implementation location | Design and source under workspaces/extractor-srs-design; workflow change requires separate promotion approval | **SELECTED scope control.** Avoids implicit source/workflow mutations |
| ADR-025 | Branch policy | Main publication only after allowed GitHub permission and repo policy verified | **OPEN operational prerequisite.** Branch protection and token rights unverified |
| ADR-026 | Release profile | Only complete in baseline; no silently diminished export mode | **SELECTED.** Strict full-scope fidelity. Any future reduced profile must be independently specified and approved |
| ADR-027 | Privacy | Complete raw JSON/HTML retained in access-controlled repository and artifact | **OPEN owner policy approval** before live production with sensitive content |
| ADR-028 | Cross-view discrepancy | Record ID/count/order differences without silently modifying either representation | **SELECTED.** Divergent representations can each be valid |
| ADR-029 | Raw special values | Lossless tagged representation if explicitly supported; otherwise explicit failure | **SELECTED.** Avoid silent JSON data loss |
| ADR-030 | Completion classification | DESIGN_DOCUMENTS_COMPLETE is distinct from EXTRACTOR_IMPLEMENTED and E2E_VERIFIED | **SELECTED.** Accurate delivery state |

## 2. Principal alternatives considered and not selected

### StateMachines-only parent-chain export

**Advantage:** Demonstrated working extractor, strong remote readback and concise visible transcript. **Reason not selected as the whole final design:** Excludes raw nontext/tool nodes and direct linear array fidelity required by the newest Issue #4 SRS. It remains the authoritative selected-visible projection algorithm.

### IssueStack-only exporter

**Advantage:** Golden HTML fixture with exact Markdown checks, commits original HTML and receipt, registry update. **Reason not selected as complete workflow:** The current builder selects ancestry text only, relies on a share-derived output (including one special case), and the reviewed YAML has no explicit post-push remote-main readback.

### Older StateMachines full linear extractor copied as-is

**Advantage:** Recovers broad decoded conversation with a nonempty linear_conversation and rich metadata; inspection script demonstrates linear projection. **Reason not selected:** Executes untrusted page scripts and fallback expressions with Node vm, a prohibited risk.

### Two independent extraction runs

**Advantage:** Small integration effort from existing tools. **Reason not selected:** Repeated network fetch and decode, inconsistent source capture timing, larger work/attack surface and divergence caused by separate snapshots. Instead, use one source capture and two projections.

### Direct linear only

**Advantage:** Preserves source linear order with minimal graph traversal. **Reason not selected as sole data product:** A distinct visible selected-branch export remains valuable and already historically demonstrated; direct linear alone cannot silently be called UI-selected conversation chronology.

### Browser screenshot/OCR and interactive DOM scrape

**Advantage:** Visual context checking. **Reason not selected for core:** Requires browser runtime, is slow and may omit structured nontext metadata. May be used as separate semantic fidelity audit but not the authoritative extraction input.

### StateMachines-style request-file push trigger

**Advantage:** Existing proven workflow. **Reason not selected:** The target calls for workflow_dispatch with JSON input and a templated path rather than a committed JSON trigger file.

## 3. Risk register and treatments

| Risk ID | Threat or uncertainty | Severity | Mandatory mitigation / exit criterion |
| --- | --- | --- | --- |
| R-001 | ChatGPT serialized React Router format changes | High | Versioned decoder, fixture corpus, explicit parse failure, upstream-compatibility requalification |
| R-002 | New public shared page lacks linear_conversation | High | Complete profile fails; log source/decoder evidence; no ancestry substitution |
| R-003 | Mapping/current_node absent or broken | High | Fail branch reconstruction; no linear substitution |
| R-004 | Node vm script evaluation from older implementation | Critical | Static and dynamic tests prove no evaluation of downloaded code |
| R-005 | Fetch follows redirect to untrusted URL / SSRF | Critical | Exact HTTPS chatgpt.com/share UUID allowlist revalidated before every hop |
| R-006 | Untrusted path escapes into config or repository source | Critical | Allowlisted root, normalized relative path, safe segment checks, symlink protection |
| R-007 | Inline workflow YAML input used as shell source | Critical | JSON parsed from safe env transport, no eval, no unsanitized GITHUB_ENV multiline injection |
| R-008 | Raw source contains sensitive or non-UI material | High | Restricted repository/artifact access, retention approval, clear audience and scope warnings |
| R-009 | Loss of nontext parts/special indexed value types | High | Lossless JSON tagging or fail; fixture-backed special-type handling |
| R-010 | Duplicate IDs or parent cycles cause false chronology | High | Identity validation, visited-set cycle check, error/diagnostics |
| R-011 | Source-linear and selected ancestry diverge | Medium | Separate schema/method/ordering; explicit comparisons, never force one ordering onto the other |
| R-012 | GitHub Issue #3 token lacks workflow-dispatch permission | High | Verify actions-write permission or use authorized separate caller; do not label failed dispatch accepted |
| R-013 | Branch protections block bot push | High | Verify branch policy and contents permission; stop and request authorized publication route |
| R-014 | Concurrent exports overwrite data or lose commits | High | Run-specific paths, serialize publication and bounded conflict-safe retry |
| R-015 | Post-push remote files differ from generated bytes | High | Fetch remote main and compare all eight paths, with no verified conclusion on mismatch |
| R-016 | Self-referential receipt references its future commit SHA | High | Separate immutable data receipt from external post-commit final attestation |
| R-017 | Golden fixture gives false confidence about future formats | High | Synthetic variants, negative cases, live sample certification and human fidelity review |
| R-018 | Artifact expires before review | Medium | Explicit 30-day target plus Git persistence and owner-approved retention lifecycle |
| R-019 | Workflow change touches unauthorized path | High | Separate promotion approval; do not treat documentation authorization as production workflow mutation |
| R-020 | Comment descriptions become stale as repository source changes | Medium | Pin source blob hashes in SOURCES.md and re-inspect before implementation |
| R-021 | Parser bytes limit passed but huge decoded graph exhausts memory | High | Bound serialized table slots, object depth, process memory and job duration; negative fixtures |
| R-022 | Output correct locally but data completeness overclaimed | High | Schema-level coverage labels, independent comparison study and explicit unknown portions |

## 4. Open empirical/approval gates

The decisions above define the desired deliverable. They do not prove these conditions:

1. The owner approves committing **complete** raw source HTML/metadata/tool-role content in Terminals and the 30-day artifact retention, after reviewing actual repository visibility.
2. The local JSON-file transport, caller permissions and optional Issue #3 terminal adapter can dispatch the workflow on GitHub with a verifiable run ID.
3. The decoder can recover both a nonempty linear_conversation and a usable mapping/current_node from at least one current live public share; the source structure may evolve.
4. Synthetic negative/real fixture tests cover the supported serialized type tags without data loss or arbitrary code evaluation.
5. Publication to main is allowed by the branch/repository's policy with the workflow's least-privilege credential.
6. Concurrent exports and main readback pass under the real runner and Actions environment.
7. The specified tests are actually executed and their receipts independently verified.

Do not close these gates using historical StateMachines/IssueStack results. Those are relevant comparative evidence, not substitute Terminals test runs.

## 5. Design status and change-control rule

**Completed for this request:** all five Issue #4 comment bodies archived; comprehensive study written; final proposed SRS and interface/verification documents prepared; source files inspected with fixed blob identities; decisions and unresolved dependencies recorded.

**Not completed by this documentation request:** runtime code, fixture imports, enhanced workflow, GitHub permission changes, live extraction, integration test run, or remote Git publication for an extracted conversation.

Any later change that removes one of the two extraction representations, omits raw content, reduces output files, substitutes an alternate trigger, removes readback, or moves output beyond the authorized workspace is a scope change requiring explicit user authorization, a revised SRS and re-traced acceptance tests.
