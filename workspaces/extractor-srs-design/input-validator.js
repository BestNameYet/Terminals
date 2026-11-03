#!/usr/bin/env node
"use strict";

/**
 * EXT-SRS-001 — Terminals shared-conversation extraction input validator.
 * Node.js >=20; no dependencies, HTTP requests, script evaluation or writes to
 * the destination. Re-run assertSafeFilesystem immediately before publication.
 *
 * Workflow dispatch modes (mutually exclusive):
 *   INPUT_REQUEST_JSON=<canonical JSON object>
 *   or INPUT_TARGET_URL=<URL> [INPUT_WRITE_PATH=<template>]
 *
 * CLI alternatives:
 *   --request-json '<JSON>' | --request-json-file <file> | --inputs-json <file>
 *   or --target-url <URL> [--write-path <template>]
 *
 * Trusted runtime identity: GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GITHUB_WORKSPACE.
 * Do not obtain run identity or repository root from dispatch request fields.
 */
const fs = require("node:fs");
const path = require("node:path");

const SCHEMA = "terminals.shared-chat-extractor.inputs.v2";
const OUTPUT_ROOT = "workspaces/shared-conversations";
const DEFAULT_WRITE_PATH = `${OUTPUT_ROOT}/{share_uuid}/{run_id}-{run_attempt}`;
const OUTPUT_FILES = Object.freeze([
  "response.html", "conversation-raw.json", "linear-conversation.json",
  "conversation.json", "conversation.md", "diagnostics.json",
  "receipt.json", "execution.json"
]);
const ALLOWED_KEYS = new Set(["target_url", "write_path", "request_id", "export_profile"]);
const LEGACY_KEYS = new Set(["target_url", "write_path"]);
const CLI_FLAGS = new Set([
  "--request-json", "--request-json-file", "--inputs-json",
  "--target-url", "--write-path"
]);
const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
const SHARE_PATH = new RegExp(`^/share/${UUID}/?$`, "i");
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
const ATTEMPT = /^[1-9][0-9]{0,9}$/;
const LIMITS = Object.freeze({urlBytes: 2048, jsonBytes: 16384, pathLength: 240});

class InputValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "InputValidationError";
    this.code = code;
  }
}
function fail(code, message) { throw new InputValidationError(code, message); }
function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function optionalBlank(value) { return value === undefined || value === ""; }
function strictString(value, key, maximum) {
  if (typeof value !== "string" || !value.length || value.trim() !== value ||
      Buffer.byteLength(value, "utf8") > maximum || /[\x00-\x1f\x7f]/.test(value)) {
    fail("INPUT_SCHEMA_INVALID", `${key} must be a nonempty, trimmed string (maximum ${maximum} UTF-8 bytes) without control characters`);
  }
  return value;
}

function parseShareUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    fail("TARGET_URL_REQUIRED", "target_url is required and must be a string");
  }
  if (raw !== raw.trim() || Buffer.byteLength(raw, "utf8") > LIMITS.urlBytes ||
      /[\x00-\x1f\x7f]/.test(raw)) {
    fail("TARGET_URL_INVALID", "target_url contains whitespace, control characters or exceeds 2048 bytes");
  }
  // URL() canonicalizes an explicit :443 away and may normalize backslashes.
  if (!/^https:\/\/chatgpt\.com\//i.test(raw) || /[\\\s\u200b\u2028\u2029]/u.test(raw)) {
    fail("TARGET_URL_INVALID", "target_url must be a literal HTTPS chatgpt.com share URL without whitespace, escapes or an explicit port");
  }
  let url;
  try { url = new URL(raw); }
  catch { fail("TARGET_URL_INVALID", "target_url is not an absolute URL"); }
  if (url.protocol !== "https:" || url.hostname !== "chatgpt.com" ||
      url.username || url.password || url.port || url.hash) {
    fail("TARGET_URL_INVALID", "target_url has unsupported origin, credentials, port or fragment");
  }
  const match = SHARE_PATH.exec(url.pathname);
  if (!match) fail("TARGET_URL_INVALID", "target_url path must be /share/<UUID> with an optional trailing slash");
  return Object.freeze({target_url: url.toString(), share_uuid: match[1].toLowerCase()});
}

