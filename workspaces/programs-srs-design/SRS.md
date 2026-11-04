# Programs — Software Requirements Specification (SRS)

**Document ID:** PROG-SRS-001
**Version:** 0.1.0 — design draft
**Status:** Proposed requirements, NOT implemented or accepted
**Repository:** BestNameYet/Terminals
**Evidence baseline:** main@d6355c64d738039ccf8872e22a4d08b7bf46e10e (2026-11-03)
**System name:** Programs
**Legacy name and implementation:** RuntimeConfig

## 1. Purpose

Programs is a GitHub-hosted, program-independent Node.js execution subsystem. It accepts an authorized workflow-dispatch request naming one installed program and supplying its complete, program-specific arguments; validates that request against the selected program's template; persists an immutable, populated execution trigger and verifies its publication **before** starting the program; executes the selected JavaScript file with a single serialized named-arguments object; and emits correlated execution records, logs, receipts and verifiable outcomes.

No GitHub Issue number is a prerequisite to accessing Programs. An authorized upstream Issue interface may dispatch Programs, but its Issue-specific routing and validation remain outside the Programs kernel.

## 2. Scope and boundaries

**In scope:** program discovery by directory; canonical input envelope; exact template-driven admission; security/authorization; workspace path validation; provenance; pre-execution trigger creation, commit and readback; Node invocation and exit propagation; execution receipts and artifacts; durable result references; concurrency and replay behavior; success/failure classification; extensible program library including the Issue comment and Issue body writers; regression/acceptance testing; migration from RuntimeConfig.

**Out of scope for the kernel:** interpreting the purpose of an arbitrary program, assuming programs have common argument names, inferring successful completion from process exit alone, modifying the source Issue body, parsing arbitrary Markdown instructions, automatic enrollment into an Issue listener, or preserving the deleted Issue #10 workflow. These may be responsibilities of individual programs or separate adapters.

**Authority:** A GitHub Actions workflow run is not itself evidence of success of a state-changing user request. All claims must be tied to an identified source, execution, and independently checked result.

## 3. Vocabulary

- **Program:** A registered folder containing a canonical 'runtrigger.json' template and an executable JavaScript entry point named by the template's 'jsPath'.
- **Template:** A versioned source-controlled JSON object declaring program entry point, argument structure and retained 'metadata'.
- **Request:** One 'workflow_dispatch' invocation with serialized 'runpath' and 'set' values, and optional correlation metadata.
- **Execution trigger:** A unique, immutable copy of the selected template populated with an exactly validated 'set'.
- **Execution receipt:** Machine-readable evidence of what ran, with provenance, timestamps, commit, status, outputs and errors.
- **Task completion:** Verified requested final state, distinct from dispatch, persistence, program exit and artifact upload.
- **Legacy implementation:** Files under 'workspaces/RuntimeConfig/'. They remain evidence and reusable implementation candidates, not an automatically migrated or deployed Programs system.

## 4. Required architectural separation

    Authorized caller / optional Issue adapter
                      |
            workflow_dispatch
                      |
           Request admission / owner gate
                      |
         Program lookup + template validator
                      |
    Create immutable trigger -> commit -> read back
                      |
             Generic Node runner
                      |
          Program-specific side effects
                      |
       Execution receipt / logs / readbacks

The future canonical program root is proposed as 'workspaces/programs/'. The current 'workspaces/RuntimeConfig/' root remains in service until a separately authorized migration. This document does not rename, move or delete existing programs.

## 5. Functional requirements

### 5.1 Workflow dispatch and identity

