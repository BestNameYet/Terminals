#!/usr/bin/env node
"use strict";

// Usage: node collect-expressions.js <file-list.json|csv|txt> [source-root] [output-dir]
// The source root contains the files named in the input list.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const [listPath, rootArg = ".", outputArg = "expression-tables"] = process.argv.slice(2);
if (!listPath) {
  console.error("Usage: node collect-expressions.js <file-list> [source-root] [output-dir]");
  process.exit(2);
}

function parseCsv(content) {
  const lines = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < content.length; ++i) {
    const ch = content[i];
    if (ch === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; ++i; }
      else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n" || ch === "\r")) {
      if (ch === ",") { row.push(cell); cell = ""; }
      else {
        if (ch === "\r" && content[i + 1] === "\n") ++i;
        row.push(cell); cell = "";
        if (row.some(value => value.length)) lines.push(row);
        row = [];
      }
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quoted field");
  if (cell.length || row.length) { row.push(cell); lines.push(row); }
  const [header, ...data] = lines;
  if (!header) return [];
  return data.map(values => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ""])));
}

function readList(filename) {
  const content = fs.readFileSync(filename, "utf8");
  const ext = path.extname(filename).toLowerCase();
  const input = ext === ".json" ? JSON.parse(content) :
    ext === ".csv" ? parseCsv(content) :
    content.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  const items = Array.isArray(input) ? input : input.rows;
  if (!Array.isArray(items)) throw new Error("Expected a JSON array or object with a rows array");
  return items.map(item => typeof item === "string" ? { relative_file_path: item } : item);
}

const headers = [
  "repository", "file_path", "file_revision_sha", "expression_id",
  "expression_text", "start_line", "start_column", "end_line", "end_column",
  "syntax_node_type", "standalone_expression_statement", "outside_function",
  "inside_function_definition", "enclosing_function_name",
  "enclosing_function_type", "enclosing_function_start_line",
  "enclosing_function_end_line"
];
const csvValue = value => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};
function writeCsv(filename, rows) {
  fs.writeFileSync(filename, [headers.join(","), ...rows.map(row =>
    headers.map(key => csvValue(row[key])).join(","))].join("\n") + "\n");
}

function functionLabel(fnPath) {
  if (!fnPath) return null;
  const node = fnPath.node;
  if (node.id?.name) return node.id.name;
  const parent = fnPath.parentPath;
  if (parent?.isVariableDeclarator()) return parent.node.id?.name ?? null;
  if (parent?.isAssignmentExpression()) {
    return parent.node.left?.name ?? parent.node.left?.property?.name ?? null;
  }
  if (node.key?.name) return node.key.name;
  if (node.key?.value) return String(node.key.value);
  return null;
}

function collect(source, entry) {
  const ast = parse(source, { sourceType: "unambiguous", plugins: ["jsx"], errorRecovery: false });
  const rows = [];
  traverse(ast, {
    enter(nodePath) {
      if (!nodePath.isExpression()) return;
      const node = nodePath.node;
      const fn = nodePath.getFunctionParent();
      const standalone = !!nodePath.parentPath?.isExpressionStatement() &&
        nodePath.key === "expression";
      rows.push({
        repository: entry.repository ?? "",
        file_path: entry.relative_file_path ?? entry.path ?? entry.file_path,
        file_revision_sha: entry.file_revision_sha ?? "",
        expression_id: rows.length + 1,
        expression_text: source.slice(node.start, node.end),
        start_line: node.loc.start.line,
        start_column: node.loc.start.column,
        end_line: node.loc.end.line,
        end_column: node.loc.end.column,
        syntax_node_type: node.type,
        standalone_expression_statement: standalone,
        outside_function: !fn,
        inside_function_definition: !!fn,
        enclosing_function_name: functionLabel(fn),
        enclosing_function_type: fn?.node.type ?? null,
        enclosing_function_start_line: fn?.node.loc?.start.line ?? null,
        enclosing_function_end_line: fn?.node.loc?.end.line ?? null
      });
    }
  });
  return rows;
}

const entries = readList(path.resolve(listPath));
const sourceRoot = path.resolve(rootArg);
const outputDir = path.resolve(outputArg);
fs.mkdirSync(outputDir, { recursive: true });
const manifest = [];
let failures = 0;
for (let index = 0; index < entries.length; ++index) {
  const entry = entries[index];
  const relativePath = entry.relative_file_path ?? entry.path ?? entry.file_path;
  if (typeof relativePath !== "string" || !relativePath) {
    manifest.push({ index, status: "error", error: "Missing file path" });
    ++failures;
    continue;
  }
  const ext = path.extname(relativePath).toLowerCase();
  if (![".js", ".mjs", ".cjs", ".jsx", ".jsm", ".es6"].includes(ext)) {
    manifest.push({ index, file: relativePath, status: "skipped_non_javascript" });
    continue;
  }
  const identity = (entry.repository ?? "") + ":" + relativePath;
  const suffix = crypto.createHash("sha256").update(identity).digest("hex").slice(0, 12);
  const stem = String(index + 1).padStart(5, "0") + "-" + suffix;
  const csvPath = path.join(outputDir, stem + ".csv");
  const jsonPath = path.join(outputDir, stem + ".json");
  try {
    const filename = path.resolve(sourceRoot, relativePath);
    const sourceBytes = fs.readFileSync(filename);
    if (entry.file_revision_sha) {
      const digest = crypto.createHash("sha1")
        .update("blob " + sourceBytes.length + "\0").update(sourceBytes).digest("hex");
      if (digest !== entry.file_revision_sha) {
        throw new Error("Git blob SHA mismatch: expected " + entry.file_revision_sha + ", got " + digest);
      }
    }
    const rows = collect(sourceBytes.toString("utf8"), entry);
    writeCsv(csvPath, rows);
    fs.writeFileSync(jsonPath, JSON.stringify({
      repository: entry.repository ?? null,
      file: relativePath,
      expressions: rows
    }, null, 2) + "\n");
    manifest.push({ index, file: relativePath, status: "ok",
      expression_count: rows.length, csv: csvPath, json: jsonPath });
  } catch (error) {
    ++failures;
    manifest.push({ index, file: relativePath, status: "error", error: error.message });
  }
}
fs.writeFileSync(path.join(outputDir, "manifest.json"),
  JSON.stringify({ file_list: path.resolve(listPath), files: manifest }, null, 2) + "\n");
if (failures) {
  console.error(failures + " file(s) failed; see manifest.json");
  process.exitCode = 1;
}