function trustedIdentity(context) {
  const run_id = context?.run_id;
  const run_attempt = context?.run_attempt;
  if (typeof run_id !== "string" || !RUN_ID.test(run_id)) {
    fail("INVALID_RUN_ID", "GITHUB_RUN_ID must be a positive decimal string of at most 20 digits");
  }
  if (typeof run_attempt !== "string" || !ATTEMPT.test(run_attempt)) {
    fail("INVALID_RUN_ATTEMPT", "GITHUB_RUN_ATTEMPT must be a positive decimal string of at most 10 digits");
  }
  return {run_id, run_attempt};
}

function validateDestinationTemplate(candidate, {share_uuid, run_id, run_attempt}) {
  if (typeof candidate !== "string") {
    fail("INPUT_SCHEMA_INVALID", "write_path must be a string when supplied");
  }
  const source = candidate;
  if (!source || source.trim() !== source || /[\x00-\x1f\x7f]/.test(source)) {
    fail("WRITE_PATH_INVALID", "write_path must be a nonempty trimmed path without control characters");
  }
  if (source.startsWith("/") || source.endsWith("/") || source.includes("//") ||
      source.includes("\\") || /\s/u.test(source)) {
    fail("WRITE_PATH_INVALID", "write_path must be a normalized repository-relative POSIX path");
  }
  const withoutTokens = source.replaceAll("{share_uuid}", "")
    .replaceAll("{run_id}", "").replaceAll("{run_attempt}", "");
  if (/[{}]/.test(withoutTokens)) {
    fail("WRITE_PATH_INVALID", "write_path includes an unsupported or malformed placeholder");
  }
  // Require an unambiguous run+attempt delimiter for immutable run scope.
  if (!source.includes("{run_id}-{run_attempt}") &&
      !source.includes("{run_id}/{run_attempt}")) {
    fail("NOT_RUN_ISOLATED", "write_path must include {run_id}-{run_attempt} or {run_id}/{run_attempt}");
  }
  const write_path = source.replaceAll("{share_uuid}", share_uuid)
    .replaceAll("{run_id}", run_id).replaceAll("{run_attempt}", run_attempt);
  if (write_path.length > LIMITS.pathLength || path.posix.normalize(write_path) !== write_path) {
    fail("WRITE_PATH_INVALID", "expanded write_path is too long or not normalized");
  }
  const segments = write_path.split("/");
  if (segments.some(segment => !SEGMENT.test(segment) || segment === "." || segment === ".." ||
      segment === ".git" || segment === ".github")) {
    fail("WRITE_PATH_INVALID", "write_path contains unsafe, reserved or traversal path segments");
  }
  if (segments.length < 4 || segments[0] !== "workspaces" || segments[1] !== "shared-conversations") {
    fail("WRITE_PATH_OUT_OF_SCOPE", `write_path must be under ${OUTPUT_ROOT}/`);
  }
  return Object.freeze({write_path_template: source, write_path});
}

/** Pure validation of source fields plus trusted runtime context; filesystem read-only. */
function validateRequest(request, options = {}) {
  if (!plainObject(request)) fail("INPUT_SCHEMA_INVALID", "request must be a JSON object");
  const unexpected = Object.keys(request).filter(key => !ALLOWED_KEYS.has(key));
  if (unexpected.length) fail("INPUT_SCHEMA_INVALID", `unexpected request key(s): ${unexpected.join(", ")}`);
  const {target_url, share_uuid} = parseShareUrl(request.target_url);
  const {run_id, run_attempt} = trustedIdentity(options.context ?? {
    run_id: process.env.GITHUB_RUN_ID, run_attempt: process.env.GITHUB_RUN_ATTEMPT
  });
  const write = validateDestinationTemplate(
    request.write_path === undefined ? DEFAULT_WRITE_PATH : request.write_path,
    {share_uuid, run_id, run_attempt}
  );
  const request_id = request.request_id === undefined
    ? `extract-${run_id}-${run_attempt}`
    : request.request_id;
  if (typeof request_id !== "string") {
    fail("INPUT_SCHEMA_INVALID", "request_id must be a string when supplied");
  }
  if (!REQUEST_ID.test(request_id)) {
    fail("REQUEST_ID_INVALID", "request_id must be 1–128 ASCII letters, digits, '_' or '-', starting with an alphanumeric");
  }
  const export_profile = request.export_profile === undefined ? "complete" : request.export_profile;
  if (export_profile !== "complete") {
    fail("EXPORT_PROFILE_UNSUPPORTED", "only export_profile=complete is currently supported");
  }
  const result = Object.freeze({schema: SCHEMA, target_url, share_uuid,
    run_id, run_attempt, request_id, export_profile, ...write});
  if (options.repoRoot !== undefined) assertSafeFilesystem(options.repoRoot, result.write_path);
  return result;
}