| ID | Requirement |
|---|---|
| PROG-DSP-001 | Programs SHALL have an explicit GitHub Actions 'workflow_dispatch' entry point; the Programs workflow SHALL NOT have an 'issue_comment' or push trigger. |
| PROG-DSP-002 | A dispatch SHALL select exactly one program and one request. It SHALL NOT enumerate matching files and run several programs without an explicit multi-run contract. |
| PROG-DSP-003 | The canonical required dispatch input SHALL be 'request_json', a serialized JSON object with exactly 'runpath' and 'set'. The optional 'request_id' SHALL be a separate dispatch input, not an extra program-template field. |
| PROG-DSP-004 | The request SHALL be validated using the actual caller identity available from GitHub Actions or a trusted upstream adapter; untrusted fields within 'request_json' SHALL NOT grant authorization. |
| PROG-DSP-005 | A direct dispatch SHALL be permitted only for explicitly authorized callers. Dispatches on behalf of an Issue comment SHALL preserve independently verified source metadata but SHALL NOT require any particular Issue number. |
| PROG-DSP-006 | The subsystem SHALL record GitHub repository, ref/commit, workflow run ID, run attempt, actor, request ID and any verified upstream source reference needed to reconstruct the invocation. |
| PROG-DSP-007 | Malformed, unauthorized, ambiguous, oversized or unsupported input SHALL fail before file mutation or program execution. |
| PROG-DSP-008 | The workflow's runtime permissions SHALL be explicitly declared and limited to those necessary for trigger publication, artifact upload and authorized program operations. |

### 5.2 Program registry and template

| ID | Requirement |
|---|---|
| PROG-CAT-001 | Each selectable program SHALL occupy an existing proper subfolder of the canonical program root and have a regular 'runtrigger.json' file; that file SHALL be its authoritative configuration template. |
| PROG-CAT-002 | 'runpath' SHALL identify exactly one subfolder, using either a root-relative subfolder name or the canonical repository-prefixed path. |
| PROG-CAT-003 | 'runpath' SHALL reject absolute paths, parent traversal, newline/NUL injection, directory escapes, symlink escapes, root-only values, nonexistent folders and nonregular template files. |
| PROG-CAT-004 | A valid template SHALL be a JSON object with 'jsPath' as a nonblank string, 'args' as a JSON object, and optional program-owned 'metadata'. |
| PROG-CAT-005 | Program-specific 'args' keys SHALL be defined by each program, not the generic kernel. The template SHALL supply its expected nested keys and types. |
| PROG-CAT-006 | Template 'metadata' SHALL remain unmodified by request 'set', and no request SHALL set or override template metadata. |
| PROG-CAT-007 | A program template revision and executable code revision SHALL be identified in the execution receipt, so later template edits do not change an already submitted execution's meaning. |
| PROG-CAT-008 | The canonical runner key SHALL be camelCase 'jsPath'. The 'js_path' spelling in historical Issue #10 prose is not the runner's actual contract. |

### 5.3 Exact request validation

| ID | Requirement |
|---|---|
| PROG-VAL-001 | 'request_json' SHALL parse to a nonarray JSON object whose top-level keys are exactly 'runpath' and 'set'. |
| PROG-VAL-002 | 'set' SHALL be a nonempty JSON object containing exactly all non-'metadata' template keys; missing, extra or duplicated/ambiguous keys SHALL be rejected. |
| PROG-VAL-003 | Nested objects SHALL match template object-key sets exactly, recursively; arrays SHALL have the same nonzero lengths and element shapes. |
| PROG-VAL-004 | Supplied leaf values SHALL match template scalar types. A template null leaf may accept a populated scalar only if the adopted template schema explicitly permits this legacy compatibility. |
| PROG-VAL-005 | Null, undefined, empty or whitespace-only strings, empty objects and empty arrays SHALL be rejected at every level of supplied 'set'. |
| PROG-VAL-006 | The complete validated 'set' SHALL populate a clone, leaving the original template byte-for-byte unchanged. |
| PROG-VAL-007 | The validator SHALL reject conflicting paths, absent program entry points and program entry points that are not regular files, before executing. |
| PROG-VAL-008 | Failures SHALL identify the rejected field/path and validation category without revealing secrets or executing any program. |
| PROG-VAL-009 | A legacy 'runPath' spelling may be supported only through an explicitly versioned compatibility boundary; it SHALL not silently change the canonical 'runpath' contract. |

### 5.4 Immutable trigger and pre-execution persistence

