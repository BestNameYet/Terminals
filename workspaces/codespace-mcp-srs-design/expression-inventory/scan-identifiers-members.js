#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const MEMBER_TYPES = new Set(["MemberExpression", "OptionalMemberExpression", "JSXMemberExpression"]);
const IDENTIFIER_TYPES = new Set(["Identifier", "JSXIdentifier"]);
const OMIT = new Set([
  "start", "end", "loc", "extra", "leadingComments", "innerComments",
  "trailingComments", "comments", "tokens", "errors"
]);

function canonical(value) {
  if (typeof value === "bigint") return { bigint: value.toString() };
  if (typeof value === "number" && !Number.isFinite(value)) return { numeric: String(value) };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (!OMIT.has(key) && value[key] !== undefined) output[key] = canonical(value[key]);
    }
    return output;
  }
  return value;
}

function signature(node) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(node))).digest("hex");
}

function baseIdentifier(node) {
  let cursor = node;
  while (cursor && MEMBER_TYPES.has(cursor.type)) cursor = cursor.object;
  return cursor && IDENTIFIER_TYPES.has(cursor.type) ? cursor.name : null;
}

function gitBlobSha(bytes) {
  return crypto.createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
}

function rowsFromJson(file) {
  const input = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(input.rows)) throw new Error("Expected a file inventory with a rows array");
  return { repository: input.repository, rows: input.rows };
}

function put(map, name, entry) {
  if (!map.has(name)) map.set(name, new Map());
  const group = map.get(name);
  if (!group.has(entry.signature)) group.set(entry.signature, entry.text);
}

function outputGroup(map) {
  const output = {};
  for (const name of Array.from(map.keys()).sort()) {
    output[name] = [...map.get(name).entries()].map(([signature, expression]) => ({
      signature, expression
    })).sort((a, b) => a.signature.localeCompare(b.signature));
  }
  return output;
}

function scan(fileList, sourceRoot, partFile, repository, revision) {
  const { parse } = require("@babel/parser");
  const traverse = require("@babel/traverse").default;
  const inventory = rowsFromJson(fileList);
  if (inventory.repository !== repository) {
    throw new Error("Repository differs from file list: " + inventory.repository + " != " + repository);
  }

  const groups = new Map();
  const unrooted = new Map();
  const failures = [];
  let parsed = 0;
  let candidates = 0;
  let skipped = 0;

  for (const entry of inventory.rows) {
    if (entry.language !== "javascript") {
      skipped++;
      continue;
    }
    candidates++;
    const rel = entry.relative_file_path;
    try {
      const filePath = path.resolve(sourceRoot, rel);
      const bytes = fs.readFileSync(filePath);
      if (entry.file_revision_sha && gitBlobSha(bytes) !== entry.file_revision_sha) {
        throw new Error("File bytes do not match recorded Git blob SHA");
      }
      const source = bytes.toString("utf8");
      const tree = parse(source, {
        sourceType: "unambiguous",
        plugins: ["jsx"],
        errorRecovery: false
      });

      traverse(tree, {
        Identifier(nodePath) {
          if (!groups.has(nodePath.node.name)) groups.set(nodePath.node.name, new Map());
        },
        JSXIdentifier(nodePath) {
          if (!groups.has(nodePath.node.name)) groups.set(nodePath.node.name, new Map());
        },
        enter(nodePath) {
          const node = nodePath.node;
          if (!MEMBER_TYPES.has(node.type)) return;
          const item = {
            signature: signature(node),
            text: source.slice(node.start, node.end)
          };
          const base = baseIdentifier(node);
          if (base === null) {
            if (!unrooted.has(item.signature)) unrooted.set(item.signature, item.text);
          } else {
            put(groups, base, item);
          }
        }
      });
      parsed++;
    } catch (error) {
      failures.push({ file: rel, error: String(error.message) });
    }
  }

  const data = {
    repository,
    revision,
    total_files: inventory.rows.length,
    javascript_files: candidates,
    parsed_javascript_files: parsed,
    skipped_non_javascript_files: skipped,
    errors: failures,
    identifiers: outputGroup(groups),
    members_without_identifier_base: [...unrooted.entries()].map(([signature, expression]) => ({
      signature, expression
    })).sort((a, b) => a.signature.localeCompare(b.signature))
  };
  fs.mkdirSync(path.dirname(path.resolve(partFile)), { recursive: true });
  fs.writeFileSync(partFile, JSON.stringify(data) + "\n");
  console.log(JSON.stringify({
    repository, total_files: data.total_files,
    javascript_files: candidates, parsed_javascript_files: parsed,
    unique_identifiers: Object.keys(data.identifiers).length,
    errors: failures.length, partFile
  }));
  if (failures.length) process.exitCode = 1;
}

