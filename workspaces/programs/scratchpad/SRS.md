# Terminals program mode and scratchpad application — SRS

**Specification:** TP-SRS-001, v1.0.0  
**Relationship to implementation:** prospective primary specification  
**Machine projection:** [SRS.agent.json](SRS.agent.json)  
**Template syntax:** [Selection Element Specification v0.2.0](../selection-element-specification.md)  
**Scope:** program invocation through Issue #3 and scratchpad create/edit operations in Issues #4 and #5.

## Functional requirements

- **PM-01:** Issue #3 SHALL retain the Bash (\`$\`) and GitHub CLI (\`gh\`) runOn modes without altering their behavior.
- **PM-02:** Issue #3 SHALL add the program runOn symbol \`@\`. The \`whatPrompt\` string SHALL accept exactly \`programs\` or \`run <application name>\` in this mode.
- **PM-03:** \`programs\` SHALL list every registered application by name and description using a structured selection menu. Application names SHALL be unique stable ASCII slugs.
- **PM-04:** \`run <application name>\` SHALL select only an explicitly registered Node.js entrypoint. It SHALL NOT interpret user-provided text as an executable path or shell program.
- **PM-05:** Program invocation SHALL accept an optional JSON-object \`programInput\` field and pass its serialized value as a single Node.js argument without shell interpolation.
- **PM-06:** Program stdout SHALL flow through the existing terminalruns output/verification surface; stderr and process exit status SHALL be inspected through Actions.
- **SP-01:** \`scratchpad\` SHALL expose operations for creating a scratchpad and editing an existing comment.
- **SP-02:** New scratchpads SHALL compare current Issue #4 and #5 comment counts, choose the smaller, and use #4 for ties.
- **SP-03:** Creation SHALL publish a JSON template comment containing a header object and nonempty entries array of caption/work objects; it SHALL return comment ID, Issue number, URL and revision.
- **SP-04:** Editing SHALL fetch the existing Issue #4 or #5 comment by ID and show a structured menu with a New entry choice and choices for individual existing entries.
- **SP-05:** New entry SHALL accept caption fields and a work string, append a new indexed entry, and advance header revision and updated_at.
- **SP-06:** Individual edit SHALL accept an entry selection and partial caption/work values, append a revision entry referencing the prior index, and preserve source history.
- **SP-07:** The application SHALL accept whole or partial JSON document submission, performing validated merges without silently dropping existing entries.
- **SP-08:** Every mutation SHALL validate input shape, target Issue membership, optimistic expected revision, and read-back content after GitHub persistence.
- **SP-09:** Each create/edit or subject transition SHALL have a versioned caption; work text SHALL reside in the entry's work member.
- **SP-10:** The application SHALL provide a task-start and edit-selection menu without requiring any manually constructed GitHub REST command.
- **SEC-01:** Mutations SHALL be confined to Issues #4 and #5 of BestNameYet/Terminals and owner-authorized invocation through Issue #3.
- **TEST-01:** Node.js unit tests SHALL cover menu generation, program registry restrictions, scratchpad creation, entry append, revision edits, partial/full JSON merging, schema validation and unsafe target rejection.
- **TEST-02:** An end-to-end test SHALL confirm that \`@\` mode can list programs and run the scratchpad application, with verified terminalruns results.

## Input contracts

**Command catalog:**

\`\`\`text
{"runOn":"@","whatPrompt":"programs","forWhom":<agent_nonce>}
{"runOn":"@","whatPrompt":"run scratchpad","forWhom":<agent_nonce>,"programInput":<json_object>}
\`\`\`

Source templates use unquoted typed \`<name>\` placeholders. A runtime variable is represented as unquoted \`$name\` in source templates. The compiled JSON menu encodes runtime expressions as tagged values; that representation is an application-level extension pending general selection-compiler ratification.

**Scratchpad operations:** \`new\`, \`edit\`, \`new_entry\`, \`edit_entry\`, \`submit_json\`. An empty programInput returns the application operation menu. \`edit\` with a comment ID returns its entry selection menu. New entry is selection ID zero; existing active entries occupy subsequent IDs. Mutating operations accept \`expected_revision\` to detect stale snapshots.

The \`submit_json\` input accepts \`document\` as an object. \`header\` fields are selectively merged; \`entries\` may be a complete indexed array or a partial array of objects indicating target index and changed \`caption\`/\`work\`. Existing history is retained. Metadata ownership, IDs and revision counters are program-maintained.

## Persistence and verification

A scratchpad body is exactly one JSON object with \`header\` and \`entries\`. Each entry consists of \`caption\` and \`work\`. Edits append a new revision referencing the previous entry; previous entries remain for future machine parsing. New scratchpads are created in the lesser-comment-count Issue on each new task; an existing comment stays in its original Issue. GitHub REST writes are checked by a readback of the full JSON comment body. The optimistic revision check prevents known stale edits but is not an atomic transaction across competing independent workflow runs.

## Acceptance and limitations

Output menus SHALL list executable options with named applications and actions. Program mode SHALL not require Bash wrapping of arbitrary application arguments. Tests SHALL not treat successful command acceptance as evidence of GitHub mutation. Unknown apps, malformed arguments, non-owned Issues, wrong revisions and invalid JSON SHALL fail safely. The selection compiled-expression tags are provisional and SHALL be identified as such; the separate source templates retain v0.2.0 notation.

