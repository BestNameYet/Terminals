# Programs — Interfaces, data shapes and state semantics

**Companion to:** [PROG-SRS-001](SRS.md)
**Status:** Proposed interface contract (not deployed).
**Version:** 0.1.0
**Names:** Programs = new subsystem; RuntimeConfig = existing legacy files.

## 1. Public workflow interface

Proposed workflow: '.github/workflows/programs.yml'.

**Trigger:** 'workflow_dispatch' only.

| Workflow input | Type | Required | Meaning |
|---|---|---|---|
| 'request_json' | string | Yes | JSON serialization of exactly one {runpath,set} request |
| 'request_id' | string | No | Caller-supplied correlation key; must not authorize execution |

No GitHub Issue number, comment ID, or synthetic 'issue_comment' payload is required for a direct Programs dispatch. GitHub provides 'github.run_id', 'github.run_attempt', 'github.repository', 'github.ref' and 'github.actor'. An upstream adapter may retain independently verified Issue metadata in a separate trusted provenance record. A request cannot authorize itself by asserting its own 'source'.

### Example request_json (future canonical program root)

~~~json
{
  "runpath": "issue-body-writer",
  "set": {
    "jsPath": "workspaces/programs/issue-body-writer/issue-body-writer.js",
    "args": {
      "issuePath": "BestNameYet/Terminals/issues/4",
      "jsonArrayPath": "[{\"html\":\"<p>Illustrative content</p>\"}]"
    }
  }
}
~~~

This is a **proposed post-migration** example, not a request executable against the current tree. The existing writer program is at 'workspaces/RuntimeConfig/issue-body-writer/issue-body-writer.js'. The 'set' object must match the actual selected template exactly; the above shape is correct only for a template with 'jsPath' and those exact 'args' keys.

A dispatch request has no generic 'whatPrompt' or shell expression. It invokes the registered program's file via the Programs runner.

### Admission validation

- Require a single JSON object, with exactly 'runpath' and 'set'.
- No additional top-level keys in the serialized request.
- 'runpath' points to one existing subfolder and a regular 'runtrigger.json'.
- The entire 'set' structure must match the selected template other than 'metadata'.
- Reject extra/missing keys, incompatible scalar types, empty values, malformed JSON, path escapes and missing program files.
- Validate trust and authorization separately from user-controlled request fields.
- Fail before program execution and before any durable clone on admission failure.

## 2. Program folder interface

Proposed layout (not yet implemented):

    workspaces/
      programs/
        issue-comment-writer/
          runtrigger.json
          issue-comment-writer.js
          runtrigger_<run_id>_<run_attempt>.json
        issue-body-writer/
          runtrigger.json
          issue-body-writer.js
          runtrigger_<run_id>_<run_attempt>.json

Each registered folder contains a template named 'runtrigger.json'. The runner may be shared outside those folders. Per-program entry points and argument names are not global contracts; a program may use any nested argument object that matches its template.

### Canonical trigger template (illustrative)

~~~json
{
  "metadata": {
    "version": "1.0.0",
    "purpose": "Replace a GitHub Issue body"
  },
  "jsPath": "workspaces/programs/issue-body-writer/issue-body-writer.js",
  "args": {
    "issuePath": "<GitHub Issue path>",
    "jsonArrayPath": "<JSON array path or serialized JSON array>"
  }
}
~~~

**Template ownership:** 'metadata' is retained without accepting corresponding request values. A generated clone is neither the template nor a writable shared configuration file. Runtime provenance and output state belong in a separate execution record unless a future schema explicitly allocates a runtime-owned namespace.

**Actual legacy spelling:** 'jsPath' (camelCase). Issue #10 narrative described 'js_path', which is incompatible with current 'runner.js'. Programs SHALL use the actual runner key and report discrepancies rather than guessing.

## 3. Internal runner interface

Canonical process invocation:

    node <Programs-runner> <published-trigger-file>

The runner validates a JSON object containing a usable 'jsPath' and an 'args' object, then invokes:

    node <resolved-jsPath> <JSON.stringify(args)>

There is **one serialized JSON argument** to the selected program. The kernel does not expand arbitrary keys into multiple positional arguments. The selected program parses, validates, and interprets its own named args.

Required execution observations: child exit status; termination signal and runtime errors; stdout/stderr; time bounds; source revision; exact trigger path and digest. Any targeted resource mutation must be verified by the responsible program or a separate verifier.

## 4. Published trigger instance

The trigger instance's filename SHALL derive from the workflow run and attempt or equivalent unique run identity, not from a mandatory Issue source.

