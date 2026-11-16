# FSM design evidence-mapping protocol (Applications / Terminals)

**Version:** 1.0 • **Prepared:** 2026-11-16 • **Research procedure nonce:** `334a93b7-adf6-4305-857f-a24ce5d84203`

## Research objective and boundary

Map, critically compare, and extract design lessons from open-source JavaScript/TypeScript/Node.js and Python event-driven FSM implementations, papers and specifications, engineering articles, and developer experiences. The application target is [the saved @Procedure design review](../reviews/event-driven-function-pointer-fsm-review.md). This research phase produces **design evidence and recommendations**, not an implementation change.

The central questions are: How do implementations select event handlers? How is the transition graph represented? How are guards, effects and entry/exit hooks separated? What run-to-completion and queueing semantics prevent reentrancy? How is persisted state resumed under a stable identity? Which guarantees survive concurrent requests or crashes? Which design and testing approaches improve the existing nonce-persisted @Procedure without unnecessary complexity?

## Methods and rationale

Use a **systematic mapping study** to classify implementation patterns, combined with a **multivocal literature review** for practical evidence and an **implementation-centric code audit** for high-priority candidates. Record search provenance. Do not treat popularity as proof of correctness.

Primary methodological anchors:
- Petersen et al., *Guidelines for conducting systematic mapping studies in software engineering: An update* (2015), https://doi.org/10.1016/j.infsof.2015.03.007
- *On the performance of hybrid search strategies for systematic literature reviews in software engineering* (2020), https://doi.org/10.1016/j.infsof.2020.106294
- *Guidelines for the search strategy to update systematic literature reviews in software engineering* (2020), https://doi.org/10.1016/j.infsof.2020.106366
- Wohlin-style backward and forward citation snowballing, initially one wave from seminal and relevant primary works.

## Quantified future research program

These are **planned minimums**, NOT results already obtained:

| Dimension | Future minimum | Measurement |
|---|---:|---|
| Candidate records from all discovery channels | **120** | Unique URL and search provenance; raw pre-dedup counts separately |
| Deduplicated candidates title/abstract/README screened | **80** | Each explicit include/exclude decision with reason |
| Open-source FSM repos examined by documentation | **24** | **12 JS/TS**, **12 Python** minimum |
| High-priority repositories source-code deep inspected | **12** | At least 6 JS/TS, 6 Python; actual dispatch/persistence files |
| Peer-reviewed academic/formal papers | **12** | At least 4 empirical methodology/design and 4 formal semantics |
| Engineering/blog/tutorial articles | **15** | At least 8 independent authors or organizations |
| Developer forum/issue/discussion threads | **20** | At least 6 distinct projects or communities |
| Standards / authoritative primary specs | **5** | Distinct standards/seminal primary designs; no duplicates of papers |
| Independently distinguishable design patterns | **8** | Every pattern with two distinct evidential source types when possible |
| Counterexamples and negative-evidence cases | **6** | Concrete bug/limitation, no speculation; resolution status recorded |
| Reproduction tests/prototypes | **6** | Run after code-access setup; preserve commands/results |

Cross-cutting diversity quotas:
- **Language:** approximately half JS/TS and half Python among core libraries; both represented in source-code audits.
- **Architecture:** table-driven, function-pointer dispatch, state handlers, actor/mailbox, hierarchical statecharts, event sourcing, DB-persisted workflows, contract/model checking.
- **Setting:** Node backend, frontend/embedded crossover, asyncio/async server, business workflow, conversational agent, robotics/hardware, durable agent.
- **Age/maintenance:** historical seminal designs, established implementations and recent 2023–2026 updates.
- **Perspective:** positive usage documentation and adverse issues/caveats; at least 25% of design arguments supported by counterexamples or known limits.
- **Source independence:** no one maintainer, vendor, library family, or blog supplies more than 25% of the final architecture evidence portfolio.

No minimum quotas should be silently reduced when a category proves sparse; instead disclose shortfalls and continue finding alternative sources.

## Discovery channels and literal query templates