| ID | Requirement |
|---|---|
| PROG-PER-001 | One validated request SHALL generate exactly one uniquely named execution trigger under the selected program's directory, separate from its template. |
| PROG-PER-002 | Trigger identity SHALL be derived from a durable run identifier and attempt or equivalent collision-resistant, source-independent identity; it SHALL NOT contain a mandatory '_issue10_' segment or fixed Issue number. |
| PROG-PER-003 | The trigger SHALL encode the exact validated template values and preserved 'metadata'; generated provenance SHALL be recorded separately or in an explicitly defined runtime-owned namespace. |
| PROG-PER-004 | The trigger SHALL be created using no-overwrite semantics, and its bytes and SHA-256 SHALL be recorded for verification. |
| PROG-PER-005 | Before program execution, the trigger SHALL be committed to the intended repository/ref, pushed, retrieved independently from the remote and checked byte-for-byte or by a verified digest. |
| PROG-PER-006 | Any failure in commit, push, conflict resolution or remote readback SHALL prevent the program from starting; local file existence SHALL NOT be treated as publication. |
| PROG-PER-007 | Concurrent runs SHALL not overwrite a template or another run's trigger; push retry SHALL preserve each run's identity and exact bytes. |
| PROG-PER-008 | The published commit SHA, destination path, digest and verification result SHALL be captured in execution records. |

### 5.5 Node.js execution

| ID | Requirement |
|---|---|
| PROG-EXE-001 | The generic runner SHALL load the specific persisted trigger selected for this run, not a different template or the newest matching file. |
| PROG-EXE-002 | The runner SHALL resolve 'jsPath' to a repository file allowed by an explicit code-execution policy; no claim of enforced path isolation is permitted unless implemented and tested. |
| PROG-EXE-003 | The runner SHALL launch Node.js with the selected file and exactly one CLI argument containing 'JSON.stringify(args)'. It SHALL NOT impose common program-specific argument names. |
| PROG-EXE-004 | The caller SHALL provide documented credentials and runtime environment appropriate for the selected program, without placing credential values into source-controlled triggers or published receipts. |
| PROG-EXE-005 | The runner SHALL propagate child process exit code and termination signal/error; successful stdout persistence SHALL not mask an unsuccessful child process. |
| PROG-EXE-006 | The workflow SHALL enforce a bounded execution timeout, resource constraints and a defined cancellation outcome. |
| PROG-EXE-007 | Logs SHALL capture stdout and stderr with run correlation and a cryptographic digest; logs SHALL be filtered for explicitly identified secrets. |
| PROG-EXE-008 | The kernel SHALL support any program implementing the contract, independently of GitHub Issue writers. |

### 5.6 Outcomes, receipts and verification

| ID | Requirement |
|---|---|
| PROG-REC-001 | Every admitted request SHALL have a durable source/run identifier and a recoverable status. Where execution is not admitted, its rejection SHALL still be observable from workflow logs. |
| PROG-REC-002 | A machine-readable receipt SHALL record request and program identity, template/source revision, trigger path/commit/digest, program exit/signal, log digest, outcome, and timestamps. |
| PROG-REC-003 | Outcomes SHALL distinguish: rejected, trigger-persistence-failed, persisted, running, program-failed, program-succeeded, result-publication-failed, target-unverified and target-verified. |
| PROG-REC-004 | The workflow SHALL publish the trigger, execution log and receipt as identified Actions artifacts where available, including for a program failure; artifact retention duration SHALL be documented. |
| PROG-REC-005 | A durable final result reference SHALL survive short-lived Actions artifact retention when long-term recovery is required by the accepted retention contract. |
| PROG-REC-006 | The receipt SHALL never claim target-state verification without a recorded program-specific or independent readback of the requested result. |
| PROG-REC-007 | Results SHALL be correlated to the exact dispatch and code/template revision; a submitted request and an Actions success conclusion alone SHALL not imply task completion. |
| PROG-REC-008 | If an external mutation may have succeeded but confirmation failed, the status SHALL explicitly report that uncertainty; the kernel SHALL not blindly replay side effects. |

### 5.7 Replay, ordering and isolation

