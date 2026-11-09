# Remaining 210 canonical rewrite pass

Scope: every record previously marked not_expressible in ../function-rewrites-10pct/rewrites.json, preserving order, pinned identity, original source and arguments. The prior 379 candidates are untouched.

The only canonical action names are MAP(target,mapping_function) and MUTATE(target,new_state). MUTATE may compose with MAP. A MAP never knowingly contains an unresolved call or expression-level mutation. Such expressions remain explicit unresolved values/operations linked to deferred questions. Return, throw, break and continue are completion records, not events.

Supporting notation records lexical binding aliases, parameter signatures, block/loop/branch/try control structure, lazy behavior, result projections and source spans. It is a candidate serialization, not an approved runtime. Per-function questions state the unresolved contracts; no semantic equivalence is asserted. In particular, binding frame invocation, getters/proxies, object identity, async completion and call effects require resolution. Full original source is retained so unsupported behavior is not silently omitted.

rewrites.json contains one partial rewrite per selected function, including questions. questions.json groups reserved questions across the whole pass. summary.json and verification.json distinguish complete iteration, partial rewrites and verified equivalents. index.json provides compact per-function status. Generator and fixture tests are included for reproducibility. Source functions are never executed.

Acceptance: exactly 210 unique source identities in original order; every source string retained; parameter lists preserved; only well-shaped MAP/MUTATE actions; mapping function syntax parses; no fabricated RETURN/THROW events; every unresolved expression or control convention has a question record. Structural verification does not prove semantic equivalence.
