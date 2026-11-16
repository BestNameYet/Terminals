# Evidence synthesis — concrete 2D function-pointer substrate

Research date: 2026-11-16. Target: Terminals `@Procedure`, 13 current input states and one terminal `COMPLETE` row; columns `E_RETURN` and `E_REPLAY`.

## Comparison against nine minimum architectural concerns

| Design concern | Evidence reviewed | Existing @Procedure | Substrate decision | Confidence |
|---|---|---|---|---|
| 1. State×event indexing | Bernstein, *Implementing State Machines*; Geoffrey Hunter's matrix; machina.js | One-dimensional keyword registry | **Adopt:** `M[state][event]` with callable in each cell | High |
| 2. Callable semantics | Robot3 functional transitions; machina v8 handlers | Existing individual handler functions | **Adopt:** uniform `handler(ctx,event) → Decision` wrappers; no runtime library | High |
| 3. Legal successor topology | `javascript-state-machine`, TypeState; W3C SCXML | One `next` binding per state | **Adopt:** each `E_RETURN` cell holds legal `onAccept` target; validator cannot choose undeclared successor | High |
| 4. Event normalization | SCXML event model; machina inputName | Bare nonce and `nonce(input)` | **Adopt:** map these exact calls to `E_REPLAY` and `E_RETURN` internally; don't change public API | High |
| 5. Per-state validation | Python StateMachine and `transitions` condition execution | AJV saved schema + state-specific semantics | **Preserve:** wrap existing validators; not just structural checks | High |
| 6. Replay semantics | XState snapshot/restore docs; issue #4860 | Returns saved projection or completed receipt | **Preserve:** replay cell never regenerates state schema | High |
| 7. Run-to-completion | W3C SCXML and python-statemachine processing model; pytransitions queued docs | Async read/modify/save without visible nonce-specific queue | **Adopt:** serialize mutable dispatches per nonce in a single MCP server process | High semantics / medium implementation |
| 8. Diagnostics and errors | Python StateMachine callbacks; GitHub issues #224 and #443 | Additive error diagnostic then saved projection | **Preserve:** REJECT must retain current state and final_schema; handler exceptions must not partially write | High |
| 9. Completion | Robot3 immutable transition style; current Terminals completion receipt | Saved terminal receipt and replay | **Preserve:** `COMPLETE` row maps both events to replayCompletion | High |
| 10. Model complexity | Harel 1987; SCXML; XState and RAFCON | Flat 13-state workflow | **Reject for this phase:** hierarchical/parallel states and actor framework | High |
| 11. Source-to-test coverage | Transition-table formalism; TypeState; classic FSM library | Existing tests not new 2D matrix tests | **Adopt:** test all 28 cells and all preserved original validations | High |

## Specific change to earlier design

The preceding review suggested a broad event-driven extension with optional `E_CANCEL`, `E_TIMEOUT`, entry/exit callbacks and future queue/outbox features. This research phase **narrows that proposal** to a revised substrate:

`state × event → direct callable → structured Decision → centrally applied transition → persistence → output`.

The event vocabulary is exactly `{E_RETURN, E_REPLAY}`, not an open-ended roadmap. The original 13 progression handlers remain, all with the original full schemas, validations and machine-dialect instructions. There is no need to introduce actor spawning, hierarchy, asynchronous orchestration, or additional tools to realize the requested 2D pointer dispatch.

## Primary sources with directly relevant evidence

- W3C SCXML: https://www.w3.org/TR/scxml/ — exact event matching, run-to-completion, explicit event treatment.
- David Bernstein, *Implementing State Machines*: https://users.cs.jmu.edu/simmonsj/ImplementingStateMachines.pdf — tables of function pointers as a dispatch mechanism.
- Geoffrey Hunter, pointer machine: https://blog.mbedded.ninja/programming/design-patterns/state-machines/function-pointers/ — state/event matrix plus state-function dispatch.
- Geoffrey Hunter, event-driven architecture: https://blog.mbedded.ninja/programming/design-patterns/state-machines/event-driven-hierarchical/ — per-state event handler logic, warns about blocking handlers.
- machina v8: https://github.com/ifandelse/machina.js — state-keyed input handlers and direct callable results.
- Robot3: https://github.com/matthewp/robot — functional transition declarations with minimal core.
- pytransitions: https://github.com/pytransitions/transitions — conditional and queued transitions; confirms that nested callback events change ordering.
- Python StateMachine processing model: https://python-statemachine.readthedocs.io/en/latest/processing_model.html — RTC processing.
- XState: https://github.com/statelyai/xstate — source tree includes transition selection, persistence and snapshot modules; demonstrates a comprehensive alternative, not a required dependency.

## Coverage and limitations

The accompanying corpus logs 41 screened resources, 35 included, covering 11 JS/TS projects, 10 Python projects, 5 formal/academic sources, 5 engineering articles, and 4 developer issue threads. **Catalog inclusion does not equal source-code audit.** Representative repositories (notably XState, machina, python-statemachine and Sismic) were inspected at the source tree level; upstream docs establish many of the other design claims. Community issues are potential failure modes requiring future tests, not verified defects of Terminals.

The useful result of the diversity study is not additional feature requirements. It is a simpler, more precise 14×2 transition-function table, a uniform result protocol, deterministic commit/render order, and a bounded regression matrix.

## Research-only decision

**PASS for source collection and substrate design**, conditional on artifact readback and matching source counts. The implementation, integration, and behavior testing of the 2D machine are not part of this phase and shall not be marked FAIL merely because they have not happened.
