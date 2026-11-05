# Screen–Event State Machine — Application-Agnostic Software Requirements Specification

**Document ID:** PROG-FSM-SRS-001
**Version:** 0.1.0
**Status:** Preliminary design requirements; not an implementation claim or acceptance record
**System:** Programs — reusable application state-machine architecture
**Repository:** BestNameYet/Terminals
**Companion:** [Programs SRS](SRS.md) (PROG-SRS-001); [Programs interfaces](INTERFACES.md)
**Machine projection:** [SCREEN-EVENT-FSM-SRS.agent.json](SCREEN-EVENT-FSM-SRS.agent.json)
**Source:** [Verified conversation extraction](../shared-conversations/6aec655e-b21c-83e8-84ee-03b5972aee52/42019837848-1/conversation.md) — particularly user messages at visible-message indices 265 and 270

## 1. Purpose and controlling requirements

Define a reusable finite-state machine whose dispatch mechanism is a **two-dimensional array of function references**. **Rows** represent the currently rendered screen or an alias resolving to that screen. **Columns** represent events. An addressed cell contains a callable transition handler or an explicitly unsupported entry. **All mutable application and execution variables reside in a context object passed to the selected function.**

This specification is application agnostic. It SHALL NOT enumerate the screens, events, operations, menu choices, or transition functions of Scratchpad or any other individual application. Each application independently supplies its screen/event vocabulary, cell functions, and application-specific context data.

The earlier conversation explicitly rejected an application-specific SRS and requested this architectural specification instead. This document is distinct from the already existing Programs execution-subsystem SRS, which governs program discovery, invocation, workflow dispatch, receipts and publication.

## 2. Scope and authority

**In scope:** matrix shape and construction, indexing, screen aliases, event handling, function-pointer invocation, context semantics, transition results, rendering coordination, persistence contracts, concurrency, error handling, isolation, extensibility, and testable invariants.

**Out of scope:** any application's domain screens or events, Scratchpad behavior, navigation menus, GitHub Issue numbers, GitHub workflow routing policy, a particular storage engine, or implementation of the state machine. This SRS defines an architecture to be implemented and tested; it does not assert that a conforming runtime exists.

**Relationship to Programs:** Programs may launch and host an application implementing this architecture. Its generic workflow and program-runner interfaces remain governed by PROG-SRS-001. The present SRS governs the inner event-driven application controller and SHALL NOT replace or rewrite the Programs runner contract.

## 3. Terms and model

- **Rendered screen:** the screen identity last confirmed as rendered or published for an application instance. The canonical value is held in context.renderedScreen.
- **Screen alias:** a distinct registered identifier mapping to one canonical rendered-screen row, not a separate independently executable state.
- **Event:** a normalized, validated occurrence identified by a registered event key and carried as context.event.
- **Transition matrix:** a rectangular, row-major two-dimensional array of callable handlers or explicit unsupported cells.
- **Function pointer/reference:** a directly callable function value in the running process, not text to be evaluated.
- **Context:** the sole per-instance carrier of mutable state and execution variables, supplied as the one argument to the handler.
- **Transition result:** the handler's validated declaration of updated context, requested next rendering and authorized effects.
- **Instance:** a distinct application/session lifecycle with its own context revision and event sequence.
- **Dispatcher:** application-neutral machinery that resolves row/column indexes and calls the cell.
- **Renderer:** application-neutral adapter that renders the handler's requested view and reports the observed outcome.

## 4. Structural design

### 4.1 Fixed axes and matrix

An application definition SHALL declare a finite ordered collection of canonical screen IDs and a finite ordered collection of event IDs. Their ordered positions determine row and column indexes. The loaded matrix SHALL have exactly the number of rows declared by the screen list and exactly the number of columns declared by the event list in every row.

The selected cell SHALL be evaluated as:

~~~javascript
const row = screenIndex[resolveScreen(context.renderedScreen)];
const column = eventIndex[context.event.id];
const handler = transitionMatrix[row][column];
const transitionResult = handler(context);
~~~

This example is explanatory pseudocode for the dispatch operation, not an application or executable implementation. Lookup, validation and error handling precede invocation.

A cell SHALL contain either a callable function reference or an explicit unsupported marker. Missing array elements, unknown keys, malformed rows and arbitrary strings masquerading as functions SHALL fail matrix validation. An unsupported cell SHALL never fall through to another screen's handler.

### 4.2 Alias resolution

