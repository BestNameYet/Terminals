# Local Agent Instructions

Agents operating in this workspace MUST read `AGENTS.json` and treat it as the **authoritative local behavioral document** for this workspace. Follow the applicable instructions defined there, subject to higher-priority instructions.

This `AGENTS.md` identifies the authoritative local document; it does not replace or duplicate the instructions in `AGENTS.json`.

## Current State/Event Execution Contract

Read `state-event-contract.json` before implementing or changing execution orchestration. It supersedes only the indexed-iterator, keyword-index-map, and render/exchange mechanics in `AGENTS.json`. The complete existing projection instructions, return schemas, derivation constraints, and substantive validation requirements remain in force, unchanged. `state-instructions-and-return-schemas.json` and `projection-bindings.json` provide the keyword-addressed runtime references.

## Array-wise Q&A extension

For new original and revised runs, read `inquiry-cascade.md` and `inquiry-definitions.json`. New records use inquiry schema version 2: configured Base-0 questions, perspective-question arrays over the active parent frontier, matching answer arrays, per-parent synthesis, and final-question/answer arrays. Preserve stable question, parent, perspective, category, and source-anchor IDs; the saved stage manifest controls selections and retries. Construct only the current stage schema. These documents supersede historical question counts and skip behavior for version-2 records.

Records with inquiry schema version 1 retain their saved case/question cursors, perspective nominations, and answer route. Records lacking `inputs.inquiry` retain their previous Q&A contract. All unrelated instructions, return schemas, persistence and scratchpad requirements continue to apply.
