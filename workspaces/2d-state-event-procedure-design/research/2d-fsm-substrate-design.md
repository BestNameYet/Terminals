# Concrete substrate — two-dimensional function-pointer finite-state machine for @Procedure

**Status:** Research-phase design specification, NOT deployed runtime code.
**Procedure nonce:** `f008d9a9-6cb0-4dd1-9b63-05cf92e7e5f5`
**Existing target:** `workspaces/2d-state-event-procedure-design/src/iterator.mjs`, `projection-bindings.json` and `workspaces/codespace-terminal-mcp/procedure.mjs`.

## 1. Formal type and execution model

Let `S` be the finite set of thirteen existing semantic states and a terminal `COMPLETE`; let `E = {E_RETURN,E_REPLAY}`. The substrate's defining structure is a **two-dimensional matrix** `M: S × E → Cell`. Every cell resolves a function reference. The matrix is **literal data containing callable functions**, not a state-index lookup followed by a second branch to choose an event action.

`Cell = { handle: Function, onAccept?: State | null }`. `onAccept` is defined for `E_RETURN` nonterminal cells. A handler is `handle(context, event) → Decision`. A Decision is exactly one of:
- `{kind:"ACCEPT",value:<accepted value>}` — controller stores value for the active semantic keyword; `cell.onAccept` determines successor; `null` completes.
- `{kind:"REJECT",diagnostic:<schema or semantic error>}` — controller retains the same state, saved instruction and schema and adds a diagnostic.
- `{kind:"REPLAY"}` — controller returns the unchanged saved projection; no validation and no write.
- `{kind:"REPLAY_COMPLETE"}` — controller returns the unchanged persisted completion receipt; no new write.

No handlers can return an arbitrary successor. All legal transitions are encoded in the table. Unknown event values are rejected at the boundary before matrix selection. Handler failures leave the previously saved record unchanged and propagate an error to the alias receipt. This preserves the current contract more closely than introducing speculative events or a hierarchical engine.

## 2. Complete matrix (13 state rows + terminal row; exactly two columns)

| Current state (row) | E_RETURN: function pointer | E_REPLAY: function pointer | Accepted E_RETURN next |
|---|---|---|---|
| `verbatim_request` | `validate_verbatim_request` | `replayStored` | `user_intent` |
| `user_intent` | `validate_user_intent` | `replayStored` | `clarifying_questions` |
| `clarifying_questions` | `validate_clarifying_questions` | `replayStored` | `question_answers` |
| `question_answers` | `validate_question_answers` | `replayStored` | `desired_state` |
| `desired_state` | `validate_desired_state` | `replayStored` | `current_state` |
| `current_state` | `validate_current_state` | `replayStored` | `required_changes` |
| `required_changes` | `validate_required_changes` | `replayStored` | `agent_actions` |
| `agent_actions` | `validate_agent_actions` | `replayStored` | `change_action_mapping` |
| `change_action_mapping` | `validate_change_action_mapping` | `replayStored` | `execution_procedure` |
| `execution_procedure` | `validate_execution_procedure` | `replayStored` | `simulation_results` |
| `simulation_results` | `validate_simulation_results` | `replayStored` | `execution_results` |
| `execution_results` | `validate_execution_results` | `replayStored` | `post_execution_diagnostic` |
| `post_execution_diagnostic` | `validate_post_execution_diagnostic` | `replayStored` | `COMPLETE` |
| `COMPLETE` | `replayCompletion` | `replayCompletion` | `COMPLETE` |

Every cell is defined. `E_RETURN` in `COMPLETE` deliberately returns the already-stored receipt, matching existing completed-nonce behavior. `E_REPLAY` in a nonterminal state returns the stored projection verbatim. Any `E_RETURN` schema failure stays in the same row without a state change.

## 3. JavaScript reference interface and matrix (design code)

The names of `validators` represent wrappers around the **current existing handler modules**. This is a specified reference shape, not a claim that the wrappers exist today.

