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

## 9. Incorporating Issue #10 RuntimeConfig capabilities into Issue #3 (DESIGN)

**Status:** Proposed Issue #3 requirements only. The working Issue #10 implementation remains the source of behavior. At this revision, Issue #3 accepts only \`runOn="$"\` and \`runOn="gh"\`; it does **not** accept the Node mode below. No migration, decommissioning, listener edit or runner refactor is implied by adding this section.

### 9.1 Capability and proposed Issue #3 request

The Issue #3 terminal SHALL additionally support selecting a registered \`workspaces/RuntimeConfig/<subfolder>/runtrigger.json\` template, validating a caller-populated \`set\`, committing a run-specific trigger, executing its Node.js program with one named-arguments JSON object, and publishing a source-correlated execution receipt. The two available template-backed functions SHALL remain accessible: create/replace an Issue comment, and replace an Issue body.

The proposed unambiguous Issue #3 envelope is:

\`\`\`json
{
  "runOn": "node",
  "forWhom": "GPT6_0000000007-example-Terminals",
  "runpath": "issue-comment-writer",
  "set": {
    "jsPath": "workspaces/RuntimeConfig/issue-comment-writer/issue-comment-writer.js",
    "args": {
      "issuePath": "BestNameYet/Terminals/issues/4",
      "commentId": "new",
      "jsonArrayPath": "[{\"html\":\"<p>example</p>\"}]"
    }
  }
}
\`\`\`

The \`runOn="node"\` discriminator and this combined envelope are **design decisions proposed by this SRS**, not current supported Issue #3 syntax. For \`node\` mode, \`forWhom\`, \`runpath\`, and \`set\` SHALL be required and \`whatPrompt\` SHALL be forbidden. Existing \`$\` and \`gh\` envelopes and their semantics SHALL be preserved. No silent translation from an Issue #10-shaped body is permitted. A future implementation SHALL define and enforce mode-specific top-level schemas.

### 9.2 Requirements to incorporate (all DESIGN)

| ID | Requirement |
|---|---|
| I3-X-001 | Extend Issue #3 command selection with a distinct \`node\` mode and preserve existing \`$\`/\`gh\` inputs and behavior unchanged. |
| I3-X-002 | For Node mode, require exactly \`runOn\`, \`forWhom\`, \`runpath\`, \`set\`; reject unknown, missing, mixed-mode, ambiguous or malformed fields. |
| I3-X-003 | Run Node mode only for an owner-authored, newly created Issue #3 comment; do not execute a Node command on an edit or on a PR comment. Preserve the existing create/edit behavior for shell/gh modes. |
| I3-X-004 | Check owner type \`User\` and matching author ID/login before the Node execution job checks out the repository; repeat the owner verification after checkout. Avoid execution through unauthenticated or unregistered alternative paths. |
| I3-X-005 | Resolve \`runpath\` as an existing *proper subfolder* under \`workspaces/RuntimeConfig/\`; accept a relative subfolder or repository-prefixed path; reject absolute, \`..\` traversal, nonexistent folders, symlink escapes and any template not a regular \`runtrigger.json\` in the selected folder. |
| I3-X-006 | Read the selected template and require a nonempty \`set\` with exactly every key other than \`metadata\`, recursively matching object keys, array lengths and leaf types; reject extra or missing keys, empty collections, nulls and blank strings. A template null leaf may accept a populated scalar as in the Issue #10 implementation. |
| I3-X-007 | Retain template \`metadata\` unchanged; do not permit callers to set it. Populate other template fields, preserve the original template, and create the clone exclusively with a unique name correlated to its Issue #3 source comment and creation time. |
| I3-X-008 | Use the actual RuntimeConfig runner keys \`jsPath\` and \`args\` (not the obsolete prose spelling \`js_path\`); validate \`jsPath\` resolves to a file and \`args\` is a JSON object. |
| I3-X-009 | Run \`node workspaces/RuntimeConfig/runner.js <clone-path>\`; execute the selected script as \`node <jsPath> JSON.stringify(args)\`; propagate child nonzero status, errors and signals. Do not imply stricter script-path isolation than the implementation actually enforces. |
| I3-X-010 | Before invoking the selected program, commit and push the clone to the default branch and verify remote bytes; if publication or readback fails, do not execute the program. Record the published trigger commit. |
| I3-X-011 | Preserve the source Issue #3 number, source comment ID, \`forWhom\`, mode, source event, trigger path, published commit, Actions run ID/attempt and program exit status in a machine-readable, correlated execution receipt. |
| I3-X-012 | Capture program stdout/stderr or combined execution log; include log SHA-256, outcome and program exit code in the receipt; upload the trigger, log and receipt as run-correlated Actions artifacts, including when the program fails. Do not assert an artifact exists when failure occurred before its creation. |
| I3-X-013 | Distinguish validation rejection, trigger persistence failure, execution failure, receipt/artifact failure and user-task outcome; command dispatch, workflow success and receipt creation alone SHALL NOT certify the user-requested target state. |
| I3-X-014 | Define an explicit bounded total job timeout and serialization/concurrency key for state-mutating Node commands; never claim FIFO behavior across all Issue #3 modes without implementing it. |
| I3-X-015 | Supply the selected program with documented credentials (\`GH_TOKEN\` and optional \`WORKSPACE_API\` where configured), subject to actual repository permissions; avoid disclosing secrets in saved logs, source comments or receipts. |
| I3-X-016 | Keep the existing Issue #10 listener operational until a separately approved migration/deprecation; source-issue-specific clone names and receipts must never mislabel Issue #3 commands as Issue #10 commands. |
| I3-X-017 | For \`issue-comment-writer\`, accept \`args={issuePath,commentId,jsonArrayPath}\`; \`issuePath\` is \`owner/repo/issues/N\` or GitHub Issue URL; \`commentId="new"\` creates, while a positive decimal ID replaces the *entire body* of a verified comment belonging to that issue. |
| I3-X-018 | For \`issue-body-writer\`, accept \`args={issuePath,jsonArrayPath}\` and replace the *entire* target Issue body by PATCH; require the GitHub response body to match the submitted body. |
| I3-X-019 | For both writer functions, interpret \`jsonArrayPath\` as either a repository-readable path to a JSON array or a literal serialized JSON array; require a nonempty array of nonempty objects with string values, concatenate values in their iteration order using two newline separators, and reject invalid or empty rendered output. |
| I3-X-020 | Expose writer response identity (URL and comment ID or Issue number) and independently retrieve the target after mutation to verify complete expected content; appending requires first retrieving the existing body and deliberately including it in the replacement. |
| I3-X-021 | Preserve per-mode error and completion semantics: Bash stdout persistence must not be conflated with Node trigger/receipt persistence; use correlation fields to identify which artifacts establish which result. |
| I3-X-022 | Define an explicit idempotency/retry rule for state-mutating Issue writers so replays, duplicate events or failed post-write verification cannot silently create extra comments or overwrite an unintended body. |

### 9.3 Verification matrix for incorporated functions

| ID | Test | Expected evidence |
|---|---|---|
| I3-XT-001 | Valid new owner Issue #3 Node command for each available RuntimeConfig template | Correct route, clone, commit/readback, Node invocation, receipt and verified side effect |
| I3-XT-002 | Shell/gh regression suite after adding Node mode | Existing create/edit behavior, command schema, stdout format and exit semantics unchanged |
| I3-XT-003 | Edit of existing Node-mode comment; non-owner event; PR event | No Node program execution; owner gate enforced before Node checkout |
| I3-XT-004 | Missing/extra \`set\` keys, wrong nested types or array lengths, blank/null values, caller-supplied metadata | Rejected before clone publication or execution |
| I3-XT-005 | Traversal/absolute/symlinked/missing folder, missing template or invalid \`jsPath\` | Safe rejection; program not executed |
| I3-XT-006 | Push conflict, failed commit or remote byte mismatch | Program not invoked; failure recorded, no false persistence claim |
| I3-XT-007 | Program returns nonzero, throws or is terminated; no stdout | Status and log/receipt faithfully distinguish outcomes |
| I3-XT-008 | Create a new Issue comment via writer | Exactly one new comment; ID and body independently verified |
| I3-XT-009 | Update an existing comment via writer; mismatched Issue/comment pair | Full replacement of correct target, or rejection before mutation |
| I3-XT-010 | Replace Issue body via writer | Exact expected body after independent readback; prior body not silently appended |
| I3-XT-011 | Literal and file-based array with multiple string-valued object entries | Deterministic concatenation, order and double-newline separators |
| I3-XT-012 | Duplicate event/retry after a writer mutation | Defined no-duplicate/no-unintended-overwrite behavior and correlated status |
| I3-XT-013 | Two concurrent Node commands and interaction with shell/gh mode | Documented per-mode ordering, isolation, artifact correlation and no unsupported FIFO claim |
| I3-XT-014 | Run under Issue #3 while Issue #10 remains active | Source-issue-specific paths/receipts; no accidental Issue #10 invocation or regression |
| I3-XT-015 | Program succeeds but requested task's final state is incorrect | Receipt reports program execution result while task remains unverified/failed |

### 9.4 Migration boundaries and open decisions

The source Issue #10 system currently uses \`issue_comment(created)\`, an owner-gated dedicated job, per-Issue serialization, a \`runtrigger_<commentId>_issue10_<timestamp>.json\` clone, commit-before-execute, the \`jsPath\`/\`args\` runner, a \`terminals.runtimeconfig.execution-receipt.v1\` receipt and a 30-day Actions artifact. Those are evidence for the required capabilities, not proof of their presence in Issue #3.

Pending design decisions include: whether Node-mode invocation should use the proposed \`runOn="node"\` envelope or a differently named discriminator; whether Node comment edits must be ignored at the routing layer or rejected downstream; whether per-mode serialization should be global or scoped to the target Issue; whether receipt durability must exceed the artifact retention period; and whether replays may be safely deduplicated using source comment ID and run attempt. All choices must be resolved before marking the SRS accepted.
