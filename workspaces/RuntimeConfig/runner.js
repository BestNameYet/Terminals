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
  if (typeof configuration.js_path !== "string" || !configuration.js_path.trim()) {
    throw new Error("Trigger must specify js_path.");
  }
  const args = configuration.args;
  if (!args || typeof args !== "object") {
    throw new Error("Trigger must contain an args object or array.");
  }

  const values = (Array.isArray(args) ? args : Object.values(args)).map((value, index) => {
    if (value === null) {
      throw new Error("Argument " + (index + 1) + " is null.");
    }
    return typeof value === "string" ? value : JSON.stringify(value);
  });

  const scriptPath = path.resolve(configuration.js_path);
  if (!fs.statSync(scriptPath).isFile()) {
    throw new Error("js_path does not point to a file: " + configuration.js_path);
  }
  const result = spawnSync(process.execPath, [scriptPath, ...values], { stdio: "inherit" });
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
