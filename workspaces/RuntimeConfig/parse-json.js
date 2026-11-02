"use strict";

const fs = require("node:fs");
const path = require("node:path");

function main() {
  if (process.argv.length !== 3) {
    throw new Error("Usage: node parse-json.js <path-to-json-file>");
  }

  if (!process.env.GITHUB_ENV) {
    throw new Error("GITHUB_ENV is not set.");
  }

  const filePath = path.resolve(process.argv[2]);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const workspace = path.resolve(process.env.GITHUB_WORKSPACE || process.cwd());
  const relativePath = path.relative(workspace, filePath).replace(/\\/g, "/");
  const pathName = relativePath
    .replace(/\.json$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  if (!pathName) {
    throw new Error("Cannot create a variable name from the file path.");
  }

  const variableName = "JSON_" + pathName;
  const value = JSON.stringify(parsed);
  fs.appendFileSync(process.env.GITHUB_ENV, variableName + "=" + value + "\n", "utf8");
  console.log("Exported " + variableName + " to GITHUB_ENV.");
}

try {
  main();
} catch (error) {
  console.error("JSON parser error: " + error.message);
  process.exitCode = 1;
}
