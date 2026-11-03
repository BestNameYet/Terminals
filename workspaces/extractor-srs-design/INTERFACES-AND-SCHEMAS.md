# External interfaces, schemas, serialization and example artifacts

**Document:** EXT-CONTRACT-001 | **Version:** 1.0 | **Normative companion to:** FINAL-SRS.md

## 1. CLI and workflow dispatch interface

The retained workflow ID is <code>.github/workflows/manual-dispatch.yml</code>. Proposed workflow_dispatch inputs:

```yaml
on:
  workflow_dispatch:
    inputs:
      request_json:
        description: "String containing a JSON request object (can be read from a local file)"
        required: false
        type: string
        default: ""
      target_url:
        description: "Legacy public ChatGPT share URL; use only when request_json is empty"
        required: false
        type: string
        default: ""
      write_path:
        description: "Legacy optional repository-relative output directory/template"
        required: false
        type: string
        default: ""
```

The YAML is an interface excerpt, not a complete runnable workflow. Input mode precedence SHALL be **exclusive**, not best effort. Empty request_json selects legacy only if target_url is nonempty. Nonempty request_json rejects either other nonempty legacy field. Missing both request_json and target_url fails. Canonical JSON input SHALL not accept unknown keys.

### Canonical caller file: request.json

```json
{
  "target_url": "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051?ogimg=plain",
  "write_path": "workspaces/shared-conversations/{share_uuid}/{run_id}-{run_attempt}",
  "request_id": "example-extract-20261103-01",
  "export_profile": "complete"
}
```

The supplied UUID is a syntactically plausible example, **not** an instruction to fetch or a claim of current page accessibility. The canonical default for omitted write_path is <code>workspaces/shared-conversations/{share_uuid}/{run_id}-{run_attempt}</code>; an explicitly provided empty string SHALL be treated as omission.

### Operator transports

A local JSON file SHALL be usable without adding it to Git. Valid GitHub CLI examples:

```bash
gh workflow run manual-dispatch.yml \
  -R BestNameYet/Terminals -r main \
  -f "request_json=$(cat request.json)"

jq -Rs '{request_json: .}' request.json |
  gh workflow run manual-dispatch.yml -R BestNameYet/Terminals -r main --json
```

The <code>jq -Rs</code> form constructs the **workflow inputs object**, in which request_json is a JSON string containing the entire request file. Passing the raw request file directly via <code>--json</code> would instead submit target_url, write_path, request_id, export_profile as workflow fields, which is *not* the proposed interface. Quoting protects query-string metacharacters. For multiline JSON, GitHub dispatch input length and action environment handling must be tested; never append raw unescaped content into GITHUB_ENV or GITHUB_OUTPUT line format.

Legacy mode:

```bash
gh workflow run manual-dispatch.yml \
  -R BestNameYet/Terminals -r main \
  -f 'target_url=https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051'
```

REST request body, sent via authenticated HTTPS POST to GitHub's dispatch endpoint (not directly to the share URL):

```json
{
  "ref": "main",
  "inputs": {
    "request_json": "{\"target_url\":\"https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051\",\"export_profile\":\"complete\"}"
  }
}
```

The dispatch caller must have the requisite GitHub Actions permission; the workflow must independently have repository contents publication authority. Request accepted is not extraction completed.

### Optional Issue #3 transport

The existing Issue #3 terminal's documented JSON request uses <code>runOn</code> ("$" or "gh"), <code>whatPrompt</code> and <code>forWhom</code>. The SRS does not redefine that JSON or assume actions:write is already available in the terminal workflow. A terminal-dispatched <code>gh workflow run</code> is an *optional adapter*, contingent on verified permission; it is not a second extraction runtime.

## 2. Canonical JSON request schema