An alias registry SHALL map each alias to exactly one canonical screen. A canonical screen SHALL resolve to itself. Aliases SHALL resolve before row lookup and SHALL never create duplicate matrix rows. An alias collision, unknown target, cycle or ambiguous mapping SHALL be rejected before dispatch. Multiple aliases may designate the same canonical screen, and they SHALL select precisely the same row and function reference for a given event.

The context SHALL preserve the actual rendered-screen identifier and MAY separately record its canonical resolution. Alias resolution SHALL NOT silently replace the displayed screen identity or fabricate a render.

### 4.3 Event mapping

An event registry SHALL map each registered event ID to exactly one column. Event IDs are local to the selected application definition; no generic runtime event name SHALL imply application behavior. The dispatcher SHALL validate the event envelope and its authorization or source correlation before consulting the matrix. Unknown events SHALL produce a structured rejection without calling a handler.

### 4.4 Matrix ownership and immutability

The application supplies transition definitions, but the generic dispatcher owns index resolution and invocation. Transition definitions, registries and callable references SHALL be validated and treated as immutable for the lifetime of the loaded definition. A revised definition SHALL carry a distinguishable version and a controlled context-migration policy.

Callable references SHALL be resolved from application code at load time. They SHALL NOT be serialized to JSON as executable source, interpreted using eval, or dynamically constructed from untrusted text. Persisted or transmitted matrix metadata MAY use symbolic handler IDs that are resolved to authorized functions during initialization.

## 5. Context contract

### 5.1 Single-argument rule

Every selected cell SHALL be called with exactly one application-instance context object. Handlers SHALL NOT depend on independent mutable application globals, hidden process-level state, positional event arguments, or application-specific variables stored outside the context. Immutable code/configuration and externally managed persistence services are not application state; service capabilities needed by a handler SHALL be made accessible through explicitly controlled context references.

The minimum logical context schema is:

~~~json
{
  "schema": "terminals.programs.screen-event-context.v1",
  "applicationId": "application-key",
  "instanceId": "instance-key",
  "definitionVersion": "definition-version",
  "revision": 0,
  "renderedScreen": "canonical-or-alias-screen",
  "event": {
    "id": "registered-event-id",
    "input": {},
    "correlationId": "event-correlation-id"
  },
  "application": {},
  "runtime": {},
  "transition": {}
}
~~~

These values describe fields and types, not fixed application vocabulary. The application namespace SHALL contain domain variables; the runtime namespace SHALL contain generic lifecycle, access, rendering and delivery metadata; the transition namespace SHALL contain temporary results or pending effects. Optional capabilities SHALL have explicit names, permissions and lifetime rules.

### 5.2 Context validity and lifecycle

The context SHALL be associated with one application instance and definition version, be schema-validated before dispatch, and carry a monotonically advancing revision or equivalent compare-and-set version. The current event SHALL be inserted into the context before handler invocation; the selected handler SHALL see the same event ID used for the column lookup.

A handler SHALL receive a private working context or equivalent transactionally isolated view. The runtime SHALL validate the handler's output and commit an accepted update atomically relative to competing events for the same instance. Mutable per-instance variables SHALL NOT leak to another instance or another application.

A handler MAY mutate its supplied working context or return a revised context, provided the selected implementation adopts one explicit, versioned convention. The dispatcher SHALL not silently mix both conventions. In all cases the authoritative persistent state remains the validated context, not an independent shadow object.

## 6. Handler and transition contracts

Each transition handler SHALL implement the logical signature:

~~~text
transition(context) -> transitionResult
~~~

A transition result SHALL identify success or a classified rejection; supply the revised context (or identify the same validated working context under the chosen convention); and declare the next-screen/render request and any permitted effect requests. The result SHALL NOT directly claim a new rendered screen before the render/publish boundary is satisfied.

A handler SHALL be responsible for application decisions. Generic Programs/dispatcher code SHALL NOT choose application menu items, decide which domain screen follows an event, or contain application-specific completion/termination branches.

Handlers SHALL NOT bypass the dispatcher to invoke a different matrix cell recursively unless the application definition explicitly declares and tests an internal-event mechanism. External side effects SHALL be invoked through authorized effect capabilities with idempotency/correlation metadata; durable side effects SHALL not be inferred merely because the handler returned.

## 7. Required transition lifecycle

