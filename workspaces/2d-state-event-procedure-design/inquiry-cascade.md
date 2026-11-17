# Array-wise inquiry cascade revision

**Status:** Approved implementation plan for Procedure and Procedure -r.
**Compatibility:** New runs use inquiry schema version 2. Saved version-1 runs and runs without an inquiry record retain their existing routes and persisted projections.

## Design

The procedure runs a fixed set of stage transitions over whole arrays. Array order is the canonical presentation order; identifiers and explicit parent links determine identity and association.

For the default supplied Base-0 mode, the sequence is:

1. Present the six configured Base-0 questions and accept all six answers in one transition.
2. For every parent Q&A and every active perspective row, generate the configured perspective questions in one array. The default is four perspectives and one question per perspective.
3. After accepting that question array, present its exact members with answer inputs and accept all answers in one array.
4. Synthesize the perspective answers into one statement per parent Q&A.
5. Generate exactly one final question per parent using the parent Q&A and its synthesis.
6. After accepting the final-question array, present those exact questions with answer inputs and accept all answers in one array.
7. If a deeper level is configured, use the completed final Q&A records as the next parent frontier and repeat steps 2–6. The default depth is one perspective/synthesis/final-question level.

Generated Base-0 mode adds one question-generation stage before step 1. It selects labeled topic slots from a static catalog, chooses an exact configured count between five and seven before the agent transition, and assigns each question ID before generating the text. Supplied mode is the default and skips that generator stage.

Each return schema is constructed when its stage is entered. A question-generation schema contains only the questions for that stage. Its accepted return is saved unchanged before an answer projection is built. That answer schema contains only those accepted questions and their corresponding answer inputs. Synthesis and final-question schemas are likewise derived only from the current parent array. No future-stage answer slots or generator fields are included.

## Configuration and catalogs

The new src/inquiry-catalog.mjs owns separate static arrays for supplied Base-0 questions, generated Base-0 topic slots, perspectives, category labels, question-prompt variants, and final-question instructions. Separately declared count values feed config objects that reference those arrays.

The default configuration is six supplied Base-0 questions, four perspectives, one question per perspective, one final question per parent, and one derivative level. Configuration can change the Base-0 mode and count, perspective count, per-perspective question counts, pool selection modes, sampling scope, replacement policy, maximum depth, and seed.

The new src/question-generator-prompt.mjs exports the shared buildQuestionGeneratorPrompt(config) function. Every question-generation stage calls it with only that stage's task wording, selected generator rows, count, style, pool rule, lineage rule, and return rule. Changing this function changes the common presentation of generated questions without editing individual state handlers.

A stage manifest freezes selected topic, perspective, generator-prompt, and category IDs; labels; ordering; configured counts; sampling policy; and seed. The manifest is saved with the nonce record before the question projection is returned. Retries reuse the same manifest and question IDs. A configuration that requests more entries than a pool supports is rejected before the agent transition.

## Identity, lineage, and validation

Every question has a stable question ID. Every answer echoes that ID and the exact question text. Derivative questions and answers also carry the parent Q&A ID, perspective or category IDs and labels, and source-anchor IDs. Synthesis records carry their parent Q&A ID and the IDs of the perspective questions they combine. Final questions carry both their parent Q&A ID and synthesis ID. Array position never establishes these relationships.

Question IDs are assigned before generation from the run ID, depth, parent Q&A ID, generator/perspective ID, and selected catalog slot ID. Root IDs use the configured Base-0 slot ID. Synthesis and final-question IDs use their parent IDs.

Validation checks the exact current schema, required array cardinality, stable IDs, labels, echoed question text, and complete ID coverage. The controller associates answers and parents by IDs. It does not add a separate semantic-review gate; exploration quality remains the agent's responsibility.

## Implementation plan

1. Add static catalogs, independent count constants, default config objects, and the shared question-prompt builder.
2. Extend inquiry-definitions.json with the version-2 stage instructions and base schemas while retaining version-1 definitions for saved runs.
3. Refactor src/inquiry.mjs to initialize and freeze version-2 manifests, derive just-in-time schemas, save each full returned array, and transition by stage and configured depth. Preserve the existing version-1 handlers and routing.
4. Update both iterator initializers to create version-2 inquiry records keyed by the procedure nonce. Update the revised profile's empty-clarification route so a new inquiry run still enters its configured Base-0 stage; keep the historical route unchanged.
5. Replace the old sequential-cascade description with the versioned design and record the profile-specific source bindings.
6. Review the final diff, preserve unrelated untracked workspace data, and commit only task files on the feature branch.

## Compatibility and scope

The original and revised iterators share the inquiry controller, so the batched stage implementation is shared. Existing top-level planning, execution, simulation, and diagnostic states keep their current keyword transitions. Version-1 inquiry records continue through the old case/question cursors; records without inputs.inquiry keep their historical path. Only new runs use the new catalog and array-wise stages.