The following is a proposed JSON Schema 2020-12 document. It constrains the file's semantic object; the workflow_dispatch transport still carries it as a string.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.invalid/schemas/chatgpt-extractor-request-v1.json",
  "title": "ChatGPT extractor request",
  "type": "object",
  "additionalProperties": false,
  "required": ["target_url"],
  "properties": {
    "target_url": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2048,
      "description": "Validated separately as an HTTPS chatgpt.com/share/UUID URL"
    },
    "write_path": {
      "type": "string",
      "maxLength": 240,
      "default": "workspaces/shared-conversations/{share_uuid}/{run_id}-{run_attempt}"
    },
    "request_id": {
      "type": "string",
      "pattern": "^[A-Za-z0-9._-]{1,128}$"
    },
    "export_profile": {
      "type": "string",
      "enum": ["complete"],
      "default": "complete"
    }
  }
}
```

The $id domain is intentionally nonoperational schema identity; it is **not** a hosting claim. URL, template syntax, length after expansion, allowed root and symlink checks are semantic validators beyond JSON Schema's type check. The schema itself is normative for structure, with versioned changes requiring updated tests.

## 3. Parsing and semantic rules

**Share URL:** New URL(input), protocol https:, exact hostname chatgpt.com, blank username/password and port, path matching a 36-character hyphenated hex UUID with /share/ prefix and optional trailing slash. URL fragment is not part of source identity and shall be rejected rather than invisibly carried; search parameters MAY be allowed but shall never contribute a path segment. After redirects, require the same allowlist.

**Destination:** Template language supports exactly <code>{share_uuid}</code>, <code>{run_id}</code>, <code>{run_attempt}</code>. Substitution values are validated and path-safe; the URL ID is lowercase. Literal slashes divide segments. Reject empty, ".", "..", encoded separator/traversal trick, backslash, absolute path, strange control characters, oversized path, unapproved directory root or symlink path. A configured explicit output path under workspaces/shared-conversations remains within that root. The template may be a valid literal without placeholders, but the collision policy prevents overwriting a prior distinct run.

**Control limits:** response HTML <=25 MiB; per request timeout 45 seconds; <=5 fetch iterations; Actions job timeout 15 minutes. Fetch may fail before those bounds due to GitHub network policy or ChatGPT restrictions.

**Decoder:** Parse only recognized string-literal payloads in React Router enqueue calls. Preserve indexed array types and keys, handle special sentinels/tagged values through a declared versioned mapping and explicit errors when unsupported. Memoize to avoid duplicate decode; do not execute HTML/JavaScript expressions. For JSON representation, supported native Date values are serialized to their canonical string with type diagnostics; out-of-JSON NaN/Infinity/special unknowns SHALL be encoded with explicit tagged records or fail rather than silently coercced to null. Recursion, reference depth and graph size shall be bounded. A cyclic decoded object not representable in output JSON is a strict complete-profile error unless a declared lossless ID-reference encoding is implemented and tested.

## 4. JSON output: raw and source-linear

### conversation-raw.json

The root shall be:

```json
{
  "schema": "chatgpt.shared-conversation.raw.v1",
  "source_url": "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051",
  "decoder": {"name": "react-router-indexed", "version": "1.0"},
  "conversation": {
    "conversation_id": "illustrative-conversation-id",
    "title": "Illustrative title",
    "mapping": {},
    "linear_conversation": [{"id": "node-1", "message": null}]
  }
}
```

The example is illustrative and intentionally not a valid complete extraction (its mapping is empty). The <code>conversation</code> field retains all available source fields for which fidelity-safe JSON representation is supported; it is not the selected-text projection.

### linear-conversation.json

```json
{
  "schema": "chatgpt.linear-conversation.v1",
  "source_url": "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051",
  "conversation_id": "illustrative-conversation-id",
  "title": "Illustrative title",
  "source_node_count": 2,
  "message_count": 1,
  "records": [
    {
      "index": 0,
      "node_id": "node-1",
      "parent": null,
      "record_kind": "message",
      "role": "user",
      "author_name": null,
      "channel": null,
      "recipient": null,
      "create_time": null,
      "update_time": null,
      "content_type": "text",
      "status": null,
      "end_turn": null,
      "model_slug": null,
      "derived_text": "Example user text",
      "raw_node": {"id":"node-1","message":{"author":{"role":"user"},"content":{"parts":["Example user text"]}}}
    },
    {
      "index": 1,
      "node_id": null,
      "parent": null,
      "record_kind": "no_message",
      "role": null,
      "author_name": null,
      "channel": null,
      "recipient": null,
      "create_time": null,
      "update_time": null,
      "content_type": null,
      "status": null,
      "end_turn": null,
      "model_slug": null,
      "derived_text": null,
      "raw_node": {"id": "node-2", "message": null}
    }
  ]
}
```

Schema invariants:
- <code>records.length === source_node_count</code>, and the sequence of index fields is exactly 0..source_node_count-1.
- <code>message_count</code> counts records with nonnull raw message and is not equal by definition to array length.
- <code>record_kind</code> is one of message, no_message, malformed; malformed nodes still preserve the source index and raw data if safely serializable.
- <code>raw_node</code> must preserve complete representable source node fields; normalization is additive, not a substitute.
- Duplicate node IDs are not deduplicated; diagnostics records them.
- <code>derived_text</code> is a string only when supported textual parts exist; not generated for images, tools, code objects or nontext content.
- Metadata not explicitly normalized remains in raw_node.

## 5. Selected visible branch contracts

### conversation.json

Preserve compatibility with the already implemented schema <code>chatgpt.shared-conversation.visible.v1</code>:

```json
{
  "schema": "chatgpt.shared-conversation.visible.v1",
  "source_url": "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051",
  "counts": {"user": 1, "commentary": 0, "final": 1},
  "messages": [
    {"role": "user", "channel": null, "text": "Example user text"},
    {"role": "assistant", "channel": "final", "text": "Example answer"}
  ]
}
```

The chronology of <code>messages</code> is reversed parent ancestry from current_node and is **not** based on source-linear indices. A source-linear representation can contain a different set/length of records without violating this schema. The count sum equals messages.length; every role/channel combination is valid; every text is nonempty; at least one user and one assistant final are present.

### conversation.md

Selected text Markdown shall begin with a Conversation heading, use distinct **You**, **Assistant · Commentary**, and **Assistant** message labels, place user lines as blockquotes and retain current-builder-compatible assistant formatting. A new user begins a new Markdown turn. Markdown label totals must match visible JSON. If any exact formatting rule changes, increment the renderer compatibility version and change golden fixture expectations in an explicit review.

## 6. diagnostics.json

Required top-level structure:

```json
{
  "schema": "chatgpt.extractor.diagnostics.v1",
  "decoder": {"name": "react-router-indexed", "version": "1.0"},
  "discovery": {"script_candidates": 1, "payload_candidates": 1, "conversation_candidates": 1},
  "counts": {
    "serialization_slots": 0,
    "mapping_nodes": 0,
    "linear_nodes": 0,
    "linear_messages": 0,
    "ancestry_nodes": 0,
    "selected_visible_messages": 0,
    "nontext_parts": 0,
    "excluded_visible_nodes": 0
  },
  "role_distribution": {},
  "channel_distribution": {},
  "content_type_distribution": {},
  "missing_messages": [],
  "malformed_nodes": [],
  "duplicate_ids": [],
  "excluded_visible_nodes": [],
  "linear_vs_selected": {
    "linear_only_ids": [],
    "selected_only_ids": [],
    "order_difference": null,
    "comparison_available": false
  },
  "warnings": []
}
```

Use actual counts and source diagnostics; zeros and empty fields above are field-shape examples, not acceptable false values for a completed nonempty export. Arrays contain stable source indices/IDs and reason codes when applicable. <code>comparison_available</code> is false when either representation lacks sufficient node IDs; never invent unknown identity matches.

## 7. receipt.json and execution.json

**receipt.json** carries content provenance, method IDs, sizes and digests; its declared <code>files</code> object enumerates six immutable data artifacts: response.html, conversation-raw.json, linear-conversation.json, conversation.json, conversation.md and diagnostics.json. It does not include receipt.json or execution.json to avoid recursion. Exact bytes include UTF-8, BOM/newlines, and formatting as written.

```json
{
  "schema": "chatgpt.extractor.receipt.v1",
  "request_id": "example-extract-20261103-01",
  "run_id": "123456789",
  "run_attempt": 1,
  "source_revision": "<actual-40-hex-git-sha>",
  "source_url": "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051",
  "final_url": "https://chatgpt.com/share/6ae8ca4c-fde8-83e8-991c-f6beaed35051",
  "share_uuid": "6ae8ca4c-fde8-83e8-991c-f6beaed35051",
  "http_status": 200,
  "methods": ["source-linear-v1", "selected-parent-chain-v1"],
  "write_path": "workspaces/shared-conversations/6ae8ca4c-fde8-83e8-991c-f6beaed35051/123456789-1",
  "counts": {"linear_nodes": 2, "selected_visible_messages": 2},
  "files": {
    "response.html": {"bytes": 0, "sha256": "<actual-64-hex>"},
    "conversation-raw.json": {"bytes": 0, "sha256": "<actual-64-hex>"},
    "linear-conversation.json": {"bytes": 0, "sha256": "<actual-64-hex>"},
    "conversation.json": {"bytes": 0, "sha256": "<actual-64-hex>"},
    "conversation.md": {"bytes": 0, "sha256": "<actual-64-hex>"},
    "diagnostics.json": {"bytes": 0, "sha256": "<actual-64-hex>"}
  }
}
```

This is a nonexecutable **shape illustration**; all sizes and hashes must be measured in a real export.

**execution.json** is a pre-publication source artifact, not a document that magically records its containing commit. Example:

```json
{
  "schema": "chatgpt.extractor.execution.v1",
  "request_id": "example-extract-20261103-01",
  "run_id": "123456789",
  "run_attempt": 1,
  "stage": "OUTPUTS_VALIDATED",
  "precommit_status": "ready_for_publication",
  "stage_results": {
    "input_validation": "passed",
    "fixture_regression": "passed",
    "capture": "passed",
    "linear_projection": "passed",
    "visible_projection": "passed",
    "local_integrity": "passed"
  },
  "errors": []
}
```

After publication, a **separate Actions final attestation** records the remote commit SHA, the run ID/attempt, every remote path and hash, and final VERIFIED or failure state. A Git SHA cannot be embedded as a self-consistent claim about the exact commit containing the SHA itself; do not force such a circular requirement.

## 8. Final attestation external to the data commit

A machine-readable Actions step-summary attachment or dedicated run artifact shall contain:

```json
{
  "schema": "chatgpt.extractor.final-attestation.v1",
  "run_id": "123456789",
  "run_attempt": 1,
  "published_commit_sha": "<actual SHA after push>",
  "remote_ref": "refs/heads/main",
  "verification": "VERIFIED",
  "paths": [
    {"path": "workspaces/shared-conversations/<uuid>/<run-id>-1/response.html", "sha256": "<actual hash>", "matched_remote_bytes": true}
  ]
}
```

The paths array shown is **truncated as a schema example only**; a valid complete-profile final attestation must list and verify **all eight committed files**. If remote fetch/compare fails after a push, the final result is PUBLISHED_UNVERIFIED or FAILED and must not assert matched_remote_bytes.

## 9. Compatibility and versioning

Schema identifiers in this document are design contracts. No output schema beyond the existing visible-v1 format is claimed to be already deployed. Any change to source decoding, normalization, output field types, ordering rules or Markdown fidelity requiring consumers to update shall increment a schema/decoder version, add fixtures and document differences. Explicit capability discovery may choose a compatible decoder by known structure, but **may not silently substitute a different extraction method** when mandatory linear or selected structures are missing.
