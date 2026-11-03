#!/usr/bin/env node
"use strict";

/**
 * Terminals shared-chat extractor: dispatch input parser/validator (proposed).
 *
 * Inputs: --target-url URL [--write-path DIR] [--repo-root DIR], or
 *         INPUT_TARGET_URL / INPUT_WRITE_PATH in the GitHub Actions step env.
 * Output: one normalized JSON object on stdout; if GITHUB_OUTPUT exists,
 *         also emit target_url, share_id, and write_path as step outputs.
 *
 * Does not fetch HTML, modify transcript files, or initiate workflow_dispatch.
 */
const fs = require("node:fs");
const path = require("node:path");

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
const SHARE_PATH = new RegExp(`^/share/${UUID}/?$`, "i");
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_DESTINATION_LENGTH = 240;
const OUTPUT_FILES = ["conversation.md", "conversation.json"];
const DEFAULT_ROOT = "workspaces/shared-conversations";
const PROTECTED_WORKSPACES = new Set(["shared-chat-extractor"]);

class InputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "InputError";
    this.code = code;
  }
}

function invalid(code, message) {
  throw new InputError(code, message);
}

function parseShareUrl(value) {
  if (typeof value !== "string" || !value.length) {
    invalid("TARGET_URL_REQUIRED", "target_url must be a nonempty string");
  }
  if (value !== value.trim() || /[\x00-\x1f\x7f]/.test(value)) {
    invalid("TARGET_URL_INVALID", "target_url contains whitespace at its edges or control characters");
  }
  // Restrict the raw authority too: URL() otherwise normalizes an explicit :443 away.
  if (!/^https:\/\/chatgpt\.com\//i.test(value)) {
    invalid("TARGET_URL_INVALID", "target_url must begin with https://chatgpt.com/");
  }

  let url;
  try { url = new URL(value); }
  catch { invalid("TARGET_URL_INVALID", "target_url is not a valid absolute URL"); }
  if (url.protocol !== "https:" || url.hostname !== "chatgpt.com" ||
      url.username || url.password || url.port || url.hash) {
    invalid("TARGET_URL_INVALID", "target_url has an unsupported origin, credentials, port, or fragment");
  }
  const match = SHARE_PATH.exec(url.pathname);
  if (!match) {
    invalid("TARGET_URL_INVALID", "target_url path must be /share/<UUID>[/]");
  }
  return {target_url: url.toString(), share_id: match[1].toLowerCase()};
}

function validateDestination(candidate, shareId) {
  if (candidate !== undefined && candidate !== null && typeof candidate !== "string") {
    invalid("WRITE_PATH_INVALID", "write_path must be a string when provided");
  }
  const writePath = candidate === undefined || candidate === null || candidate === ""
    ? `${DEFAULT_ROOT}/${shareId}`
    : candidate;
  if (writePath.length > MAX_DESTINATION_LENGTH || writePath !== writePath.trim() ||
      writePath.startsWith("/") || writePath.includes("\\") ||
      /[\x00-\x1f\x7f]/.test(writePath)) {
    invalid("WRITE_PATH_INVALID", "write_path must be a safe, relative directory of at most 240 characters");
  }
  const segments = writePath.split("/");
  if (segments.some(s => !SAFE_SEGMENT.test(s) || s === "." || s === "..")) {
    invalid("WRITE_PATH_INVALID", "write_path contains invalid or traversal path segments");
  }
  if (segments[0] !== "workspaces" || segments.length < 2 ||
      PROTECTED_WORKSPACES.has(segments[1])) {
    invalid("WRITE_PATH_OUTSIDE_WORKSPACE", "write_path must be in an output workspace, not a source/config directory");
  }
  return writePath;
}

