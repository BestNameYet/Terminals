# Evidence-to-design comparison: @Procedure event-driven FSM

**Research phase:** 2026-11-16 • **Procedure nonce:** `334a93b7-adf6-4305-857f-a24ce5d84203` • **Reference design:** [earlier FSM review](../reviews/event-driven-function-pointer-fsm-review.md)  
**Companion data:** [29 documented implementations and external evidence](fsm-open-source-source-catalog.json) • [research protocol](fsm-evidence-mapping-protocol.md)

## Scope and achieved seed sample

A research mapping **plan** is not equivalent to executing the full search. The **verified seed survey** comprises 29 distinct public FSM-related repositories for which README/RST text was retrieved (**13 JavaScript/TypeScript, 16 Python**), 6 academic/primary standard/method sources, 10 engineering/documentation sources, and 11 developer issue reports. Source-code inspection was narrower: XState `Mailbox.ts`, pytransitions `core.py` and `extensions/asyncio.py`; further core-file audit and test execution remain research follow-ups. License status across the portfolio has not been independently checked. The planned 120 candidates/80 screened/12 code-deep inspections are *future targets*, not accomplished counts.

The seed findings support a **small deterministic state/event kernel**, not adoption of a broad library without fit testing. The current `@Procedure` has 13 sequential keyword states, saved derived JSON schemas, one nonce identity, replay, rejection retry and stored completion receipt. The proposed registry is already partly present: `handlers[state.keyword]` is a callable reference, but event identity and explicit transition decision are missing.

## Comparative architecture evidence