| ID | Requirement |
|---|---|
| PROG-CON-001 | Each invocation SHALL be identifiable across retries and attempts; duplicate delivery and manually repeated dispatches SHALL be distinguishable. |
| PROG-CON-002 | No FIFO guarantee SHALL be claimed absent a tested serialization policy; the chosen concurrency key and cancellation behavior SHALL be documented. |
| PROG-CON-003 | The execution kernel SHALL preserve each selected program's workspace boundary and SHALL NOT migrate, delete or mutate another program's files implicitly. |
| PROG-CON-004 | For state-mutating programs, replay eligibility SHALL depend on a durable result or idempotency mechanism; generic exactly-once external side effects SHALL NOT be promised. |
| PROG-CON-005 | The system SHALL distinguish repeatable validation/persistence operations from potentially nonrepeatable external program side effects. |

### 5.8 Two existing programs

| ID | Requirement |
|---|---|
| PROG-WRT-001 | The Issue comment writer SHALL remain a normal Programs program with named args 'issuePath', 'commentId' and 'jsonArrayPath'. |
| PROG-WRT-002 | 'commentId' equal to 'new' SHALL create one new Issue comment; a positive decimal comment ID SHALL replace the full body of a comment verified to belong to the selected Issue. |
| PROG-WRT-003 | The Issue body writer SHALL remain a normal Programs program with named args 'issuePath' and 'jsonArrayPath', and replace the full Issue body. |
| PROG-WRT-004 | Each writer SHALL accept 'jsonArrayPath' as either a repository-readable JSON-array file path or a literal serialized JSON array, according to its existing parser contract. |
| PROG-WRT-005 | Writer input SHALL be a nonempty array of nonempty key/value objects with string values, rendered in iteration order, separating successive values with two newline characters. |
| PROG-WRT-006 | Each writer SHALL reject invalid target paths, malformed arrays, empty output, and insufficient credentials without claiming a write. |
| PROG-WRT-007 | Each writer's post-write response SHALL identify the target and SHALL be followed by independent readback verifying the expected full body. |
| PROG-WRT-008 | The kernel SHALL NOT silently reinterpret full replacement as append/prepend, or create a new comment when an existing comment update fails. |

### 5.9 Migration and compatibility

| ID | Requirement |
|---|---|
| PROG-MIG-001 | Programs SHALL replace the name 'RuntimeConfig' at the public system-contract level while preserving existing program templates and entrypoint behavior unless an explicit, separately verified migration changes them. |
| PROG-MIG-002 | Deletion of the old Issue #10 workflow SHALL remain in force; this SRS does not recreate it or authorize a new implicit 'issue_comment' trigger. |
| PROG-MIG-003 | The canonical path transition from 'workspaces/RuntimeConfig/' to 'workspaces/programs/' SHALL have an explicit migration map, compatibility period or atomic cutover, not a silent path reinterpretation. |
| PROG-MIG-004 | Issue #3 command-terminal semantics SHALL remain independent; an optional adapter SHALL route a valid instruction to Programs through its dispatch interface without bypassing Programs validation. |
| PROG-MIG-005 | The original writer programs, their templates, and historical runtrigger records SHALL be retained unless separately authorized for relocation or deletion. |
| PROG-MIG-006 | Existing non-Issue-10 trigger filenames and receipts SHALL remain historical evidence; the new naming and receipt format SHALL be versioned rather than relabeling history. |

## 6. External interfaces

The proposed canonical workflow is '.github/workflows/programs.yml', invoked only by 'workflow_dispatch'. Its 'request_json' field transports one serialized JSON object with exactly 'runpath' and 'set'; its optional 'request_id' identifies an external caller. Refer to [INTERFACES.md](INTERFACES.md) for sample payloads, trigger format, receipt fields and errors.

No Issue-specific 'source_comment_id' is mandatory. Where an upstream adapter supplies one, it SHALL be a verified optional provenance field; a workflow-dispatch invocation does not inherently contain 'github.event.comment.id'.

## 7. Data and state model

