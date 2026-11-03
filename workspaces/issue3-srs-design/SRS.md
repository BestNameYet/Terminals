# Software Requirements Specification — Issue #3 Comment Terminal

**Status:** Working design baseline, not approved final specification.
**Source revision:** `93c00eedeb8b762b9bf224ea670782a63ec8e9b1`
**Subsystem:** Terminals repository Issue #3 (command intake and execution).
**Requirement labels:** `AS-IS` denotes implementation-observed behavior; `DESIGN` denotes a proposed or unresolved normative requirement. These classifications must not be conflated.

## 1. Purpose and system boundary

Issue #3 serves as an owner-authorized GitHub Issue comment terminal, accepting structured commands, routing their original comment event through GitHub Actions, executing Bash or GitHub CLI on a runner, and persisting stdout as JSON to Git with readback verification. Downstream workflows invoked by a command are separate subsystems. Success of command execution alone does not establish completion of a broader user instruction.

## 2. Actors, inputs, and outputs

**Actor:** Authorized repository owner posting or editing a comment on Issue #3.
**Intake:** `issue_comment` (`created` or `edited`) -> generic listener -> registered `workflow_dispatch` of Issue #3 workflow.
**Command object:** Entire comment body is JSON object with nonblank strings `runOn`, `whatPrompt`, `forWhom`; `runOn` in `["$","gh"]`; `forWhom` satisfies `^[A-Za-z0-9_-]{1,128}$`. Issue #3 documentation also prescribes a semantic nonce format not enforced by code.
**Output:** `workspaces/terminalruns/{forWhom}_{UTC timestamp}.json` with `inputThis` (original `runOn` and `whatPrompt`) and `outputThat` (stdout line array). Stderr, exit status, execution errors and the output commit appear in Actions logs.
**Execution context:** GitHub-hosted Ubuntu Actions runner, repository checkout as working directory, `GH_TOKEN` from `github.token`.

## 3. Functional requirements — implementation baseline

| ID | Requirement | Status | Verification basis |
|---|---|---|---|
| I3-F-001 | Route Issue #3 created and edited comment events using the Issue workflow registry. | AS-IS | Listener, registry |
| I3-F-002 | Reject a command when its comment body cannot be parsed as JSON. | AS-IS | Listener and terminal workflow |
| I3-F-003 | Dispatch original event payload and derived nonce to the registered workflow; reject event payload over 65,535 characters. | AS-IS | Generic listener |
| I3-F-004 | Reject routed events unless they concern Issue #3, are created/edited, and are not PR comments. | AS-IS | Terminal workflow |
| I3-F-005 | Require event author to match owner account by GitHub ID and login with owner account type User. | AS-IS | Terminal workflow |
| I3-F-006 | Require a JSON object with nonblank string `runOn`, `whatPrompt`, `forWhom`; restrict `runOn` to `$` or `gh`; validate nonce character set/length. | AS-IS | Terminal workflow |
| I3-F-007 | Run `runOn="$"` text as Bash; in `gh` mode prefix `gh ` unless trimmed command begins with `gh`; invoke `bash -o pipefail -c`. | AS-IS | Terminal workflow |
| I3-F-008 | Execute from `GITHUB_WORKSPACE` with a five-minute command timeout and 64 MiB stdout buffer. | AS-IS | Terminal workflow |
| I3-F-009 | Split stdout by CRLF/LF, remove one terminal blank line, and persist empty output as `[]`. | AS-IS | Terminal workflow |
| I3-F-010 | Commit an output JSON file at the nonce/timestamp path via GitHub Contents API, retrying HTTP 409 conflicts, then read back and byte-compare the file. | AS-IS | Terminal workflow |
| I3-F-011 | Record command exit status, stderr, error and output commit in Actions logs; set job failure for nonzero exit or execution error, even if stdout was persisted. | AS-IS | Terminal workflow |
| I3-F-012 | Treat edits as additional invocations; do not assume idempotence or ordering among distinct terminal runs. | AS-IS | Trigger and concurrency group |
| I3-F-013 | Do not equate dispatch acceptance or stdout persistence with fulfillment of an arbitrary user instruction. | DESIGN | AEC completion semantics; independent target-state verification needed |

## 4. Nonfunctional and security properties

| ID | Property | Status | Boundary |
|---|---|---|---|
| I3-N-001 | Workflow permissions are contents:write, issues:write, actions:write. | AS-IS | Workflow configuration |
| I3-N-002 | Commands execute with workflow token and full Bash capabilities; there is no general per-task filesystem sandbox beyond the hosted runner and its permissions. | AS-IS | Runner implementation |
| I3-N-003 | `persist-credentials:false` prevents automatic checkout credential persistence; `gh` operations may still use `GH_TOKEN`. | AS-IS | Checkout and environment |
| I3-N-004 | The workflow concurrency key includes `github.run_id`; it does not serialize separate requests by nonce or Issue. | AS-IS | Workflow configuration |
| I3-N-005 | Neither a task-level completion receipt nor a stable direct comment-to-output index is currently produced in the saved stdout JSON. | AS-IS | Output schema |
| I3-N-006 | Define explicit requirements for secret-safe logging, idempotency, retry policy, authorization boundaries and task outcome attestations before asserting these guarantees. | DESIGN | Not established by existing code |

## 5. External dependencies

GitHub Issues event delivery, GitHub Actions scheduling, workflow_dispatch API, runner-hosted Bash and `gh`, repository default-branch write access, GitHub Contents API, and availability of downstream commands/services. A successfully dispatched workflow can still fail later.

## 6. Initial verification matrix (to be implemented)

| ID | Scenario | Required observation |
|---|---|---|
| I3-T-001 | Owner posts valid `$` command | Routed command; correct stdout JSON; verified remote readback; successful Actions run |
| I3-T-002 | Owner posts valid `gh` command | Correct CLI normalization and output |
| I3-T-003 | Non-owner comment | Terminal command not executed |
| I3-T-004 | Malformed JSON, wrong field types, invalid nonce, invalid runOn | Rejected; no shell execution |
| I3-T-005 | Owner edits valid comment | New invocation, distinct output path and run identity |
| I3-T-006 | Command exits nonzero after writing stdout | Stdout retained, Actions run failed, stderr/status observable |
| I3-T-007 | Command times out or exceeds buffer | Failure observable without unsupported success claim |
| I3-T-008 | GitHub Contents write fails or readback differs | Workflow fails; no verified-persistence claim |
| I3-T-009 | Two independent submissions | No assumed FIFO; each result correctly correlated |
| I3-T-010 | Command dispatches downstream workflow | Dispatch and downstream completion evaluated separately |

## 7. Design questions requiring explicit decisions

1. Should the Issue #3 documented prime-based `forWhom` naming convention be validator-enforced, or remain a convention?
2. What durable source-comment/run/output correlation fields must be included in receipts?
3. Should Issue #3 serialize commands by Issue or nonce, or explicitly allow independent concurrency?
4. What safeguards, if any, should limit arbitrary Bash commands, sensitive stdout, secrets or cross-workspace mutations?
5. How are command-level success, persistence success and actual user-task completion represented without conflation?
6. What are the desired retry, duplicate event and edited-comment semantics?
7. Should downstream workflow dispatches have formal handoff and final-status correlation?

## 8. Acceptance status

This document is an **initial design draft** derived from current source code. No independent SRS acceptance matrix has been executed for this workspace. Historical Issue #3 command executions may serve as evidence only when their exact run IDs, files and receipts are independently rechecked. The requirements remain open to revision based on the user's intended operational contract.