function findPartFiles(root) {
  let results = [];
  for (const child of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, child.name);
    if (child.isDirectory()) results = results.concat(findPartFiles(full));
    else if (child.isFile() && child.name === "part.json") results.push(full);
  }
  return results.sort();
}

function merge(partsDirectory, progressPath, destination) {
  const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
  const expected = progress.order;
  const parts = findPartFiles(partsDirectory).map(file => JSON.parse(fs.readFileSync(file, "utf8")));
  const lookup = new Map();
  for (const part of parts) {
    if (lookup.has(part.repository)) throw new Error("Duplicate repository part: " + part.repository);
    lookup.set(part.repository, part);
  }
  if (parts.length !== expected.length) {
    throw new Error("Expected " + expected.length + " repository parts, found " + parts.length);
  }

  const identifiers = new Map();
  const rootless = new Map();
  const errors = [];
  const sources = [];
  let totalFiles = 0, javascriptFiles = 0, parsedFiles = 0;

  for (const name of expected) {
    const fullName = "BestNameYet/" + name;
    const part = lookup.get(fullName);
    if (!part) throw new Error("Missing repository part: " + fullName);
    if (part.revision !== progress.per_repository[name].head_sha) {
      throw new Error("Source revision mismatch: " + fullName);
    }
    totalFiles += part.total_files;
    javascriptFiles += part.javascript_files;
    parsedFiles += part.parsed_javascript_files;
    sources.push({ repository: fullName, revision: part.revision });
    for (const item of part.errors) errors.push({ repository: fullName, ...item });
    for (const [identifier, members] of Object.entries(part.identifiers)) {
      if (!identifiers.has(identifier)) identifiers.set(identifier, new Map());
      for (const member of members) {
        const group = identifiers.get(identifier);
        if (!group.has(member.signature)) group.set(member.signature, member.expression);
      }
    }
    for (const member of part.members_without_identifier_base) {
      if (!rootless.has(member.signature)) rootless.set(member.signature, member.expression);
    }
  }

  if (totalFiles !== 774 || javascriptFiles !== 321) {
    throw new Error("Unexpected inventory coverage: " + totalFiles + " total, " + javascriptFiles + " JavaScript");
  }
  const grouped = {};
  for (const identifier of [...identifiers.keys()].sort()) {
    grouped[identifier] = [...new Set(identifiers.get(identifier).values())].sort();
  }
  const combined = {
    identifiers: grouped,
    member_expressions_without_identifier_base: [...new Set(rootless.values())].sort(),
    parse_errors: errors,
    coverage: {
      repositories: sources,
      files_in_inventory: totalFiles,
      javascript_files: javascriptFiles,
      javascript_files_parsed: parsedFiles,
      javascript_files_failed: errors.length
    }
  };
  fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(combined, null, 2) + "\n");
  console.log(JSON.stringify({
    combined_file: destination, identifiers: Object.keys(grouped).length,
    member_expression_groups: Object.values(grouped).filter(x => x.length).length,
    unique_grouped_members: Object.values(grouped).reduce((n, a) => n + a.length, 0),
    unique_unrooted_members: combined.member_expressions_without_identifier_base.length,
    ...combined.coverage
  }));
}

function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "scan" && args.length === 5) return scan(...args);
  if (mode === "merge" && args.length === 3) return merge(...args);
  console.error("Usage:");
  console.error("  node scan-identifiers-members.js scan <files.json> <source-root> <part.json> <repository> <commit-sha>");
  console.error("  node scan-identifiers-members.js merge <parts-directory> <progress.json> <combined.json>");
  process.exitCode = 2;
}
main();