function assertSafeFilesystem(repoRoot, writePath, shareId) {
  const root = path.resolve(repoRoot);
  const dest = path.resolve(root, writePath);
  const relative = path.relative(root, dest);
  if (!relative || relative.startsWith(".." + path.sep) || relative === ".." || path.isAbsolute(relative)) {
    invalid("WRITE_PATH_OUTSIDE_WORKSPACE", "resolved destination escapes repository root");
  }

  let cursor = root;
  for (const segment of writePath.split("/")) {
    cursor = path.join(cursor, segment);
    const entry = fs.lstatSync(cursor, {throwIfNoEntry: false});
    if (entry?.isSymbolicLink()) {
      invalid("WRITE_PATH_SYMLINK", `symlink in destination ancestry: ${path.relative(root, cursor)}`);
    }
    if (entry && !entry.isDirectory()) {
      invalid("WRITE_PATH_INVALID", `non-directory component: ${path.relative(root, cursor)}`);
    }
  }
  for (const filename of OUTPUT_FILES) {
    const file = path.join(dest, filename);
    const entry = fs.lstatSync(file, {throwIfNoEntry: false});
    if (entry?.isSymbolicLink() || (entry && !entry.isFile())) {
      invalid("WRITE_PATH_INVALID", `unsafe existing output target: ${filename}`);
    }
  }

  // Prevent accidental replacement of another share's transcript. The URL's
  // query does not affect share identity, but a different UUID does.
  const existingJson = path.join(dest, "conversation.json");
  if (fs.existsSync(existingJson)) {
    let existing;
    try {
      existing = JSON.parse(fs.readFileSync(existingJson, "utf8"));
    } catch {
      invalid("WRITE_PATH_COLLISION", "existing conversation.json is unreadable or malformed");
    }
    try {
      const old = parseShareUrl(existing?.source_url);
      if (old.share_id !== shareId) {
        invalid("WRITE_PATH_COLLISION", "destination already belongs to a different shared conversation");
      }
    } catch (err) {
      if (err instanceof InputError && err.code === "WRITE_PATH_COLLISION") throw err;
      invalid("WRITE_PATH_COLLISION", "existing conversation.json lacks valid matching source provenance");
    }
  } else if (fs.existsSync(path.join(dest, "conversation.md"))) {
    invalid("WRITE_PATH_COLLISION", "existing conversation.md has no companion JSON provenance");
  }
}

function parseInputs(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key => !["target_url", "write_path"].includes(key))) {
    invalid("INPUT_SCHEMA_INVALID", "input must contain only target_url and optional write_path");
  }
  const parsed = parseShareUrl(input.target_url);
  const writePath = validateDestination(input.write_path, parsed.share_id);
  assertSafeFilesystem(options.repoRoot ?? process.cwd(), writePath, parsed.share_id);
  return Object.freeze({
    schema: "terminals.shared-chat-extractor.inputs.v1",
    target_url: parsed.target_url,
    share_id: parsed.share_id,
    write_path: writePath
  });
}

function parseCliArgs(argv) {
  const allowed = new Set(["--target-url", "--write-path", "--repo-root"]);
  const args = Object.create(null);
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    if (!allowed.has(flag) || i + 1 >= argv.length || argv[i + 1].startsWith("--") ||
        Object.prototype.hasOwnProperty.call(args, flag)) {
      invalid("ARGS_INVALID", `invalid or duplicate argument: ${flag ?? "<missing>"}`);
    }
    args[flag] = argv[i + 1];
  }
  return args;
}

function writeGithubOutputs(output, file) {
  if (!file) return;
  if (!fs.existsSync(file)) {
    invalid("GITHUB_OUTPUT_UNAVAILABLE", "GITHUB_OUTPUT file does not exist");
  }
  const values = ["target_url", "share_id", "write_path"]
    .map(key => `${key}=${output[key]}\n`).join("");
  fs.appendFileSync(file, values, {encoding: "utf8"});
}

function main(argv = process.argv.slice(2), env = process.env) {
  const flags = parseCliArgs(argv);
  const result = parseInputs({
    target_url: flags["--target-url"] ?? env.INPUT_TARGET_URL,
    write_path: flags["--write-path"] ?? env.INPUT_WRITE_PATH
  }, {repoRoot: flags["--repo-root"] ?? env.GITHUB_WORKSPACE ?? process.cwd()});
  writeGithubOutputs(result, env.GITHUB_OUTPUT);
  process.stdout.write(JSON.stringify(result) + "\n");
  return result;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    const code = error instanceof InputError ? error.code : "INPUT_VALIDATION_ERROR";
    process.stderr.write(JSON.stringify({ok: false, code, error: error.message}) + "\n");
    process.exitCode = 1;
  }
}

module.exports = {InputError, parseShareUrl, validateDestination, assertSafeFilesystem, parseInputs, parseCliArgs, writeGithubOutputs, main};