1. **Receive and normalize:** obtain an event for one instance and authenticate/validate its envelope; retrieve its context at a known revision.
2. **Resolve row:** read context.renderedScreen, resolve its alias to one canonical screen and obtain the registered row index.
3. **Resolve column:** read context.event.id and obtain the registered event-column index.
4. **Select cell:** read matrix[row][column]; reject unknown, unsupported or non-callable cells without invoking application logic.
5. **Invoke:** call the selected function with the context object as its only argument.
6. **Validate:** validate result schema, updated context, requested next screen, authorized effects and version preconditions.
7. **Apply and render:** orchestrate the authorized effects and renderer through adapters, recording partial failures and correlating receipts.
8. **Record the observed screen:** update context.renderedScreen only when the specified render/publication acknowledgement criterion is met; otherwise preserve the last confirmed screen and record the unresolved render state.
9. **Commit and report:** persist a revisioned state/receipt according to the selected transaction model and expose the outcome to the caller.

The implementation SHALL define and test atomicity boundaries for steps 7–9. In particular, it SHALL NOT report an acknowledged transition when effects, rendering or persistence remain unverified. If atomic execution across external systems is unavailable, it SHALL record a recoverable pending/partial outcome and avoid duplicate non-idempotent effects.

## 8. Formal functional requirements

| ID | Requirement |
|---|---|
| FSM-AXIS-001 | The application definition SHALL declare ordered screen and event axes and a rectangular function-reference matrix indexed [screen][event]. |
| FSM-AXIS-002 | Every cell SHALL be an authorized callable reference or explicit unsupported marker; ragged/undefined entries SHALL be rejected. |
| FSM-AXIS-003 | A screen alias SHALL resolve uniquely to a canonical row and SHALL NOT create a second row. |
| FSM-AXIS-004 | The selected row SHALL be derived from context.renderedScreen; the column SHALL be derived from context.event.id. |
| FSM-AXIS-005 | The dispatcher SHALL call exactly the function in the resolved cell and SHALL pass exactly one context argument. |
| FSM-AXIS-006 | Definitions and symbolic-to-callable bindings SHALL be versioned and immutable while loaded. |
| FSM-CTX-001 | All mutable application/instance variables SHALL reside in context, segregated by application and runtime namespaces. |
| FSM-CTX-002 | Context SHALL contain the current rendered-screen ID, current event, instance identity, definition version and revision. |
| FSM-CTX-003 | A transition SHALL operate on an isolated, validated context and publish state under a checked revision. |
| FSM-CTX-004 | An instance SHALL NOT observe another instance's mutable variables or event payloads. |
| FSM-CTX-005 | Handler mutation/return convention SHALL be explicit and uniform across an application definition. |
| FSM-TRN-001 | Unknown screen, alias or event SHALL cause a typed rejection without handler execution. |
| FSM-TRN-002 | An unsupported matrix cell SHALL cause a typed rejection/no-transition and SHALL NOT invoke a fallback handler unless explicitly configured in the definition. |
| FSM-TRN-003 | The handler SHALL own application-specific transition decisions; the generic dispatcher SHALL contain no domain-event or menu-condition branches. |
| FSM-TRN-004 | A handler result SHALL be validated for output context, target screen, effect authorization and supported result type. |
| FSM-TRN-005 | The runtime SHALL not equate a proposed next screen with the last confirmed rendered screen. |
| FSM-TRN-006 | Handler exceptions, invalid outputs, render failures and persistence failures SHALL be distinguishable in structured outcomes. |
| FSM-TRN-007 | Accepted events for the same instance SHALL have an explicit serialization or optimistic concurrency policy; event order SHALL be observable. |
| FSM-TRN-008 | Repeated event delivery SHALL use correlation/idempotency rules and SHALL not silently replay non-idempotent effects. |
| FSM-TRN-009 | External effects and render/persistence receipts SHALL be correlated with instance ID, event ID and context revision. |
| FSM-INT-001 | An application SHALL supply its own screens, aliases, events and functions without changing dispatcher source. |
| FSM-INT-002 | The renderer, persistence, authorization and transport adapters SHALL remain replaceable and application-neutral. |
| FSM-INT-003 | This FSM contract SHALL coexist with PROG-SRS-001 without introducing Issue-number or GitHub-workflow dependencies into the matrix. |
| FSM-INT-004 | Existing application behavior SHALL NOT be claimed conformant solely because its current controller appears event-driven. |

## 9. Invalid states and recovery