function parseRequestJson(raw) {
  if (typeof raw !== "string" || Buffer.byteLength(raw, "utf8") > LIMITS.jsonBytes || !raw.trim()) {
    fail("REQUEST_JSON_INVALID", "request_json must be a nonempty JSON string no larger than 16 KiB");
  }
  let value;
  try { value = JSON.parse(raw); }
  catch { fail("REQUEST_JSON_INVALID", "request_json is malformed JSON"); }
  if (!plainObject(value)) fail("INPUT_SCHEMA_INVALID", "request_json root must be an object");
  return value;
}

/** Explicit JSON and legacy modes are exclusive; blank legacy write_path means omitted. */
function resolveDispatchInputs(dispatch, options = {}) {
  if (!plainObject(dispatch) || Object.keys(dispatch).some(key =>
      !["request_json", "target_url", "write_path"].includes(key))) {
    fail("INPUT_SCHEMA_INVALID", "dispatch must have request_json, target_url and/or write_path only");
  }
  const jsonMode = !optionalBlank(dispatch.request_json);
  if (jsonMode && (!optionalBlank(dispatch.target_url) || !optionalBlank(dispatch.write_path))) {
    fail("INPUT_MODE_CONFLICT", "request_json cannot be combined with legacy target_url/write_path");
  }
  let request;
  if (jsonMode) {
    request = parseRequestJson(dispatch.request_json);
  } else {
    request = {target_url: dispatch.target_url};
    if (!optionalBlank(dispatch.write_path)) request.write_path = dispatch.write_path;
  }
  return validateRequest(request, options);
}

/** Reject pre-existing symlinks, non-directories and any populated destination. */
function assertSafeFilesystem(repoRoot, writePath) {
  if (typeof repoRoot !== "string" || !repoRoot) {
    fail("REPO_ROOT_INVALID", "repository root must be an existing directory");
  }
  const root = path.resolve(repoRoot);
  const rootEntry = fs.lstatSync(root, {throwIfNoEntry: false});
  if (!rootEntry || !rootEntry.isDirectory() || rootEntry.isSymbolicLink()) {
    fail("REPO_ROOT_INVALID", "repository root is missing, non-directory or a symlink");
  }
  if (typeof writePath !== "string" || !writePath.startsWith(OUTPUT_ROOT + "/")) {
    fail("WRITE_PATH_OUT_OF_SCOPE", "unvalidated destination outside the authorized workspace");
  }
  const segments = writePath.split("/");
  if (writePath.length > LIMITS.pathLength || path.posix.normalize(writePath) !== writePath ||
      segments.length < 4 || segments.some(segment => !SEGMENT.test(segment) ||
        segment === "." || segment === ".." || segment === ".git" || segment === ".github")) {
    fail("WRITE_PATH_INVALID", "filesystem destination must be a normalized safe path");
  }
  const dest = path.resolve(root, ...segments);
  const rel = path.relative(root, dest);
  if (!rel || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    fail("WRITE_PATH_OUT_OF_SCOPE", "resolved destination escapes repository root");
  }
  let cursor = root;
  for (const segment of writePath.split("/")) {
    cursor = path.join(cursor, segment);
    const entry = fs.lstatSync(cursor, {throwIfNoEntry: false});
    if (entry?.isSymbolicLink()) {
      fail("WRITE_PATH_SYMLINK", `symlink in destination path: ${path.relative(root, cursor)}`);
    }
    if (entry && !entry.isDirectory()) {
      fail("WRITE_PATH_INVALID", `non-directory component: ${path.relative(root, cursor)}`);
    }
  }
  if (fs.existsSync(dest) && fs.readdirSync(dest).length !== 0) {
    fail("WRITE_PATH_COLLISION", "destination already contains files; immutable run output must not overwrite it");
  }
  for (const filename of OUTPUT_FILES) {
    const entry = fs.lstatSync(path.join(dest, filename), {throwIfNoEntry: false});
    if (entry) fail("WRITE_PATH_COLLISION", `output already exists: ${filename}`);
  }
  return true;
}

