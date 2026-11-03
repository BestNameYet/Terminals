#!/usr/bin/env node
"use strict";

/**
 * TERM-LINEAR-EXTRACT-SRS-001 — input parsing and validation only.
 * Node.js 20+, no third-party dependencies, no network calls.
 *
 * Dispatch inputs (exact keys):
 *   share_url                 required string
 *   write_path                optional string; default template below
 *   request_id                optional string; generated deterministically from run ID
 *   include_metadata          optional boolean or "true"/"false" (default true)
 *   include_raw_conversation  optional boolean or "true"/"false" (default true)
 *
 * CLI forms:
 *   node chatgpt-linear-input.js --inputs-json /path/dispatch-inputs.json --run-id 123
 *   node chatgpt-linear-input.js --share-url https://chatgpt.com/share/<uuid> \
 *      [--write-path 'workspaces/chatgpt-linear-exports/{share_uuid}/{run_id}'] \
 *      [--request-id id] [--include-metadata true|false] \
 *      [--include-raw-conversation true|false] [--run-id 123]
 *
 * If --run-id is not specified, GITHUB_RUN_ID is used. It is required to
 * resolve a run-isolated destination. No values are passed to shell/eval.
 */
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_WRITE_PATH = "workspaces/chatgpt-linear-exports/{share_uuid}/{run_id}";
const OUTPUT_ROOT = "workspaces/chatgpt-linear-exports";
const INPUT_KEYS = Object.freeze([
  "share_url", "write_path", "request_id", "include_metadata", "include_raw_conversation"
]);
const CLI_FLAGS = Object.freeze({
  "--share-url": "share_url",
  "--write-path": "write_path",
  "--request-id": "request_id",
  "--include-metadata": "include_metadata",
  "--include-raw-conversation": "include_raw_conversation"
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

class InputValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "InputValidationError";
    this.code = code;
  }
}
function fail(code, message) { throw new InputValidationError(code, message); }
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonemptyString(value, key, maximum) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum ||
      value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) {
    fail("INVALID_" + key.toUpperCase(), `${key} must be a nonempty, trimmed string of at most ${maximum} characters without control characters`);
  }
  return value;
}
function readBoolean(value, key, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  fail("INVALID_BOOLEAN", `${key} must be true or false (boolean or lowercase string)`);
}
function parseShareUrl(input) {
  const raw = nonemptyString(input, "share_url", 2048);
  let parsed;
  try { parsed = new URL(raw); } catch { fail("INVALID_SHARE_URL", "share_url is not a valid URL"); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "chatgpt.com" ||
      parsed.username || parsed.password || parsed.port || parsed.hash) {
    fail("INVALID_SHARE_URL", "share_url must use HTTPS on chatgpt.com, with no credentials, port or fragment");
  }
  const match = /^\/share\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i.exec(parsed.pathname);
  if (!match || !UUID.test(match[1])) {
    fail("INVALID_SHARE_URL", "share_url path must be /share/<UUID> with an optional trailing slash");
  }
  // A query string is allowed (e.g. ?ogimg=plain), but never forms part of share_uuid.
  const shareUuid = match[1].toLowerCase();
  return { share_uuid: shareUuid, share_url: parsed.href };
}
function validateRunId(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    fail("INVALID_RUN_ID", "run_id or GITHUB_RUN_ID is required");
  }
  const id = String(value);
  if (!/^[1-9][0-9]{0,19}$/.test(id)) {
    fail("INVALID_RUN_ID", "run_id must be a positive decimal GitHub Actions run identifier (up to 20 digits)");
  }
  return id;
}
function validateDestinationTemplate(template, context) {
  const source = nonemptyString(template, "write_path", 240);
  if (source.startsWith("/") || source.includes("\\") || source.includes("//") || source.endsWith("/")) {
    fail("INVALID_WRITE_PATH", "write_path must be a normalized repository-relative POSIX path");
  }
  // Allow exactly the two declared template tokens; no substitutions using eval.
  const unknownTemplate = source.replaceAll("{share_uuid}", "").replaceAll("{run_id}", "");
  if (/[{}]/.test(unknownTemplate)) fail("INVALID_WRITE_PATH", "write_path has an unknown template placeholder");
  if (!source.split("/").some(segment => segment === "{run_id}" || segment === context.run_id)) {
    fail("NOT_RUN_ISOLATED", "write_path must contain a complete {run_id} path segment (or the current run ID)");
  }
  const resolved = source.replaceAll("{share_uuid}", context.share_uuid).replaceAll("{run_id}", context.run_id);
  const components = resolved.split("/");
  if (!components.every(part => SEGMENT.test(part) && part !== "." && part !== "..")) {
    fail("INVALID_WRITE_PATH", "write_path contains invalid or traversal path segments");
  }
  if (components.length < 4 || components[0] !== "workspaces" ||
      components[1] !== "chatgpt-linear-exports") {
    fail("WRITE_PATH_OUT_OF_SCOPE", `write_path must be within ${OUTPUT_ROOT}/ and include a run-specific subdirectory`);
  }
  if (resolved.length > 240 || path.posix.normalize(resolved) !== resolved) {
    fail("INVALID_WRITE_PATH", "expanded write_path is invalid or exceeds 240 characters");
  }
  return { write_path_template: source, write_path: resolved };
}
function validateInputs(raw, options = {}) {
  if (!isObject(raw)) fail("INVALID_INPUT", "dispatch inputs must be a JSON object");
  const unexpected = Object.keys(raw).filter(k => !INPUT_KEYS.includes(k));
  if (unexpected.length) fail("UNKNOWN_INPUT", `unknown dispatch input(s): ${unexpected.join(", ")}`);

  const {share_uuid, share_url} = parseShareUrl(raw.share_url);
  const run_id = validateRunId(options.run_id ?? process.env.GITHUB_RUN_ID);
  const write = validateDestinationTemplate(
    raw.write_path === undefined || raw.write_path === "" ? DEFAULT_WRITE_PATH : raw.write_path,
    {share_uuid, run_id}
  );
  const request_id = raw.request_id === undefined || raw.request_id === ""
    ? `linear-extract-${run_id}`
    : nonemptyString(raw.request_id, "request_id", 128);
  if (!REQUEST_ID.test(request_id)) {
    fail("INVALID_REQUEST_ID", "request_id must start with a letter or digit and contain only letters, digits, '_' or '-' (max 128)");
  }
  return Object.freeze({
    schema: "terminals.chatgpt-linear-input.v1",
    share_url, share_uuid, run_id, request_id,
    ...write,
    include_metadata: readBoolean(raw.include_metadata, "include_metadata", true),
    include_raw_conversation: readBoolean(raw.include_raw_conversation, "include_raw_conversation", true)
  });
}
function parseCli(argv) {
  const supplied = Object.create(null);
  let inputFile;
  let runId;
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      fail("INVALID_CLI", `missing value for ${flag || "argument"}`);
    }
    if (seen.has(flag)) fail("DUPLICATE_FLAG", `duplicate CLI flag: ${flag}`);
    seen.add(flag);
    if (flag === "--inputs-json") inputFile = value;
    else if (flag === "--run-id") runId = value;
    else if (Object.hasOwn(CLI_FLAGS, flag)) supplied[CLI_FLAGS[flag]] = value;
    else fail("UNKNOWN_FLAG", `unrecognized CLI flag: ${flag}`);
  }
  if (inputFile !== undefined) {
    if (Object.keys(supplied).length) fail("INVALID_CLI", "--inputs-json cannot be combined with individual input flags");
    const absolute = path.resolve(inputFile);
    const size = fs.statSync(absolute).size;
    if (size > 16384) fail("INPUT_TOO_LARGE", "input JSON file exceeds 16 KiB");
    let data;
    try { data = JSON.parse(fs.readFileSync(absolute, "utf8")); }
    catch (e) { fail("INVALID_JSON", `cannot parse inputs JSON: ${e.message}`); }
    return validateInputs(data, {run_id:runId});
  }
  return validateInputs(supplied, {run_id:runId});
}

if (require.main === module) {
  try {
    const validated = parseCli(process.argv.slice(2));
    process.stdout.write(JSON.stringify(validated, null, 2) + "\n");
  } catch (error) {
    const code = error instanceof InputValidationError ? error.code : "INPUT_FAILURE";
    process.stderr.write(JSON.stringify({ok:false, code, error:error.message}) + "\n");
    process.exitCode = 2;
  }
}
module.exports = { DEFAULT_WRITE_PATH, OUTPUT_ROOT, InputValidationError,
  parseShareUrl, validateDestinationTemplate, validateInputs, parseCli };