```js
// Each validators.<keyword>(ctx, event) validates against the saved
// ctx.record.state.projection.final_schema and the original semantic rules.
// Returns {kind:"ACCEPT",value:event.input[keyword]} or {kind:"REJECT",diagnostic}.
const TABLE = Object.freeze({
  verbatim_request: { E_RETURN: { handle: validators.verbatim_request, onAccept: "user_intent" }, E_REPLAY: { handle: replayStored } },
  user_intent: { E_RETURN: { handle: validators.user_intent, onAccept: "clarifying_questions" }, E_REPLAY: { handle: replayStored } },
  clarifying_questions: { E_RETURN: { handle: validators.clarifying_questions, onAccept: "question_answers" }, E_REPLAY: { handle: replayStored } },
  question_answers: { E_RETURN: { handle: validators.question_answers, onAccept: "desired_state" }, E_REPLAY: { handle: replayStored } },
  desired_state: { E_RETURN: { handle: validators.desired_state, onAccept: "current_state" }, E_REPLAY: { handle: replayStored } },
  current_state: { E_RETURN: { handle: validators.current_state, onAccept: "required_changes" }, E_REPLAY: { handle: replayStored } },
  required_changes: { E_RETURN: { handle: validators.required_changes, onAccept: "agent_actions" }, E_REPLAY: { handle: replayStored } },
  agent_actions: { E_RETURN: { handle: validators.agent_actions, onAccept: "change_action_mapping" }, E_REPLAY: { handle: replayStored } },
  change_action_mapping: { E_RETURN: { handle: validators.change_action_mapping, onAccept: "execution_procedure" }, E_REPLAY: { handle: replayStored } },
  execution_procedure: { E_RETURN: { handle: validators.execution_procedure, onAccept: "simulation_results" }, E_REPLAY: { handle: replayStored } },
  simulation_results: { E_RETURN: { handle: validators.simulation_results, onAccept: "execution_results" }, E_REPLAY: { handle: replayStored } },
  execution_results: { E_RETURN: { handle: validators.execution_results, onAccept: "post_execution_diagnostic" }, E_REPLAY: { handle: replayStored } },
  post_execution_diagnostic: { E_RETURN: { handle: validators.post_execution_diagnostic, onAccept: null }, E_REPLAY: { handle: replayStored } },
  COMPLETE: {
    E_RETURN: { handle: replayCompletion },
    E_REPLAY: { handle: replayCompletion }
  }
});

function normalizeEvent(args) {
  if (!Object.hasOwn(args, "nonce")) return { kind: "CREATE" };
  return Object.hasOwn(args, "input")
    ? { type: "E_RETURN", input: args.input }
    : { type: "E_REPLAY" };
}

function resolveCell(record, event) {
  const row = record.completed ? TABLE.COMPLETE : TABLE[record.state.keyword];
  const cell = row?.[event.type];
  if (!cell || typeof cell.handle !== "function") {
    throw new Error("UNDEFINED_STATE_EVENT_CELL");
  }
  return cell;
}

async function dispatchPersisted(nonce, event, { load, save, render }) {
  // Caller serializes per-nonce calls within this single MCP server process.
  const record = await load(nonce);
  const cell = resolveCell(record, event);
  const read = key => record.inputs[key];
  const result = await cell.handle({ record, read }, event);

  if (result.kind === "REPLAY") return render(record.state.projection);
  if (result.kind === "REPLAY_COMPLETE") {
    return record.completionReceipt ?? renderCompletion(nonce, record.inputs);
  }
  if (result.kind === "REJECT") {
    const nextRecord = structuredClone(record);
    nextRecord.state.projection = withDiagnostic(
      record.state.keyword, record.state.projection, result.diagnostic
    );
    await save(nonce, nextRecord);
    return render(nextRecord.state.projection);
  }
  if (result.kind !== "ACCEPT" || event.type !== "E_RETURN") {
    throw new Error("INVALID_CELL_DECISION");
  }

  const nextRecord = structuredClone(record);
  const keyword = record.state.keyword;
  nextRecord.inputs[keyword] = result.value;
  if (cell.onAccept === null) {
    nextRecord.completed = true;
    nextRecord.completionReceipt = renderCompletion(nonce, nextRecord.inputs);
    await save(nonce, nextRecord);
    return nextRecord.completionReceipt;
  }
  if (typeof cell.onAccept !== "string" || !TABLE[cell.onAccept]) {
    throw new Error("INVALID_SUCCESSOR");
  }
  nextRecord.state = await buildState(cell.onAccept, nextRecord.inputs);
  await save(nonce, nextRecord);
  return render(nextRecord.state.projection);
}
```

The **creation path** retains `create(nonce,{save,render})` as presently implemented. It makes the initial `verbatim_request` projection and saves it before the alias response. That is initialization, not an event-column transition. The *same nonce* is used for every subsequent event.

