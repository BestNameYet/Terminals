# Experimental inquiry cascade

This branch adds a shared Q&A cascade to new `Procedure` and `Procedure -r` runs. It treats self-generated questions as a way to make useful context explicit, including knowledge the agent can already answer. It is not limited to questions requiring the user to supply missing information.

## The operator

A saved pair contains its question, answer, identity and unresolved status. Each derivative pair also contains its parent, assigned perspective and the source-pair IDs selected when its question was generated. A source pair records what was said; its presence does not establish the truth of the answer.

For a frontier of pairs at depth d, the next operator:

1. Presents the request, intent, frontier pairs, their ancestors, and the fixed perspectives. The revised profile also supplies its saved current-state observations. The agent nominates additional perspectives separately for every pair, or explicitly returns an empty additional array.
2. Freezes the ordered product of each pair with the fixed and its nominated perspectives. A case has one parent pair and one perspective instruction. The controller assigns its ID.
3. Presents each case for question generation. The agent receives the complete parent Q&A, ancestry, all source pairs from earlier depths, and earlier questions already generated for this parent in the current round. It returns the configured number of complete questions with source IDs. Every question must cite its parent; cross-branch citations are allowed.
4. Presents each generated question as the primary question of an answering case. The controller supplies that question's exact source pairs and ancestry. The agent returns the issued question ID, answer, evidence references or explicitly marked assumptions, and unresolved flag. Every issued question requires an answer; unresolved answers are retained.
5. Appends each resulting pair to the persistent record. At the next depth, the resulting pairs become the new frontier and the agent is asked for additional perspectives again.
6. At the configured depth, requests a synthesis covering every root. Each finding cites saved pair IDs and identifies implications for planning, execution or verification. Subsequent projections contain both the synthesis and the complete inquiry record.

The fixed perspectives are assumptions, evidence, alternatives and failure cases. They are complementary prompts; mathematical independence or semantic completeness is not asserted. Earlier questions help the agent distinguish later probes, but the validator cannot establish semantic novelty.

Only four new state keywords are needed: `inquiry_perspectives`, `inquiry_questions`, `inquiry_answers`, and `inquiry_synthesis`. The question and answer states loop over persisted cases. Further depths reuse those same states. Existing scratchpad notes remain mandatory for each accepted transition.

## Configuration and growth

`inquiry-definitions.json` holds the instructions, base schemas and configuration. New runs copy the configuration into their record. Changing the file affects new runs after module reload; it does not change an existing run's copied settings. This branch does not add command-line configuration flags.

| Parameter | Default | Meaning |
| --- | --- | --- |
| `root_question_count` | 3 | Number of initial questions, answered in original order |
| `questions_per_case` | 1 | Questions generated for each parent/perspective case |
| `max_depth` | 2 | Derivative rounds after the initial answers |
| `perspectives` | 4 | Fixed perspective instructions applied to every frontier pair |

The three numeric settings must be positive integers. With n root pairs, p fixed perspectives, q questions per case and d derivative rounds, no nominated extras, the pair count is n times the sum of (p times q)^k for k from 0 through d. The default yields 3 + 12 + 48 = **63 pairs**. Additional perspectives increase the count. These are experimental defaults, not an empirically selected optimum.

The request boundary ends each state call. This implementation does not create a clean model context or an independently answer-blind verifier. Omitting an answer from a later packet in the same conversation would not achieve that isolation. External retrieval, observation, or a separate-context factual check must be reported as such when actually performed.

## Concrete source matching

Suppose root `r0.p1` asks “How should the watchdog decide to start?” and its answer proposes checking whether the Codespace is stopped. Root `r0.p2` discusses the schedule.

| Case | Agent-generated primary question | Supplied answer context |
| --- | --- | --- |
| `r1.c1`, assumptions of `r0.p1` | What assumption about freshness of the status response is necessary for that decision? | Exact `r0.p1` Q&A and the request |
| `r1.c2`, evidence of `r0.p1` | What observation would distinguish a stopped Codespace from a failed status request? | Exact `r0.p1` Q&A and the request |
| An agent-nominated interactions case | What happens if two scheduled invocations both observe stopped before either sends start? | Exact `r0.p1` and `r0.p2` Q&As, selected in `source_pair_ids` |

Question `r1.c1.q1` gets an answer only when the return contains that exact ID. Its saved pair can then be the parent of a second-round case. That case sees the new Q&A and the original root as ancestry. The agent nominates perspectives for this new pair afresh; it is not simply told to run the next label against the original answer.

The example is illustrative. It makes no claim about the current Codespace service or the actual watchdog's behavior.

## Persistence and validation

The nonce record stores `inputs.inquiry.config`, `pairs`, `rounds`, and queue cursors. Every round keeps its nominations, cases, questions and answer-pair links. Repeated state keywords retain their latest accepted value in the normal input map, while the inquiry record preserves the full history.

Return schemas pin the ordered frontier IDs, current case ID, pending question ID, and allowed source IDs. They reject missing, reordered or duplicate frontier entries, references to unknown sources, missing parent citations, duplicate source IDs, and mismatched answers. Perspective names must be distinct within each parent's list, compared case-insensitively after trimming. A rejected input preserves the state, schema, queue and accepted history. Nonce replay returns the saved projection.

The controller's route selector receives the saved record, so cursor progression and depth transitions are determined by accepted persisted state. Queue indices address cases within the current state; they are not a replacement for keyword-based state dispatch.

All new runs have `inputs.inquiry`. Historical runs lacking it retain their old Q&A path and saved projections. The revised profile's historical empty-question route remains available only to those records. For new runs this document and `inquiry-definitions.json` supersede the old root question counts and skip instructions. The remaining semantic states, validation and scratchpad contracts continue to apply.

## Verification and example record

`workspaces/codespace-terminal-mcp/procedure-inquiry.test.mjs` exercises both normal alias entrypoints and the disk-backed Procedure API. Its fixtures cover both derivative rounds, nominations at both depths, cross-source references, multiple questions per case, retry/replay, wrong identifiers, omitted cases, retained context in planning, and legacy continuity.

`examples/inquiry-fixture.json` is an actual saved output of that integration test with 63 pairs and representative request packets. Its answers are explicitly synthetic. It establishes the traversal and binding behavior, not that this inquiry improves real task outcomes.

Run the Procedure tests from the repository root:

```sh
node --test workspaces/codespace-terminal-mcp/procedure*.test.mjs
```

To regenerate the fixture:

```sh
QA_CASCADE_EXAMPLE_PATH="$PWD/workspaces/2d-state-event-procedure-design/examples/inquiry-fixture.json" \
  node --test workspaces/codespace-terminal-mcp/procedure-inquiry.test.mjs
```

The experimental branch is intended for separate-checkout evaluation. The active MCP server must load this branch's code before its `@ Procedure` aliases use the new cascade; publishing the branch alone does not change the running server.
