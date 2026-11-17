# Local Agent Instructions

Agents operating in this workspace MUST read `AGENTS.json` and treat it as the **authoritative local behavioral document** for this workspace. Follow the applicable instructions defined there, subject to higher-priority instructions.

This `AGENTS.md` identifies the authoritative local document; it does not replace or duplicate the instructions in `AGENTS.json`.

## Current State/Event Execution Contract

Read `state-event-contract.json` before implementing or changing execution orchestration. It supersedes only the indexed-iterator, keyword-index-map, and render/exchange mechanics in `AGENTS.json`. The complete existing projection instructions, return schemas, derivation constraints, and substantive validation requirements remain in force, unchanged. `state-instructions-and-return-schemas.json` and `projection-bindings.json` provide the keyword-addressed runtime references.

## Experimental Q&A extension

For new original and revised runs containing `inputs.inquiry`, read `inquiry-cascade.md` and `inquiry-definitions.json`. They supersede the historical root question counts and Q&A skip behavior for those runs only. Preserve the declared source matching, complete inquiry history, per-round perspective nomination, and synthesis context. Records lacking `inputs.inquiry` retain their previous Q&A contract. All unrelated instructions, return schemas, persistence and scratchpad requirements continue to apply.