| Pattern | Open-source / formal evidence | Demonstrated design idea | Decision for Terminals |
|---|---|---|---|
| 1. `(state,event)→handler` function registry | [Machina](https://github.com/ifandelse/machina.js), [Robot3](https://github.com/matthewp/robot), [pytransitions](https://github.com/pytransitions/transitions), [typescript-fsm](https://github.com/WebLegions/typescript-fsm) | Distinct handler per event in a state; declarative valid edges | **Adopt P0**, extending the existing state-keyword registry, not replacing it with a new dependency |
| 2. Run-to-completion and event mailbox | [W3C SCXML](https://www.w3.org/TR/scxml/), [XState Mailbox.ts](https://github.com/statelyai/xstate/blob/main/packages/core/src/Mailbox.ts), [Farc](https://github.com/dwhall/farc) | Process one external event fully before accepting a conflicting event for the same machine; mailbox guards reentrancy | **Adopt P0** per nonce; maintain event ordering and make internal events explicit |
| 3. Per-instance event queue | [pytransitions AsyncMachine](https://github.com/pytransitions/transitions/blob/master/transitions/extensions/asyncio.py), [Machina behavioral FSM](https://machina-js.org/guide/introduction/) | Same machine definition used for distinct client identities; events for each instance may be serialized separately | **Adopt P0**: partition work by nonce; do not globally serialize independent procedures |
| 4. Persistent snapshot distinct from presentation | [XState persistence](https://github.com/statelyai/docs/blob/main/content/docs/persistence.mdx), [XState core](https://github.com/statelyai/xstate), [Django FSM2](https://github.com/django-commons/django-fsm-2) | Durable machine state and displayed output serve different purposes; in-memory state change may not imply persistence | **Adopt P0** versioned JSON record, save-before-render, retain saved projection; preserve current API |
| 5. Guard vs action separation | [Stately statechart examples](https://dev.stately.ai/docs/statecharts), [Sismic](https://github.com/AlexandreDecan/sismic), [python-statemachine](https://github.com/fgmacedo/python-statemachine) | Guards/validators decide eligibility; effects occur only on authorized transition | **Adopt P0** state-specific schema+semantic checks as pure decisions |
| 6. Deterministic graph and model checks | [Sismic](https://github.com/AlexandreDecan/sismic), [JSSM](https://github.com/StoneCypher/jssm), [XState graph tooling](https://github.com/statelyai/xstate) | Validate all state/event cells, reachable states, bad targets and generated paths | **Adopt P1** exhaustive graph tests, no unknown handler pointers |
| 7. Symbolic persisted handler identifiers | [XState state machine implementations](https://prod.stately.ai/docs/xstate/v5/machines), [Automat](https://github.com/glyph/automat), [Machina](https://github.com/ifandelse/machina.js) | Serialized definitions contain data; runtime registry resolves actual callable references | **Adopt P1**: keep only symbolic handler keys in JSON, no functions or eval |
| 8. Clear invalid-event semantics | [W3C SCXML](https://www.w3.org/TR/scxml/), [Stately statecharts](https://dev.stately.ai/docs/statecharts), [pytransitions](https://github.com/pytransitions/transitions) | Unsupported events may be ignored or rejected depending on semantics | **Adopt P1** explicit reject/ignored result with diagnostic, never silently advance |
| 9. Deferred events and lifecycle callbacks | [Finity](https://github.com/nickuraltsev/finity), [steelbreeze/state](https://github.com/steelbreeze/state), [pysm](https://github.com/pgularski/pysm) | Entry/exit and deferred messages can be expressive but complicate persistent state | **Defer P2** until a demonstrated procedure needs timers or deferral |
| 10. Full hierarchical / parallel statecharts | [Harel](https://www.sciencedirect.com/science/article/pii/0167642387900359), [RAFCON](https://github.com/DLR-RM/RAFCON), [YASMIN](https://github.com/uleroboticsgroup/yasmin) | Hierarchy, orthogonal regions and transition entry/exit sets make large FSMs manageable | **Do not adopt now**: current 13-state chain is flat; preserve extensibility |
| 11. Event-sourced agent workflow journal | [Stately agent persistence](https://stately.ai/docs/packages/agent/persistence), [Azure Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) | Append-only ordered inputs can reconstruct state and simplify investigation, but add replay, migration and idempotency costs | **Evaluate later**; do not replace nonce-snapshot contract or EOT recorder by default |
| 12. Visual / textual transition specification | [JSSM](https://github.com/StoneCypher/jssm), [state-machine-cat](https://github.com/sverweij/state-machine-cat) | Graphs aid understanding and reachability inspection | **Adopt P2** as generated diagnostic from the real registry, not as an independent source of truth |

## Important improvements to the previous review

The following findings are *new recommendations* arising from this broader comparison, not implemented changes:

### P0 — Separate commands, events and queries

The prior review treated `E_REPLAY` as a normal event handler. Refine this distinction: `Procedure { nonce }` is a **read-only projection query**, not a transition-triggering event. It must not be queued as an event, invoke entry/exit actions, regenerate a schema, change state revision or produce an event journal entry. `Procedure {nonce,input}` maps internally to a transition event `E_RETURN`. This clarifies semantics and preserves existing replay behavior.

### P0 — Define run-to-completion at nonce granularity

Each accepted external input must be fully validated, converted to a typed decision, applied, persisted and made observable before another event modifies **the same nonce**. Independent nonces may advance concurrently. A per-process `Map<nonce, PromiseQueue>` can serialize calls in one Node process, but **is not sufficient for multiple servers or crashes**. If multi-process/multi-server writes are possible, use an atomic version check (SQLite transaction, CAS-capable store or equivalent), plus an idempotency/request identifier. Temporary-file rename alone ensures atomic replacement, not concurrency safety against stale reads.

### P0 — Persist names, not functions

Keep an in-memory registry `registry[keyword][eventType] -> callable`. Store `keyword`, event types, symbolic handler references, permitted successor keywords, `revision`, accepted inputs and complete saved `final_schema` in JSON. Resolve symbolic keys only from a trusted local registry. Never persist a function pointer itself, and do not execute arbitrary strings from definitions.

### P0 — Keep validators and transition decisions distinct

For `E_RETURN`, validate against the persisted `state.projection.final_schema` plus the state-specific semantic validator. The handler yields a typed `reject` / `stay` / `advance` / `complete` **decision**, not a render call or an arbitrary direct mutation. Controller checks that the decision targets a declared legal edge, saves once, then renderer formats output.

### P1 — Add versioning, reproducible event values and tests

Set `recordVersion` and `machineDefinitionVersion` to support future schema and transition evolution. Use input-carried timestamps, stable IDs and externally determined values for replayable decisions; no hidden `Date.now()` or random IDs inside deterministic handlers. Test each state/event combination, invalid events, malformed payloads, duplicate events, stale revisions, interrupted persistence and restart. Generated graph assertions should flag missing handlers, unreachable nodes and invalid successors.

### P1 — Side effects as commands / outbox-style records

Keep filesystem/GitHub mutations and network requests outside pure validation decisions; send explicit effects after a durable transition boundary with retry and idempotency semantics. The existing `@Procedure` state handlers mostly validate documents, so a generic background effect scheduler is not yet justified. Do not add it solely for theoretical completeness.

## Negative evidence and limitations

1. [XState #5331](https://github.com/statelyai/xstate/issues/5331) reports a restored delayed timer that did not fire; [#5178](https://github.com/statelyai/xstate/issues/5178) discusses history restoration after serialization. **Inference:** if timers or history are added, test persistence/restoration specifically. These are issue reports, not claims that every current release is defective.
2. [pytransitions #640](https://github.com/pytransitions/transitions/issues/640) reports non-atomic transitions under simultaneous async triggers. **Inference:** async handlers alone do not guarantee per-instance serializability.
3. [pytransitions #713](https://github.com/pytransitions/transitions/issues/713) discusses whether cancellation should be hidden or exposed. **Inference:** specify error/cancellation policy instead of swallowing it.
4. [Machina #149](https://github.com/ifandelse/machina.js/issues/149) asks for deferral until one of several target states. **Inference:** deferral creates transition/queue semantics that cannot simply be left implicit.
5. [steelbreeze/state README](https://github.com/steelbreeze/state) explicitly warns that deferred-event storage complicates serialization in its v8 model. **Inference:** avoid introducing deferral into the persisted nonce format without a durability design.
6. [Stately agent guidance](https://stately.ai/docs/packages/agent/thinking-in-state-machines) warns against nondeterministic values in replayed transitions. **Inference:** keep event input values and handler decisions reproducible.

These sources intentionally represent **adverse** perspectives; issue titles, discussion summaries and reported errors were inspected but not independently reproduced. Resolution status and affected releases require code-level follow-up.

## Example minimal runtime interface (proposed, not implemented)

```js
// Public Procedure input format remains unchanged.
// One process-wide registry is only a cache of trusted callables; never serialize it.
const handlers = {
  verbatim_request: { E_RETURN: validateVerbatimRequest },
  user_intent: { E_RETURN: validateUserIntent }
  // ...
};

async function processEvent(nonce, event, storage) {
  return storage.withNonceTransaction(nonce, async record => {
    const fn = handlers[record.state.keyword]?.[event.type];
    if (!fn) return { kind: "rejected_event", code: "UNHANDLED_EVENT" };
    const decision = await fn({ read: k => record.inputs[k], record, event });
    return applyDeclaredDecision(record, event, decision);
  });
}
// Query, not event: load saved projection without invoking handlers.
async function replay(nonce, storage) {
  const record = await storage.load(nonce);
  return record.completed ? record.completionReceipt : record.state.projection;
}
```

`storage.withNonceTransaction` is a **required abstraction to design/test**, not a function in the current code. It must actually serialize or atomically check versions; wrapping a read/rename in a JavaScript function without a real transaction would not provide the claimed safety.

## Prioritized change mapping

| Prior revision target | Research-guided adjustment |
|---|---|
| `src/iterator.mjs` | Normalize `E_RETURN`, resolve per-state event callable, enforce legal decision and run-to-completion, separate replay query |
| `projection-bindings.json` | Bind symbolic handler identifiers and permitted edges; keep the existing full schema and derivation references |
| `procedure.mjs` | Keep nonce public contract; add configurable nonce-scoped serialization, persistent version/idempotency strategy |
| `src/*.mjs` handlers | Retain JSON-schema and semantic validators; return declarative outcomes, not state mutations |
| `src/render_state.mjs` | Preserve output-only projection, complete diagnostics, terminal receipt; never determine next state |
| `state-event-contract.json` and `AGENTS.json` | Update event and replay semantics with existing precedence preserved |
| New transition/graph test suite | Contract conformance, all 13 `E_RETURN` cells, invalid-event policy, persistence/recovery, race and crash conditions |
| Future migration / versioning document | Machine version, snapshot version, compatibility mapping, fallback for old records |

## Scope / status

**Design research and evidence synthesis are the deliverables.** This report does not modify the FSM runtime and does not claim that all future sampling quotas have been met. The seed repository list and study protocol are sufficient for a first design-revision decision, while the full 120-source mapping and deeper verification remain separately planned.

Research completion must be assessed against the **requested research artifacts**, not against the subsequent implementation of the architecture described here.