function parseCliArgs(argv) {
  if (!Array.isArray(argv)) fail("ARGS_INVALID", "CLI arguments must be an array");
  const flags = Object.create(null);
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    if (!CLI_FLAGS.has(flag) || typeof value !== "string" || value.startsWith("--") ||
        Object.hasOwn(flags, flag)) {
      fail("ARGS_INVALID", `invalid, duplicate or missing-value CLI argument: ${flag ?? "<missing>"}`);
    }
    flags[flag] = value;
  }
  const jsonFileFlags = ["--request-json-file", "--inputs-json"];
  if (jsonFileFlags.filter(flag => Object.hasOwn(flags, flag)).length > 1) {
    fail("ARGS_INVALID", "JSON file flags are mutually exclusive");
  }
  return flags;
}

function readRequestFile(filename) {
  if (typeof filename !== "string" || !filename || filename.startsWith("-")) {
    fail("ARGS_INVALID", "request JSON filename is required");
  }
  const file = path.resolve(filename);
  let entry;
  try { entry = fs.lstatSync(file); }
  catch { fail("REQUEST_JSON_INVALID", "request JSON file cannot be accessed"); }
  if (!entry.isFile() || entry.isSymbolicLink() || entry.size > LIMITS.jsonBytes) {
    fail("REQUEST_JSON_INVALID", "request JSON file must be a regular file no larger than 16 KiB");
  }
  try { return fs.readFileSync(file, "utf8"); }
  catch { fail("REQUEST_JSON_INVALID", "request JSON file cannot be read"); }
}

function writeGithubOutputs(result, filename) {
  if (!filename) return;
  const entry = fs.lstatSync(filename, {throwIfNoEntry: false});
  if (!entry?.isFile() || entry.isSymbolicLink()) {
    fail("GITHUB_OUTPUT_INVALID", "GITHUB_OUTPUT must be an existing regular file");
  }
  const values = {
    target_url: result.target_url, share_uuid: result.share_uuid,
    share_id: result.share_uuid, // backward-compatible alias for candidate B
    write_path: result.write_path, run_id: result.run_id,
    run_attempt: result.run_attempt, request_id: result.request_id,
    export_profile: result.export_profile
  };
  for (const value of Object.values(values)) {
    if (typeof value !== "string" || /[\r\n\x00]/.test(value)) {
      fail("GITHUB_OUTPUT_INVALID", "refusing multiline or invalid GitHub step output");
    }
  }
  fs.appendFileSync(filename, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""), "utf8");
}

function main(argv = process.argv.slice(2), env = process.env) {
  const flags = parseCliArgs(argv);
  const file = flags["--request-json-file"] ?? flags["--inputs-json"];
  if (file !== undefined && flags["--request-json"] !== undefined) {
    fail("INPUT_MODE_CONFLICT", "request JSON string and file cannot be combined");
  }
  const explicitJson = flags["--request-json"] !== undefined || file !== undefined;
  if (flags["--request-json"] === "") {
    fail("REQUEST_JSON_INVALID", "explicit --request-json cannot be empty");
  }
  if (explicitJson && !optionalBlank(env.INPUT_REQUEST_JSON)) {
    fail("INPUT_MODE_CONFLICT", "multiple request_json inputs supplied");
  }
  const request_json = file !== undefined ? readRequestFile(file) :
    flags["--request-json"] ?? env.INPUT_REQUEST_JSON;
  const result = resolveDispatchInputs({
    request_json,
    target_url: flags["--target-url"] ?? env.INPUT_TARGET_URL,
    write_path: flags["--write-path"] ?? env.INPUT_WRITE_PATH
  }, {
    context: {run_id: env.GITHUB_RUN_ID, run_attempt: env.GITHUB_RUN_ATTEMPT},
    repoRoot: env.GITHUB_WORKSPACE ?? process.cwd()
  });
  writeGithubOutputs(result, env.GITHUB_OUTPUT);
  process.stdout.write(JSON.stringify(result) + "\n");
  return result;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(JSON.stringify({ok: false,
      code: error instanceof InputValidationError ? error.code : "INPUT_VALIDATION_ERROR",
      error: error instanceof InputValidationError ? error.message : "unexpected filesystem or runtime failure"}) + "\n");
    process.exitCode = 2;
  }
}

module.exports = {SCHEMA, OUTPUT_ROOT, OUTPUT_FILES, DEFAULT_WRITE_PATH,
  InputValidationError, parseShareUrl, trustedIdentity, validateDestinationTemplate,
  validateRequest, parseRequestJson, resolveDispatchInputs, assertSafeFilesystem,
  parseCliArgs, readRequestFile, writeGithubOutputs, main};
