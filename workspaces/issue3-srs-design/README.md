# Issue #3 command terminal — SRS design workspace

Repository: BestNameYet/Terminals
Subject: GitHub Issue #3 command interface and its routing, execution, persistence and verification pipeline.
Status: Initial repository-derived design baseline; not an approved final SRS.
Baseline reviewed: main@93c00eedeb8b762b9bf224ea670782a63ec8e9b1 (2026-11-03).

## Artifacts
- [SRS.md](SRS.md): initial, testable software requirements and explicit current-behavior baseline.
- [SOURCES.md](SOURCES.md): primary source references, scope boundaries and evidence requirements.

## Scope
Specify the Issue #3 terminal as a complete subsystem: comment intake; generic listener routing; dispatch/event preservation; owner authorization; JSON command admission; shell/GitHub CLI execution; stdout storage and readback; exit and stderr semantics; correlation; ordering and concurrency; security boundaries; and task-level outcome verification.

A command submitted through Issue #3 may invoke other workflows, including the shared-conversation extractor. The Issue #3 SRS owns that command dispatch and its verification boundary, not the downstream extractor's internal requirements; see workspaces/extractor-srs-design/.

## Design process
1. Reconstruct each stage and its data transitions directly from current workflow and Issue #3 instructions.
2. Separate implemented behavior from aspirational guarantees and discovered defects.
3. Assign independently testable requirement IDs, inputs, outputs, failure expectations and evidence links.
4. Derive a verification matrix including authorization, malformed JSON, repeat edits, nonzero commands, failed persistence, output readback, concurrency and task-level success claims.
5. Reconcile discrepancies, then adopt a versioned SRS. Do not silently overwrite historical observations or conflate workflow success with completion of the user's instruction.

No production workflow, Issue body or command schema is changed by creation of this workspace.

## Issue #10 capability incorporation (proposed)

[SRS.md](SRS.md#9-incorporating-issue-10-runtimeconfig-capabilities-into-issue-3-design) now specifies the proposed addition of Issue #10's generic RuntimeConfig Node.js execution and the Issue-comment/body writer functions to the Issue #3 terminal. Requirements I3-X-001 through I3-X-022 and tests I3-XT-001 through I3-XT-015 cover mode selection, authorization, exact template validation, commit-before-execution, receipts, side effects, regression, concurrency and failure semantics. This is a design addition only: the working Issue #3 interface still accepts only Bash and GitHub CLI, and Issue #10 remains active.
