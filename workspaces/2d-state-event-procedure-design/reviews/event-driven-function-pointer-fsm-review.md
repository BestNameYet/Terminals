# Review for revision: event-driven @Procedure FSM with function-reference dispatch

- **Repository:** BestNameYet/Terminals
- **Review date:** 2026-11-16
- **Procedure nonce:** `c3ef5a5d-0c38-47e1-9fe2-49f5ea4cf010`
- **Scope:** Architecture review and change plan only; no runtime refactor executed.
- **Review basis:** Repository `main` source and four user-supplied PDFs: *Function pointer*, *State-transition table*, Geoffrey Hunter's *A Function Pointer Based State Machine*, and *Event Driven State Machines*.

## Finding

The existing architecture already uses JavaScript function references in `src/iterator.mjs`:

```js
const handlers = { verbatim_request: handler0, user_intent: handler1, /* ... */ };
const result = await handlers[state.keyword]({ error: null }, 0, read, agentInput, state.projection);
```

However, it is **state-keyword dispatched, not state/event dispatched**. A single `nonce(input)` path calls the active state validator; success moves to the stored `state.next`, rejection persists a diagnostic and stays put. `nonce` without input replays the stored projection; completion is terminal and persisted.

`projection-bindings.json` declares `process` module paths and one `next` per state. The controller hardcodes imports and uses the binding for the successor, not for a selectable state/event function.

This is a linear validated procedure with function-reference state handlers, not yet a general event-driven FSM.

## Authoritative current code

