# Research protocol — 2D state/event function-pointer FSM substrate

**Review:** 2026-11-16. **Reference run nonce:** `f008d9a9-6cb0-4dd1-9b63-05cf92e7e5f5`.
**Target:** A concrete flat 2D substrate for the existing Terminal MCP `@Procedure`, not the adoption of a full statechart framework.

## Research questions
1. How do implementations represent the relation **current state × incoming event → callable handler**?
2. What must the cell/handler return to distinguish accepted, rejected, replayed, completed and unhandled input?
3. Which proven processing semantics preserve deterministic dispatch, schema validation and replay?
4. Which minimum persistence/concurrency mechanisms support a nonce-keyed machine?
5. Can the design retain the current public `Procedure` API and 13 state modules without gratuitous features?

## Search and sampling

Candidate target: **≥40**, distinct retained **≥30**. Minimum portfolio: **≥8 JS/TS**, **≥8 Python**, **≥4 formal/academic**, **≥4 engineering articles**, **≥4 discussions**. Breadth: **≥9** evaluated dimensions: cell layout; typed events; callable resolution; transition outputs; validation; run-to-completion; state persistence; concurrency; replay/idempotency; testing and diagnostics.

Sources: GitHub repository discovery and upstream implementation documentation, W3C/OMG and academic publications, engineering articles/blogs, original project issue discussions. Query classes:
- `state machine language:TypeScript stars:>150`
- `finite state machine language:JavaScript stars:>100`
- `state machine language:Python stars:>100`
- `finite state machine in:description language:Python stars:>40`
- `hierarchical state machine in:description language:Python`
- Upstream code/README for selected representative implementations, followed by source-to-source citation chaining
- Authoritative terms `function pointer table`, `run to completion`, `dispatch table`, `SCXML`, `statecharts`
- Forum/project issues for queue failures, restored snapshots, and asynchronous races

## Selection and evidence depth

1. Canonicalize URL; record repository/author/title and distinct project identity.
2. Include original implementation, normative standard, scholarly work, substantive independent article or original technical discussion relevant to 2D dispatch. Exclude list aggregators, UI-only visualizers, and unrelated ML uses of `state`.
3. Tag source as **discovery-level** (repository identity and README), **documentation-level** (authoritative behavior), or **implementation-level** (matching code inspected). Never treat a repository description as verified source-code internals.
4. Record one architecture pattern and one concrete implication for the Terminals substrate. An idea does not qualify for adoption merely because a popular framework supports it.
5. Use disagreements and GitHub issues as leads for edge-case tests, not independent proof of a current defect.
6. For every adopted feature: name a source, exact substrate invariant, affected file, and a test that could falsify the recommendation.
7. Primary source count is at the distinct-resource level, not at citations-per-page or duplicated mirrors.

## Exclusion / scope boundary

The requested design is **two dimensional and flat**. Its columns begin with `E_RETURN` and `E_REPLAY`; rows are 13 existing semantic procedure states plus one terminal `COMPLETE` row. State hierarchy, orthogonal regions, timers, actor spawning, automatic guards, external execution engines, dynamic event vocabularies, code generation, or added `E_CANCEL` and `E_TIMEOUT` are not requested and shall not be introduced as substrate requirements.

Existing validators and derived schemas stay substantive; the new table provides deterministic function selection. Comparison material may mention out-of-scope features solely to justify **not adopting** them.

## Stopping and verification

Stop discovery after all portfolio quotas are met, strong primary evidence exists for every adopted design rule, and additional independent sources no longer change the mapping. Record unsatisfied quotas and source-depth limits. Verify saved GitHub corpus and design documents by readback on `main`. The acceptance condition of **this phase** is research plus a concrete revised design, **not implementation or tests against a deployed engine**.

## Evidence anchors

- W3C SCXML https://www.w3.org/TR/scxml/
- Bernstein's university dispatch-table notes https://users.cs.jmu.edu/simmonsj/ImplementingStateMachines.pdf
- Geoffrey Hunter function-pointer article https://blog.mbedded.ninja/programming/design-patterns/state-machines/function-pointers/
- Geoffrey Hunter event-driven article https://blog.mbedded.ninja/programming/design-patterns/state-machines/event-driven-hierarchical/
- machina JS https://github.com/ifandelse/machina.js
- Robot3 https://github.com/matthewp/robot
- Python transitions https://github.com/pytransitions/transitions
- Python StateMachine processing model https://python-statemachine.readthedocs.io/en/latest/processing_model.html
