# Sources and traceability — Issue #3 terminal SRS

Baseline: `main@93c00eedeb8b762b9bf224ea670782a63ec8e9b1`, observed 2026-11-03.

## Primary sources
- [Issue #3 instructions](https://github.com/BestNameYet/Terminals/issues/3): comment schema, nonce convention, stdout semantics, delegated extraction examples.
- [Generic Issue listener](../../.github/workflows/issue-comment-listener.yml): JSON parsing, registry selection, dispatch acceptance, event payload and nonce.
- [Issue workflow registry](../../.github/issue-workflow-registry.json): maps Issue #3 to the terminal workflow.
- [Issue #3 terminal workflow](../../.github/workflows/issue-3-comment-listener.yml): owner gating, admission validation, Bash invocation, limits, stdout commit/readback and job outcome.
- [Issue #3 comments](https://github.com/BestNameYet/Terminals/issues/3): submitted historical command bodies.
- [Persisted terminal results](../terminalruns/): command stdout records with original command echo.

## Related but separately specified
- [Shared-conversation extraction design](../extractor-srs-design/): downstream specialized workflow invoked through Issue #3; separate SRS and acceptance requirements.
- [RuntimeConfig Issue #10](../../.github/workflows/issue-10-runtimeconfig.yml): independent comment-triggered Node execution interface; not an Issue #3 contract.
- [Agent Execution Contract development comment](https://github.com/BestNameYet/Terminals/issues/4#issuecomment-6609907520): agent-level operating context, not a substitute for executable tests.

## Evidence rules
- Implementation claims: corroborate against pinned source, noting documented-but-unenforced requirements.
- Execution claims: inspect exact Actions run, originating Issue comment, committed result file and readback.
- Normative design decisions: explicitly label as proposed until approved; do not infer they are enforced.
- Verification: match acceptance criteria to tests and actual receipts; command submission alone is insufficient.

No root README.md or root AGENTS.md was present when this workspace was initialized.

## Issue #10 capability sources for proposed Issue #3 integration

- [Issue #10 instructions](https://github.com/BestNameYet/Terminals/issues/10): existing Node command contract and trigger lifecycle; note that its prose uses the stale \`js_path\` spelling.
- [Issue #10 execution workflow](../../.github/workflows/issue-10-runtimeconfig.yml): owner checks, regression gate, clone commit/push/readback, serialized Node run, execution receipt and artifact.
- [RuntimeConfig trigger validator](../RuntimeConfig/prepare-runtrigger.js): exact \`runpath\`/\`set\` and type/path validation; currently hardcodes Issue #10 source identity and clone name.
- [RuntimeConfig Node runner](../RuntimeConfig/runner.js): authoritative camelCase \`jsPath\`, \`args\` and child exit propagation.
- [Issue comment writer](../RuntimeConfig/issue-comment-writer/issue-comment-writer.js) and [template](../RuntimeConfig/issue-comment-writer/runtrigger.json): create/replace Issue comments and input contract.
- [Issue body writer](../RuntimeConfig/issue-body-writer/issue-body-writer.js) and [template](../RuntimeConfig/issue-body-writer/runtrigger.json): replace Issue body and input contract.
- [RuntimeConfig regression tests](../RuntimeConfig/prepare-runtrigger.test.js): parser, clone, authorization and runner test cases.

The proposed Issue #3 Node command envelope and requirements are normative design additions; no existing Issue #3 implementation or test result is represented as satisfying them.
