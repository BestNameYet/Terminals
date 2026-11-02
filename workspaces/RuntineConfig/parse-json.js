"use strict";

const fs = require("node:fs");
const path = require("node:path");

function findJsonFiles(target) {
  const details = fs.statSync(target);

  if (details.isFile()) {
    if (path.extname(target).toLowerCase() !== ".json") {
      throw new Error("Not a JSON file: " + target);
    }
    return [target];
  }

  if (!details.isDirectory()) {
    throw new Error("Not a file or directory: " + target);
  }

  return fs.readdirSync(target, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      if (!entry.isFile() && !entry.isDirectory()) return [];
      if (entry.isFile() && path.extname(entry.name).toLowerCase() !== ".json") return [];
      return findJsonFiles(path.join(target, entry.name));
    });
}

function main() {
  if (!process.env.GITHUB_ENV) {
    throw new Error("GITHUB_ENV is not set; run this in a GitHub Actions step.");
  }

  const argumentsList = process.argv.slice(2);
  const targets = argumentsList.length > 0
    ? argumentsList.map(value => path.resolve(value))
    : [__dirname];
  const files = [...new Set(targets.flatMap(findJsonFiles))].sort();

  if (files.length === 0) {
    throw new Error("No JSON files found.");
  }

  const parsed = files.map(file => ({
    path: path.relative(process.cwd(), file).split(path.sep).join("/"),
    data: JSON.parse(fs.readFileSync(file, "utf8"))
  }));

  fs.appendFileSync(process.env.GITHUB_ENV, "PARSED_JSON=" + JSON.stringify(parsed) + "\n", "utf8");
  console.log("Exported " + files.length + " parsed JSON file(s) to PARSED_JSON for subsequent steps.");
}

try {
  main();
} catch (error) {
  console.error("JSON parser error: " + error.message);
  process.exitCode = 1;
}