`onTransition` observer notifications may remain in the controller *after durable save* and must not determine the transition. The current implementation's callback event vocabulary (started/replayed/retry/advanced/completed) remains an observation channel, not a second FSM transition axis.

## 4. Migration plan: exact surface by surface

1. **`projection-bindings.json`** — keep existing `read_keywords` and `derive_schema` behaviors and paths; declare for each state `event_handlers.E_RETURN` as the existing module's validator, `event_handlers.E_REPLAY` as common replay, and `on_accept` from the original `next`. Do not confuse JSON string function names with callable pointers: compile/resolve them once at module initialization.
2. **`src/iterator.mjs`** — construct `TABLE` from module function references; statically verify every declared cell and target; replace the one-dimensional `handlers[state.keyword]` dispatch and validity-branch transition with `TABLE[state][event]` plus a single Decision interpreter. Preserve `buildState` schema construction.
3. **`src/<keyword>.mjs`** — retain current schema and semantic validators; wrap each existing handler into `validators.<keyword>` with a uniform callable signature. Do not silently replace a complex validator with AJV shape checks alone.
4. **`procedure.mjs`** — keep external `Procedure`, `{nonce}`, `{nonce,input}` entrypoint shapes exactly; convert to `CREATE`, `E_REPLAY`, `E_RETURN`; preserve nonce-keyed storage, atomic rename and completion replay.
5. **Serialized per-nonce execution** — because `load → validate → save` spans asynchronous calls, use one process-local promise-chain mutex keyed by nonce around each mutating `E_RETURN` dispatch for the current **single-server-process** topology. Explicitly do not claim multi-process safety. Concurrent access from multiple server processes requires a different store or cross-process lock and a separate design decision.
6. **`render_state.mjs`** — keep it output-only; it shall not dispatch events or modify nonce records.
7. **Tests** — 14×2 cell resolution; 13 valid E_RETURN cases; 13 invalid E_RETURN cases; all 14 replay cases; final completion receipt; JSON projection/schema equivalence; schema derivation; semantic validator preservation; unknown event rejection; concurrent same-nonce calls; save failure leaves prior state unchanged; no new events added.

## 5. Invariants and correctness conditions

- **I1 Totality:** `|S|=14`, `|E|=2`, and exactly 28 valid cells exist; all cells contain a callable.
- **I2 Determinism:** For a saved record and an event, exactly one cell and one handler are selected.
- **I3 Controlled successors:** The cell defines the only accepted successor; handlers cannot bypass it.
- **I4 Validation:** Current saved concrete final_schema and state-specific semantics determine ACCEPT or REJECT.
- **I5 Rejection preservation:** Nonce, active keyword, instruction and concrete schema remain equal; diagnostic is additive.
- **I6 Replay preservation:** No state generation, validation, or save occurs on replay.
- **I7 Terminal idempotence:** Repeated completed-nonce input/replay returns the persisted completion receipt.
- **I8 Save-before-render:** Accepted transition or rejection diagnostic is saved before the rendered response leaves the controller.
- **I9 No unauthorized extension:** No hierarchy, actors, new event types, timers or outbox are added to this substrate.

## 6. Evidence-based refinements relative to the previous proposal

- **Retain and sharpen:** JS references in a lookup table are adequate function pointers; the direct two-dimensional cell eliminates hidden state-dependent branching. machina.js and Robot3 show compact functional machine definitions; university dispatch-table examples corroborate the table model.
- **Retain:** Nonce persistence and saved-projection schema validation; these are already implemented and should not be discarded merely to adopt an external engine.
- **Specify exactly:** Run-to-completion for one event within a nonce, because W3C SCXML and Python StateMachine describe it and pytransitions documents queued callback interleavings.
- **Reject for this substrate:** Event types beyond E_RETURN and E_REPLAY, Harel hierarchy, actors/orthogonal states, task timeouts, event-sourcing logs, standalone dynamic DSLs. They may be useful elsewhere but are not required for this design.
- **Do not substitute:** XState, transitions, machina, or Robot3 runtime as the current engine. Compare their verified patterns and preserve the original Terminals handler contracts instead.

## 7. Design success vs implementation success

The present research work is successful when this design and the source comparison have been collected, saved and verified. This file is **not a deployed change to `src/iterator.mjs`** and does not assert runtime regression tests were executed.
