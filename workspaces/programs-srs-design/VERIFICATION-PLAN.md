# Programs — Verification and acceptance plan

**Document:** PROG-VP-001
**Status:** Proposed tests. No Programs production workflow has been created or exercised.
**Specification:** [PROG-SRS-001](SRS.md)
**Interface specification:** [INTERFACES.md](INTERFACES.md)

## 1. Evidence classes

- **U — unit tests:** Pure admission, structure and path logic with deterministic fixtures; no network or external writes.
- **C — component tests:** Runner, trigger/receipt builder and program adapters in isolated local directories.
- **W — workflow tests:** Real workflow-dispatch request admission, authorization, logs and output artifacts.
- **I — integration tests:** Git remote publication/readback and live repository execution; test targets must be authorized and specifically isolated.
- **E — end-to-end tests:** Dispatch through verified program-specific postcondition, independent remote readback and signed/digested result evidence.

A test case counts as passed only when its expected acceptance observations are demonstrated, not because a workflow dispatch was accepted. Any rejected or unavailable test must be reported as not executed/failed, not silently omitted.

## 2. Requirement coverage matrix

| Test ID | Class | Scenario | Primary requirements | Expected acceptance evidence |
|---|---|---|---|---|
| PROG-T-001 | W | Inspect active Programs workflow triggers | DSP-001 | Exactly one 'workflow_dispatch' trigger; no comment/push/schedule trigger |
| PROG-T-002 | U/W | One valid dispatch for one program | DSP-002, DSP-003 | Exactly one selected template and program; no glob/multi-run behavior |
| PROG-T-003 | W | Direct authorized actor; unauthorized actor | DSP-004, DSP-005, DSP-008 | Authorized run admitted; unauthorized run rejected before mutation |
| PROG-T-004 | U | Invalid JSON, scalar, array, missing keys, additional keys | DSP-007, VAL-001 | Reject and perform no mutation or program execution |
| PROG-T-005 | U | Duplicate keys or ambiguous legacy field combinations | VAL-001, VAL-002, VAL-009 | Deterministic reject; no silent coercion |
| PROG-T-006 | U | Existing canonical root-relative folder and prefixed path | CAT-001, CAT-002 | Resolve exact same registered program |
| PROG-T-007 | U | Absolute, relative-parent and special-character traversal | CAT-003 | Reject all path escapes |
| PROG-T-008 | U | Symlink to external folder; nested/symlinked template | CAT-003 | Reject traversal after realpath resolution |
| PROG-T-009 | U | Missing folder/template; template is directory, symlink or invalid JSON | CAT-001, CAT-003, CAT-004 | Reject before publication |
| PROG-T-010 | U | Missing/extra nested object keys, wrong array length, nested arrays | VAL-002, VAL-003 | Exact recursive matching, no coercion |
| PROG-T-011 | U | Null, blank or whitespace values, empty arrays and objects at arbitrary depth | VAL-005 | Reject all unpopulated values |
| PROG-T-012 | U | Scalar type mismatch; allowed/disallowed null template leaf | VAL-004 | Enforce final, explicitly versioned typing policy |
| PROG-T-013 | U/C | Supply 'metadata' in 'set'; preserve metadata from template | CAT-006, VAL-002, VAL-006 | Caller metadata rejected, template unchanged |
| PROG-T-014 | C | Correct program code selected with 'jsPath', 'args' | CAT-004, CAT-005, CAT-008, EXE-001, EXE-003 | One Node child, one serialized args object; correct field names |
| PROG-T-015 | C | Missing or nonfile 'jsPath', outside approved policy | VAL-007, EXE-002 | Reject before starting child |
| PROG-T-016 | C | Two simultaneous requests for same program | PER-001, PER-002, PER-007, CON-002 | Distinct trigger names and bytes; no overwrite |
| PROG-T-017 | C | Original template compared before/after trigger clone | VAL-006, PER-003, PER-004 | Byte-identical template; stable digest for clone |
| PROG-T-018 | I | Simulate or induce push failure before child process | PER-005, PER-006 | Child never starts; persisted failure observable |
| PROG-T-019 | I | Conflict then retry with another writer | PER-005, PER-007 | Both unique triggers remote-visible; no silent clobber |
| PROG-T-020 | I | Deliberate remote readback mismatch | PER-005, PER-006 | Block execution and label publication failure |
| PROG-T-021 | I | Read published commit/trigger bytes | PER-005, PER-008 | Match expected trigger digest and versioned commit |
| PROG-T-022 | C | Child succeeds, fails with explicit exit code, throws, signals | EXE-005, REC-003 | Exact return status/signal and appropriately classified outcome |
| PROG-T-023 | C | Child timeout, cancellation, oversized output | EXE-006, EXE-007 | Bounded and observable failure; log digest when produced |
| PROG-T-024 | W | Missing program credentials, secret accidentally echoed | EXE-004, EXE-007, NFR-005 | Explicit failure and no sensitive value published |
| PROG-T-025 | W/I | Receipt and artifacts after success and failure | REC-001–REC-005 | Correlated run IDs, status, digests and recoverable evidence |
| PROG-T-026 | W/I | Artifact upload fails after successful mutation | REC-003, REC-008 | No false task verification; uncertainty clearly recorded |
| PROG-T-027 | E | Program exits zero but external postcondition wrong | REC-006, REC-007 | program-succeeded distinct from target-unverified |
| PROG-T-028 | E | Program completes and external target verified | REC-006, REC-007 | target-verified with exact target-state evidence |
| PROG-T-029 | C/I | Duplicate dispatch, repeated attempt after unknown side effect | CON-001, CON-004, CON-005, REC-008 | No blind duplicate mutation; distinct attempts; reconciliation evidence |
| PROG-T-030 | I | Provenance from different authorized Issue numbers | DSP-005, DSP-006, MIG-002 | No hardcoded Issue acceptance restriction; source remains optional |
| PROG-T-031 | E | Issue comment writer creates new comment | WRT-001, WRT-002, WRT-007 | One new comment, exact full body, independently verified ID |
| PROG-T-032 | E | Writer replaces existing comment; mismatched Issue/comment pair | WRT-002, WRT-006–008 | Exact replacement or safe reject; no extra comment created |
| PROG-T-033 | E | Issue body writer replaces whole body | WRT-003, WRT-007–008 | Full expected body after independent GET |
| PROG-T-034 | U/C | Literal and path-based JSON arrays with multiple fields | WRT-004, WRT-005 | Exact deterministic ordered rendering and two-newline separators |
| PROG-T-035 | U/C | Invalid array, nonstring value, invalid Issue path | WRT-004–006 | Explicit rejection and no mutation |
| PROG-T-036 | W | Source-controlled historical RuntimeConfig files unchanged | MIG-001–MIG-006 | Exact old files preserved pending approved migration |
| PROG-T-037 | W | Issue #3 remains a distinct command interface | MIG-004 | No unintended change to shell/GitHub CLI parsing or execution |
| PROG-T-038 | W | No new Issue #10 workflow or issue-comment event auto-execution | DSP-001, MIG-002 | Only explicitly dispatched Programs job starts |
| PROG-T-039 | W/E | Review both selected and mutated target after completion | NFR-003, REC-002, WRT-007 | Evidence references stable revisions and verified target |
| PROG-T-040 | U/C | Schema / program revision modified between request and execute | CAT-007, EXE-001, NFR-001 | Run binds immutable expected source and trigger, or fails safely |
| PROG-T-041 | W | Durable receipt recovery after Actions artifact expiry simulation | REC-005 | Recover final status and provenance from stated durable medium |
| PROG-T-042 | C | Source paths and program folders remain isolated | CON-003, NFR-004 | No cross-program files mutated without selected program operation |

