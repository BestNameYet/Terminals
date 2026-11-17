# Revised Terminals Procedure

Use Terminal MCP with `runOn: "@"`. Every new **original and revised** run now requires a validated scratchpad note before each state transition.

| Operation | `whatPrompt` |
| --- | --- |
| Start revised | `Procedure -r` |
| Start original | `Procedure` |
| Replay revised | `Procedure -r <nonce>` |
| Submit revised state | `Procedure -r <nonce> {"verbatim_request":"Design a report"}` |
| Read complete scratchpad | `Procedure -r <nonce> --scratchpad` |
| Append validated note | `Procedure -r <nonce> --scratchpad {"note":{...}}` |
| Explicit mandatory start (redundant) | `Procedure -r --scratchpad=mandatory` |

The nonce is returned when a run starts. Replay returns the current saved projection or completion receipt. The currently requested semantic keyword is authoritative: submit exactly one JSON object keyed by that keyword. Both profiles share the same structural note contract, and the original profile uses the same scratchpad commands without `-r`.

## Mandatory, validated, nonce-scoped scratchpad

**Every nonterminal state transition requires a current, valid, ready scratchpad note.** Missing notes cause `scratchpad.note_required`. A note from a previous revision or a different state does not authorize advancement. Accepting a state submission increments the revision; if simulation fails and the controller revisits `execution_procedure`, the revisit is a *new* revision and requires a new note. Invalid state submissions that are retried within the same revision do not consume or invalidate a valid current note.

There is **no optional mode for new runs**. `--scratchpad=mandatory` remains supported for explicitness; `--scratchpad=optional` is rejected. Existing *incomplete* nonce records created under historical optional mode are subject to the same mandatory gate when resumed. Existing *completed* records remain replayable/readable without retroactively modifying their history; scratchpads of completed procedures cannot be appended.

The controlling JSON Schema is `workspaces/2d-state-event-procedure-design/scratchpad-return-schema.json`. To append, submit an object with the single top-level key `note`; its value **must be an object**, not the old freeform string. These note fields are required:

| Field | Type | Meaning |
| --- | --- | --- |
| `category` | enum | `observation`, `analysis`, `decision`, `risk`, `verification`, `handoff`, or `correction` |
| `summary` | substantial string | State-specific observation/finding, with concrete referents (minimum 32 characters) |
| `evidence_status` | enum | `verified`, `unverified`, or `not_applicable` |
| `evidence` | array of typed objects | Each item has `kind`, traceable `reference`, and the specific `finding`; verified status requires at least one entry |
| `assessment` | substantial string | Why this observation matters to the state and required outcome (minimum 32 characters) |
| `next_action` | substantial string | Exact next test, state operation, artifact change, or handoff (minimum 24 characters) |
| `readiness` | enum | `ready` or `blocked`; the latter **cannot** advance the procedure |
| `unresolved` | array | Open questions or blockers; at least one required when `readiness=blocked` |
| `limitation` | conditional string | Required when `evidence_status=unverified`, explaining what is missing and how to establish it |

The evidence item `kind` must be one of `user_request`, `tool_result`, `repository`, `document`, `measurement`, `calculation`, or `other`. Evidence references should identify paths, IDs, experiment stations, tool receipts, or exact user turns. The field constraints include nonwhitespace and minimum lengths, array count bounds, recognized enums, and `additionalProperties: false`. These are **structural checks**; schema validation cannot establish factual correctness or force an agent to tell the truth. A note claiming verification should still be audited against the actual source.

### Valid example

```text
Procedure -r <nonce> --scratchpad {"note":{"category":"verification","summary":"Confirmed the current configuration and source references against the exact input and procedure projection.","evidence_status":"verified","evidence":[{"kind":"tool_result","reference":"terminal:source-inspection-42","finding":"The inspected source file contains the expected header and seven distinct active records."}],"assessment":"The required inputs are now supported by a concrete readback, so this projection can advance without an unresolved dependency.","next_action":"Submit the requested current-state object, then check that the saved projection revision increases.","readiness":"ready","unresolved":[]}}
```

For an initial state without external evidence, use `evidence_status:"not_applicable"` with `evidence:[]`, a meaningful explanation in the summary and assessment, and an actionable next step. For an unverifiable proposition, use `evidence_status:"unverified"`, a meaningful `limitation`, and do not label it as a measurement or confirmed fact.

### Blocked example

```json
{
  "note": {
    "category": "risk",
    "summary": "The required original source is unavailable, preventing verification of the claimed parameter values.",
    "evidence_status": "unverified",
    "evidence": [],
    "assessment": "The missing source prevents a reliable conclusion and must not be treated as a completed evidence check.",
    "next_action": "Retrieve the original source or document its access limitations before permitting state advancement.",
    "readiness": "blocked",
    "unresolved": ["Original data page and instrument uncertainty remain unavailable."],
    "limitation": "The indexed abstract does not expose the measurement stations or uncertainty fields needed for a source-level verification."
  }
}
```

The above payload can be **appended** as a documented blocker, but `scratchpad.note_blocked` prevents advancement until a later valid note with `readiness:"ready"` is appended for the same active keyword and revision.

## Validation and persistence

Validation occurs twice: (1) at append, against the JSON Schema; and (2) immediately before an otherwise-accepted state transition, against the latest persisted note, keyword, revision, schema and readiness. Append rejects malformed input without persisting a note. Transition revalidation rejects stale records and improperly modified disk state. Rejected transitions include machine-readable diagnostics (`scratchpad.note_required`, `scratchpad.note_state_mismatch`, `scratchpad.note_invalid`, `scratchpad.note_blocked`).

The server, not the agent, supplies `sequence`, `timestamp`, current state `keyword`, projection `revision` and stored `note`. All notes live in the nonce-scoped procedure record and are available through `--scratchpad`, including after completion. A note is **not** the state's structured output: the next state input must still match the `final_schema` displayed in its projection. Historical freeform notes are readable, but cannot satisfy a new transition's structured-note requirement.

## Revised procedure state machine

The first observation pass is read-only. New runs use the shared [experimental inquiry cascade](../2d-state-event-procedure-design/inquiry-cascade.md): initial agent questions and answers, fixed and nominated perspectives, two derivative rounds, and a synthesis carried into planning. The generic opener can surface useful knowledge already available to the agent. Historical records without `inputs.inquiry` retain their existing Q&A path, including the revised empty-question skip. Each execution-plan step identifies earlier prerequisites via `depends_on`; change-to-action associations are inferred from accepted agent actions. A failed preflight or requested revision returns to `execution_procedure` with discrepancy context and a new projection revision. The controller preserves the prior plan and simulation. Execution follows a passing simulation; the final post-execution diagnostic compares actual outcomes with acceptance conditions.

The revised procedure reuses the original validator and state-machine infrastructure. Changing code in the Git repository does not, by itself, prove that an already-running MCP server has reloaded the revised module; verify the live alias behavior separately.
