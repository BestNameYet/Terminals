"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function main() {
  if (process.argv.length !== 3) {
    throw new Error("Usage: node runner.js <path-to-runtrigger.json>");
  }

  const configuration = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8"));
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw new Error("Trigger JSON must be an object.");
  }
  if (typeof configuration.jsPath !== "string" || !configuration.jsPath.trim()) {
    throw new Error("Trigger must specify jsPath.");
  }
  const args = configuration.args;
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Trigger args must be a JSON object.");
  }

  for (const [name, value] of Object.entries(args)) {
    if (value === null) {
      throw new Error("Argument '" + name + "' is null.");
    }
  }

  const scriptPath = path.resolve(configuration.jsPath);
  if (!fs.statSync(scriptPath).isFile()) {
    throw new Error("jsPath does not point to a file: " + configuration.jsPath);
  }
  const result = spawnSync(process.execPath, [scriptPath, JSON.stringify(args)], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.signal) throw new Error("Script terminated by signal: " + result.signal);
  process.exitCode = result.status ?? 1;
}

try {
  main();
} catch (error) {
  console.error("Runner error: " + error.message);
  process.exitCode = 1;
}