Suggested filename:

    runtrigger_<run_id>_<run_attempt>.json

The source-controlled template stays at 'runtrigger.json'. The instance contains template 'metadata' plus all validated 'set' values. The *bytes of the trigger* must be committed and remotely read back before the runner starts. A commit SHA and digest identify the persisted instance.

A failed push or byte mismatch is a **pre-execution failure**. The runner must not execute based on locally present but remotely unverified content.

## 5. Receipt shape

Proposed versioned execution receipt (illustrative values):

~~~json
{
  "schema": "terminals.programs.execution-receipt.v1",
  "program": "issue-body-writer",
  "request_id": "illustrative-request-01",
  "run_id": 123456789,
  "run_attempt": 1,
  "source": {
    "kind": "workflow_dispatch",
    "repository": "BestNameYet/Terminals",
    "actor": "BestNameYet"
  },
  "revision": {
    "source_commit": "<40-character source SHA>",
    "template_sha256": "<SHA-256 hex digest>"
  },
  "trigger": {
    "path": "workspaces/programs/issue-body-writer/runtrigger_123456789_1.json",
    "commit": "<40-character publication SHA>",
    "sha256": "<SHA-256 hex digest>",
    "remote_readback_verified": true
  },
  "execution": {
    "started_at": "<ISO-8601>",
    "finished_at": "<ISO-8601>",
    "exit_code": 0,
    "signal": null,
    "log_sha256": "<SHA-256 hex digest>",
    "outcome": "program-succeeded"
  },
  "target_state": {
    "verification": "unverified",
    "evidence": null
  }
}
~~~

This receipt deliberately does not declare a verified user-task outcome merely because the child process exited successfully. The final accepted receipt schema must define mandatory/nullable fields for failures at each gate and recorded downstream side effects.

Optional trusted source metadata, if independently verified by an upstream adapter:

~~~json
{
  "kind": "issue_comment",
  "repository": "BestNameYet/Terminals",
  "issue": 3,
  "comment_id": 123456,
  "action": "created",
  "author": "BestNameYet"
}
~~~

This provenance is not an Issue-number admission gate. Other verified Issue numbers are equally representable, and direct dispatches omit Issue metadata.

## 6. Result distinctions

| Result state | Meaning | Safe to claim completion? |
|---|---|---|
| rejected | Caller/input not admitted | No |
| trigger-persistence-failed | Could not publish and verify trigger | No program execution allowed |
| persisted | Published trigger independently verified | No |
| running | Child process is executing | No |
| program-failed | Child exited nonzero or errored | No |
| program-succeeded | Child process exited successfully | Not sufficient |
| result-publication-failed | Execution observed but receipt/result could not be published | No |
| target-unverified | External side effect unknown or unverified | No |
| target-verified | Required external/postcondition independently confirmed | Yes, within checked scope |
| cancelled | Workflow/runner terminated before a confirmed outcome | No |

Program success, persistence success and task success are separate facts. Never assert exactly-once external side effects without a program-specific idempotency protocol.

## 7. Existing program contracts

### Issue comment writer

Current legacy file: 'workspaces/RuntimeConfig/issue-comment-writer/issue-comment-writer.js'.

Arguments:

~~~json
{
  "issuePath": "BestNameYet/Terminals/issues/4",
  "commentId": "new",
  "jsonArrayPath": "[{\"html\":\"<p>Example</p>\"}]"
}
~~~

The value 'new' creates a comment. A positive decimal comment ID replaces that exact comment's *entire* body after confirming its Issue ownership. It does not append or partially patch text. Existing implementation outputs an ID and URL, but independent post-write readback is a proposed strengthened requirement.

### Issue body writer

Current legacy file: 'workspaces/RuntimeConfig/issue-body-writer/issue-body-writer.js'.

Arguments:

~~~json
{
  "issuePath": "BestNameYet/Terminals/issues/4",
  "jsonArrayPath": "[{\"html\":\"<p>Example</p>\"}]"
}
~~~

It replaces the *entire* Issue body and compares the GitHub response body with the submitted text. The proposed system also independently fetches the Issue afterward.

Both writers accept a literal JSON array or a path to a JSON-array file and join string values in their iteration order with two newline characters. Both are example programs, not special modes in the Programs kernel.

## 8. Versioning and compatibility

The current legacy RuntimeConfig code and tests remain at their present paths. The Programs workflow, templates and receipts will be separately versioned. A migration must specify whether historical 'runPath' spelling is supported, which physical root is authoritative, and how old execution triggers remain readable. No implicit event-body synthesis is required by direct workflow dispatch.