A range such as REC-001–REC-005 includes *every* referenced requirement, not just representative examples. Additional cases SHALL be added for any discovered untested decision branch.

## 3. Acceptance tiers

**Tier A — static/schema:** Confirm document contracts and all U tests pass. Does not establish executable workflow behavior.

**Tier B — runner:** Component tests pass with actual JavaScript program invocation and status propagation. Does not establish remote publication.

**Tier C — publication:** Authorized live 'workflow_dispatch' plus real Git commit and independent remote trigger readback. Does not establish external side effect success.

**Tier D — result integrity:** Receipts, log/artifact digests, source correlation and both successful and failing branches verified.

**Tier E — user-task acceptance:** At least one authorized test for each included writer verifies the actual Issue/comment target independently; replay and failure cases are exercised without destructive production side effects.

**Release criterion:** Every applicable Tier A–E requirement has passing evidence, or an explicitly approved and traceable exception; tests remaining merely planned must be reported.

## 4. Execution safeguards for acceptance

- Use isolated test Issues or disposable targets for mutating integrations. Never run writer acceptance against an unspecified existing production comment or Issue body.
- Do not put actual credentials or sensitive text in the publicly visible request or cloned triggers.
- Inject persistence failures in a controlled test environment rather than intentionally corrupting operational repositories.
- Separate safe unit test fixtures from live GitHub mutation and do not report one as evidence of the other.
- Record exact workflow run IDs, source refs, trigger paths, commit SHAs, output digests, observed target URLs and independent readback evidence.
- Explicitly compare the requested final state with the observed state before claiming completion.

## 5. Current baseline and known gaps

Existing RuntimeConfig provides 16 local Node regression tests (as last verified in the Issue #3 terminal run 41691550838 on 2026-11-03), which exercise several template validation cases and basic runner behavior. These are *legacy* results, not a Programs production certification. The deleted Issue #10 workflow is not an available live Programs entry point.

Known implementation gaps at draft creation: canonical Programs workflow absent; future path root not created; direct workflow-dispatch request and auth not implemented; runner currently uses legacy locations; generic persisted final receipts not in place; writer post-mutation independent GET not uniformly implemented; non-Issue-specific execution artifact naming and safe duplicate control are not established.

The documented 42 verification scenarios are a starting complete matrix against the stated SRS; full branch coverage must be recalculated from the actual finalized code and explicit design decisions. No scenario should be declared passed based only on this document.
