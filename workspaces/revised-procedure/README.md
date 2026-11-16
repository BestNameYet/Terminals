# Revised Terminals Procedure

Use Terminals MCP with `runOn` set to `@`.

| Operation | whatPrompt |
| --- | --- |
| Start | `Procedure -r` |
| Replay | `Procedure -r <nonce>` |
| Submit | `Procedure -r <nonce> {"verbatim_request":"Design a report"}` |

Use the nonce from the start response and the semantic keyword in the active projection. Submit one JSON object per call. Completed runs replay their saved receipt. Revised runs have their own nonce storage under the server's procedure state directory.

The first observation pass is read-only. Submit an empty question list to proceed directly to the desired state when no question could change scope, approach, or verification. Plan steps declare earlier prerequisites through `depends_on`. Change-to-action associations come from accepted agent actions.

A failed preflight or requested revision returns the run to `execution_procedure` with structured discrepancies. The controller retains the previous plan and simulation and issues a new simulation after the revised plan is accepted. Execution becomes available after preflight clears. The final diagnostic records actual outcomes against acceptance conditions, including failures or unverified items.

The workspace adapts the keyword-addressed state handlers, stored projections, return schemas and bindings from the original procedure workspace. It shares the original schema validator and its installed dependency.