1. **GitHub repositories / source:** `"finite state machine" language:JavaScript`; `"state machine" language:TypeScript`; `"finite state machine" language:Python`; `"statechart" language:Python`; `"event driven" "state machine" language:Python`; inspect linked packages and their tests.
2. **Package registries:** npm `state machine`, `statechart`, `fsm`, `actor`; PyPI `statemachine`, `transitions`, `automaton`, `statechart`. Use registry data only as discovery until upstream source is identified.
3. **Academic indexes:** Google Scholar, Crossref, ACM Digital Library, IEEE Xplore, Semantic Scholar, arXiv using `("statechart" OR "finite state machine") AND ("event driven" OR "run to completion") AND (testing OR concurrency OR persistence)`, plus `systematic mapping state machines software engineering`.
4. **Formal standards:** W3C SCXML, seminal Harel statecharts, formal run-to-completion semantics, relevant UML state machine semantics if comparison requires it.
5. **Engineering literature:** `event driven state machine function pointer callbacks design`, `hierarchical state machine entry exit actions`, `XState persistence event replay`, `python transitions asynchronous queued`.
6. **Community evidence:** GitHub issues/discussions within shortlisted projects, Stack Overflow, Reddit programming/Python/Node, official maintainer forums. Record thread question, date, counterexample, maintainers' resolution if confirmed, and version.
7. **Citation and dependency chaining:** follow references/citations, linked related libraries, architecture documentation and source imports. Deduplicate by canonical repo or DOI and note when multiple sources discuss the same underlying issue.

Use two distinct query strategies (broad discovery and failure/persistence-focused), plus one backward and forward snowballing wave. Preserve search date, exact query, channel and screen result. Re-run in a new dated research batch rather than silently overwrite old results.

## Selection / exclusion / appraisal

Include publicly accessible code or primary implementation documentation for a general-purpose FSM, statechart, actor-based transition system, or clearly applicable persisted workflow. Mark a repository **candidate** until license is independently verified; public code does not automatically imply an open-source license. Exclude unrelated ML uses of "state-of-the-art", duplicate mirrors, pure visualizers with no execution logic (except as tooling comparator), undocumented claims and anonymous copy sites.

Record for each candidate: canonical source URL, source type, language, category, last relevant upstream revision/commit when observed, license and verification status, event envelope, state/event matching, pointer/handler registration, guards/actions, entry/exit, callback reentrancy, async sequencing, queue scope, persisted snapshot/replay, crash atomicity, versioning, idempotency, traceability, tests, limitations, and `@Procedure` fit.

Evidence grades:
- **A — inspected implementation source and test** (specific path/commit/behavior)
- **B — inspected primary repository docs or formal primary specification**
- **C — issue report, maintainer explanation, scholarly secondary analysis**
- **D — blog/forum claim or analyst inference not validated against code**

An issue report demonstrates an observed claim from a contributor, **not** a verified bug in the current release. Never promote C/D to A without replication or implementation evidence.

Score fit separately from reliability on 0–3 each: (1) state/event semantics, (2) deterministic handler registry, (3) nonce-like independent instances, (4) persistence/recovery, (5) serialized concurrency, (6) schema and guards, (7) observability and graph tests, (8) implementation complexity. Record every rating explanation. Recommend adopting a pattern only when it improves one named @Procedure invariant or identified defect.

## Saturation, auditability and completion

Continue collecting in batches of 10–15 screened sources until the **volume and diversity thresholds are reached** and two successive batches each contribute fewer than 10% novel architectural patterns. If the quota cannot be reached, state it as incomplete rather than extrapolating; a reviewed seed catalog is not a full systematic literature search. Run deep-source verification for shortlisted 12 projects independently of discovery counts. Distinguish source claims from executable reproductions and include negative results.

Keep three versioned outputs: protocol (this file); [seed source catalog](fsm-open-source-source-catalog.json); [design impact report](fsm-evidence-comparison.md). Validate JSON, count unique URLs by category, inspect generated files after GitHub write, and tie research findings to @Procedure change IDs. A research **design phase** is complete when these artifacts and the procedure's matching evidence review are verified. The prospective 120-source program is a separate, expandable research target.

## Current initial survey — status

At preparation, **13 JavaScript/TypeScript and 14 Python repository documentation files** had been directly retrieved in the initial core survey, plus two agent-oriented Python comparators. Additional source code, standards and issue reports were examined. These are **seed study results**, not proof that the 120-source mapping program or all code-level inspections have been completed.