Malformed definitions, duplicate screen/event IDs, aliases with missing targets, alias cycles and invalid function bindings are **initialization errors**. Unknown screens/events, unsupported cells, stale revisions and invalid event envelopes are **dispatch rejections**. Thrown exceptions and invalid returned contexts are **transition failures**. Rendering, effect execution and state-write errors are **downstream failures**. Each category SHALL be observable and shall state whether a handler ran, whether an effect may have happened, and whether the last confirmed renderedScreen changed.

No rejection SHALL silently invent an application screen, perform a default navigation action, or change the persistent context revision. Explicitly configured error-screen transitions, if any, must themselves be represented and tested as application-defined behavior rather than a hard-coded Scratchpad or Programs preference.

## 10. Isolation, security and quality

Per-instance context SHALL be isolated from other sessions and applications. Handler references SHALL originate from authorized code, not user-provided source. Event payload validation, capabilities, access controls and persistence policies SHALL be explicit. Secrets SHALL not appear in context snapshots, diagnostics or render output without an approved redaction and secure reference scheme.

Transition selection SHALL be deterministic for a given definition, rendered screen and event ID; application handlers may perform nondeterministic operations only through declared capabilities whose outcomes are recorded. Definition loading SHALL detect structural errors before accepting events. Receipts SHALL permit reconstruction of which row, column and handler were selected without serializing executable functions.

## 11. Acceptance tests and verification gates

| ID | Test | Acceptance |
|---|---|---|
| FSM-T01 | Construct a matrix with multiple arbitrary screens and events. | Every canonical [row][column] points to its declared handler/unsupported marker. |
| FSM-T02 | Submit the same event under each registered alias of one screen. | Alias and canonical IDs invoke the identical handler with one context argument. |
| FSM-T03 | Submit an unknown event, unknown renderedScreen and unknown alias. | Typed rejections; zero handler calls; unchanged persistent context. |
| FSM-T04 | Submit every unsupported cell. | No call, no side effects, no accidental fallback. |
| FSM-T05 | Supply malformed matrix dimensions, duplicate IDs, cycle and alias collision. | Registration fails before a dispatch can occur. |
| FSM-T06 | Pass an event with multiple application variables. | Handler accesses all mutable inputs only through context; updated context passes validation. |
| FSM-T07 | Run two instances through interleaved events. | No state leakage; independent screen IDs and revision sequences. |
| FSM-T08 | Dispatch two conflicting events against the same revision. | Documented ordering/CAS rule prevents lost updates. |
| FSM-T09 | Trigger a handler exception, invalid output, render failure and persistence failure. | Four separately classified outcomes with accurate last-confirmed screen. |
| FSM-T10 | Redeliver a previously processed event. | Idempotency/duplicate policy prevents unintended repeat effects. |
| FSM-T11 | Register a second, unrelated application definition without modifying dispatcher source. | Same engine dispatches both definitions using only supplied matrices/context. |
| FSM-T12 | Review dispatcher implementation. | No application-specific screens, domain events or menu branching. |
| FSM-T13 | Persist/restore context after a version change. | Compatible migration succeeds or incompatible state is explicitly rejected. |
| FSM-T14 | Attempt to inject a handler name or arbitrary source through event input. | No code evaluation or unauthorized function selection. |

All declared matrix cells (including unsupported cells) SHALL be covered by table-driven tests. Alias-to-canonical equivalence SHALL be tested for every alias and applicable event. Acceptance requires executable evidence and checked receipts; this draft alone does not establish runtime conformance.

## 12. Open design decisions

The implementation specification must explicitly fix: (1) mutation-in-place versus returned-context conventions; (2) synchronous versus asynchronous handlers; (3) exact renderer acknowledgement and persistence transaction boundaries; (4) fallback behavior, if any, for unsupported cells; (5) context serialization of non-JSON data and service capabilities; (6) context migration and version compatibility; (7) event ordering and replay storage; (8) per-instance storage/retention. Until resolved, these are design parameters rather than unverified claims of existing behavior.

## 13. Source traceability and change control

- The verified shared conversation directly supplies the architecture: two-dimensional function-pointer array; rows = renderedScreen or its alias; columns = events; all variables in the context object passed to the called function.
- The same conversation explicitly rejects narrowing the SRS to Scratchpad, and establishes that this belongs in Programs design as a distinct, application-agnostic document.
- PROG-SRS-001 remains authoritative for the outer Programs execution runner; this SRS defines the inner generic application state machine.
- Companion machine projection is intentionally semantic and task-oriented rather than a line-for-line markdown transcription. The two files SHALL remain version-linked and independently validated on substantive revision.