Per-run lifecycle:

    RECEIVED -> AUTHORIZED -> VALIDATED -> TRIGGER_PUBLISHED
      -> RUNNING -> EXECUTION_SUCCEEDED | EXECUTION_FAILED
      -> OUTPUT_PUBLISHED -> TARGET_VERIFIED | TARGET_UNVERIFIED

Failure paths include REJECTED, TRIGGER_PUBLICATION_FAILED, PROGRAM_FAILED, OUTPUT_PUBLICATION_FAILED and CANCELLED. A side-effect-uncertain run is recorded separately from a safely retryable run.

Templates are mutable development artifacts. Published triggers and completed receipts are immutable execution evidence. A new workflow attempt cannot silently reinterpret or rewrite an earlier validated trigger.

## 8. Quality attributes and constraints

| ID | Requirement |
|---|---|
| PROG-NFR-001 | All admission and template decisions SHALL be deterministic for identical versioned input and source state. |
| PROG-NFR-002 | Program registration SHALL require no source-code changes to the generic runner for ordinary changes in program-specific argument names. |
| PROG-NFR-003 | Every persisted execution claim SHALL be traceable to a source revision, run identifier, and verifiable artifact or commit. |
| PROG-NFR-004 | The workflow SHALL fail closed for uncertain caller identity, invalid paths, incompatible schema versions, and unverifiable pre-execution persistence. |
| PROG-NFR-005 | Error messages SHALL preserve diagnosability while avoiding raw secret values; published triggers must not contain secrets. |
| PROG-NFR-006 | Tests SHALL cover positive paths, every validation gate, every persistence boundary, child-process failures and replay/correlation behavior. |
| PROG-NFR-007 | The system SHALL document GitHub permissions, runner runtime version, timeout, artifact retention, execution concurrency and versioned request/receipt schemas. |

## 9. Acceptance and release gates

See [VERIFICATION-PLAN.md](VERIFICATION-PLAN.md). At minimum, release requires tested dispatch-only admission, owner authorization, program selection and rejection, nested exact template matching, stable trigger content and unique naming, commit-before-execute with remote verification, child exit/error handling, receipts and artifact recovery, deliberate side-effect replay handling, independent writer result readback, and regression of the existing writers and Issue #3 command interface.

**No requirement is accepted or implemented merely by creating this SRS.** There is currently no active Programs workflow; the Issue #10 runtime workflow was deleted at commit 'd6355c64d738039ccf8872e22a4d08b7bf46e10e'.

## 10. Open design decisions (not assumed resolved)

1. **Canonical directory:** Adopt 'workspaces/programs/' at cutover, or keep 'workspaces/RuntimeConfig/' as the physical location while renaming only the subsystem?
2. **Invocation syntax:** Is 'request_json' the only dispatch input, or should the workflow also offer independent 'runpath' and 'set_json' fields? Either choice must represent exactly one request without ambiguity.
3. **Authorization:** Should direct dispatch allow only the repository owner, or also named trusted services? How are delegated identities independently verified?
4. **Program code placement:** Must 'jsPath' remain inside its program folder, any permitted repository path, or an explicit allowlist? The legacy runner resolves a path without program-folder isolation.
5. **Durability:** Must completed receipts be committed indefinitely to the repository, or is GitHub Actions artifact retention plus an external durable store sufficient?
6. **Concurrency:** Is sequencing global, per program, per target resource, or intentionally unordered?
7. **Replay:** What program-supplied idempotency key and side-effect verification protocol will be mandatory for mutating operations?
8. **Template typing:** Preserve legacy behavior for null-typed template leaves, or require explicit schemas for nullable/typed values?
9. **Migration plan:** Will existing runtrigger history and working scripts be relocated, wrapped or kept as-is under their current paths?

These questions are recorded rather than silently answered by naming or implementation changes.

## 11. Traceability

Primary reference sources, discrepancies and status evidence appear in [SOURCES-AND-DECISIONS.md](SOURCES-AND-DECISIONS.md). Design requirements use 'SHALL'; current legacy behavior is only evidence, not a claim of implementation of Programs.