- [Alias dispatcher](https://github.com/BestNameYet/Terminals/blob/main/workspaces/codespace-terminal-mcp/alias-dispatcher.mjs): registers and invokes `Procedure`.
- [Procedure entrypoint](https://github.com/BestNameYet/Terminals/blob/main/workspaces/codespace-terminal-mcp/procedure.mjs): nonce creation, JSON persistence, replay, input submission.
- [Iterator](https://github.com/BestNameYet/Terminals/blob/main/workspaces/2d-state-event-procedure-design/src/iterator.mjs): current handler registry and acceptance transitions.
- [Projection bindings](https://github.com/BestNameYet/Terminals/blob/main/workspaces/2d-state-event-procedure-design/projection-bindings.json): per-keyword process and next metadata.
- [State/event contract](https://github.com/BestNameYet/Terminals/blob/main/workspaces/2d-state-event-procedure-design/state-event-contract.json): current event definitions and persisted record.
- [Rendering](https://github.com/BestNameYet/Terminals/blob/main/workspaces/2d-state-event-procedure-design/src/render_state.mjs): complete projections, additive diagnostics, completion receipts.

## Proposed FSM model

Use **(current state, event type) → function reference**. The function processes the event in the context of the saved nonce record and returns a typed transition decision. The central controller applies that decision, persists before output, and then renders.

| Current state | Event | Function reference | Decision and next state |
|---|---|---|---|
| Any nonterminal state | `E_REPLAY` | `replayProjection` | Stay; return saved projection without recalculation |
| `verbatim_request` | `E_RETURN` | `validateVerbatimRequest` | Accept → `user_intent`; reject → same state |
| `user_intent` | `E_RETURN` | `validateUserIntent` | Accept → `clarifying_questions`; reject → same state |
| Other nonterminal states | `E_RETURN` | Exact keyword-specific handler | Accept → declared successor; reject → same state |
| Final state | `E_RETURN` | `validatePostExecutionDiagnostic` | Accept → completed; reject → same state |
| Completed | `E_REPLAY` or legacy input | `replayCompletion` | Stay completed; return saved receipt |
| Any state | Unrecognized event | `rejectUnknownEvent` | Explicit unchanged-state error; do not silently advance |
| Eligible states (optional extension) | `E_CANCEL`, `E_TIMEOUT`, `E_RECOVER` | Explicit registered handlers | Transition policy must be specified before enabling |

An event table may initially have only `E_RETURN` as an advancement event, preserving the existing procedure's effective column-zero behavior. An event-driven design does **not** require inventing dozens of events; it requires selection and handling by event identity rather than a hardcoded universal advancement branch.

Example function registry (illustrative, not implemented):

```js
const stateEventHandlers = {
  verbatim_request: {
    E_RETURN: validateVerbatimRequest,
    E_REPLAY: replayProjection
  },
  user_intent: {
    E_RETURN: validateUserIntent,
    E_REPLAY: replayProjection
  }
  // ... every keyword, with explicit per-event behavior
};

async function dispatch(record, event) {
  const fn = stateEventHandlers[record.state.keyword]?.[event.type];
  if (!fn) return { kind: "reject_event", reason: "UNHANDLED_EVENT" };
  return fn({ record, event, read: key => record.inputs[key] });
}
```

The central controller should treat handler output as **data**, not allow a handler to call the renderer or directly mutate the persisted state:

```js
// Example result protocol
{ kind: "reject", diagnostic: { /* ... */ } }
{ kind: "stay" }
{ kind: "advance", acceptedKey: "user_intent", acceptedValue: {}, next: "clarifying_questions" }
{ kind: "complete", acceptedKey: "post_execution_diagnostic", acceptedValue: {} }
```

The controller is responsible for validating the decision against declared transitions, committing state atomically, invoking optional transition observers, and rendering the saved projection or completion receipt. Event handlers should execute without blocking on unrelated external work; long-running work should complete asynchronously and return a later event.

## Preservation requirements

1. Keep the `Procedure` alias's public no-argument start, `{nonce}` replay, and `{nonce,input:{current_keyword:value}}` interfaces. Normalize legacy input to `E_RETURN` internally.
2. Keep the nonce as the sole persistent run identity; preserve accepted inputs keyed by semantic keyword.
3. Validate against the **saved concrete `final_schema`**, including state-specific semantic checks, not a regenerated or reduced schema.
4. On rejection, retain the same nonce, keyword, instruction and concrete schema, adding only the diagnostic before persistence and rendering.
5. On acceptance, persist the new projection before returning; at terminal acceptance, persist the completion receipt and replay it without reprocessing input.
6. Keep renderers passive and prevent handlers from selecting arbitrary undeclared successors.
7. Choose and verify a per-nonce concurrency policy. Current temporary-file rename is atomic for a file replacement, but does not by itself serialize simultaneous read/modify/write transitions or prevent lost updates.

## Change map for a later authorized implementation

| ID | Target | Required change |
|---|---|---|
| CH1 | `state-event-contract.json` | Define event envelope, event catalog, decision types and transition semantics |
| CH2 | `projection-bindings.json` | Define state/event function references and legal successor policy |
| CH3 | `src/iterator.mjs` | Separate event normalization, pointer dispatch, decision application, save and render |
| CH4 | `src/*.mjs` handlers | Implement common event/decision signature without losing validators or schema derivation |
| CH5 | `procedure.mjs` | Preserve public API and add nonce-scoped serialization or optimistic version checks |
| CH6 | `src/render_state.mjs` | Preserve projection-only output semantics |
| CH7 | New `tests/event_fsm.test.mjs` | Add table-driven and regression tests |
| CH8 | `AGENTS.json` | Revise applicable obsolete routing clauses while preserving independent instructions |
| CH9 | This review | Document the proposal without modifying runtime code |

## Tests required before declaring the revision complete

- Each state/event pair calls the correct function; undefined pairs are explicitly rejected.
- Valid and invalid `E_RETURN` inputs behave correctly in **all 13 states**.
- Nonce replay returns the exact saved projection and does not change inputs or state.
- Derived return schemas and all semantic constraints remain enforced.
- Rejected input keeps the current state and adds only the required diagnostic.
- Completed procedure returns the same persisted receipt on replay and on a later input.
- Two simultaneous events for the same nonce cannot silently overwrite accepted data.
- Interrupted writes, invalid nonces, unknown events, malformed payloads and validator exceptions are deterministically handled.
- Previous MCP and procedure regression tests still pass.

## Open design decisions

1. Define behavior and priority for `E_CANCEL`, `E_TIMEOUT` and event-handler-generated events, if those events are adopted.
2. Select **per-nonce event serialization** or **optimistic version/CAS** and specify idempotency behavior.
3. Decide whether `onEnter` and `onExit` are needed immediately or can remain optional extensions.
4. Define if side effects are performed after successful persistence through an outbox/worker or only outside the FSM.

## Review outcome

Architecture and required changes were inspected and mapped through the live `@Procedure` review run. No implementation revision, test execution, or deployment is claimed. The proposed system remains a design pending explicit authorization for refactoring.
