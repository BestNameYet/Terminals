# Primary sources and evidence

## Terminals Issue #4 — all five comments

1. [6601504904](https://github.com/BestNameYet/Terminals/issues/4#issuecomment-6601504904) — StateMachines implementation, evidence, comparisons and SRS.
2. [6601564263](https://github.com/BestNameYet/Terminals/issues/4#issuecomment-6601564263) — IssueStack/StateMachines implementation requirements and regression evidence.
3. [6601890052](https://github.com/BestNameYet/Terminals/issues/4#issuecomment-6601890052) — StateMachines end-to-end flow.
4. [6602365561](https://github.com/BestNameYet/Terminals/issues/4#issuecomment-6602365561) — proposed Terminals dispatch/selected-branch SRS.
5. [6602452432](https://github.com/BestNameYet/Terminals/issues/4#issuecomment-6602452432) — proposed Terminals direct-linear SRS.

All source bodies are preserved verbatim in [sources/issue-4-comments.json](sources/issue-4-comments.json).

## Source files inspected

- [StateMachines workflow](https://github.com/BestNameYet/StateMachines/blob/main/.github/workflows/chatgpt-share-export.yml), inspected blob `1733ae396b267e6ce29a81d51f58873c9593f3b2`.
- [StateMachines Node parser](https://github.com/BestNameYet/StateMachines/blob/main/scripts/chatgpt-share-extract.js), inspected blob `1f7c65762cdc83820b536ac6d3fad8a9a444da8c`.
- [StateMachines old linear extractor](https://github.com/BestNameYet/StateMachines/blob/main/untrusted%20AI/extract-shared-chat.js), inspected blob `b3d768392efad6e8d7453c94a547ea0ceb82bc39`.
- [StateMachines linear inspection projection](https://github.com/BestNameYet/StateMachines/blob/main/.github/workflows/inspect-current-shared-chat.yml).
- [IssueStack workflow](https://github.com/BestNameYet/IssueStack-/blob/main/.github/workflows/chatgpt-share-to-conversation.yml), inspected blob `29ed84e3e9dbd5d565b953eaf8be7c0d5b018b11`.
- [IssueStack Node parser](https://github.com/BestNameYet/IssueStack-/blob/main/workspaces/chatgpt-share-html-extractor/build-shared-conversation.js), inspected blob `1f7c65762cdc83820b536ac6d3fad8a9a444da8c`.
- [Terminals manual dispatch stub](https://github.com/BestNameYet/Terminals/blob/main/.github/workflows/manual-dispatch.yml).
- [Terminals Issue #3 terminal workflow](https://github.com/BestNameYet/Terminals/blob/main/.github/workflows/issue-3-comment-listener.yml), inspected blob `e74e419033cbddfc791aea77a4091342ff36119e`.
- [Terminals Issue #3 input contract](https://github.com/BestNameYet/Terminals/issues/3).

**Limits:** Issue #4's reported workflow runs were not rerun during this documentation work. The Terminals root README.md, AGENTS.md and config/file-metadata.json were not found at inspected paths. No claim is made that Terminals already has a functional extractor.
