"use strict";

const fs = require("node:fs");

function parseIssuePath(value) {
  const match = value.match(/^(?:https?:\/\/github\.com\/)?([^\/?#]+)\/([^\/?#]+)\/issues\/([1-9]\d*)\/?(?:[?#].*)?$/i);
  if (!match) throw new Error("Issue path must be owner/repo/issues/number or a GitHub Issue URL.");
  const number = Number(match[3]);
  if (!Number.isSafeInteger(number)) throw new Error("Invalid issue number.");
  return { owner: match[1], repo: match[2], number };
}

function readEntries(value) {
  const input = value.trimStart().startsWith("[") ? value : fs.readFileSync(value, "utf8");
  const entries = JSON.parse(input);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("jsonArrayPath must represent a nonempty JSON array.");
  }
  return entries;
}

function renderEntries(entries) {
  let body = "";
  for (const entry of entries) {
    if (entry === null || Array.isArray(entry) || typeof entry !== "object") {
      throw new Error("Each array entry must be a key/value object.");
    }
    const values = Object.values(entry);
    if (values.length === 0) throw new Error("Each array entry must contain a value.");
    for (const value of values) {
      if (typeof value !== "string") throw new Error("Every rendered value must be a string.");
      if (body) body += "\n\n";
      body += value;
    }
  }
  if (!body.trim()) throw new Error("Rendered Issue body is empty.");
  return body;
}

function parseNamedArgs(input) {
  const args = JSON.parse(input);
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Expected a JSON object with issuePath and jsonArrayPath.");
  }
  for (const name of ["issuePath", "jsonArrayPath"]) {
    if (typeof args[name] !== "string" || !args[name].trim()) {
      throw new Error("Argument '" + name + "' must be a nonempty string.");
    }
  }
  return args;
}

async function main() {
  if (process.argv.length !== 3) {
    throw new Error("Usage: node issue-body-writer.js '<named-args-json-object>'");
  }

  const { issuePath, jsonArrayPath } = parseNamedArgs(process.argv[2]);
  const issue = parseIssuePath(issuePath);
  const body = renderEntries(readEntries(jsonArrayPath));
  const token = process.env.GH_TOKEN || process.env.WORKSPACE_API || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Set GH_TOKEN, WORKSPACE_API, or GITHUB_TOKEN with Issues: write access.");

  const endpoint = "https://api.github.com/repos/" +
    encodeURIComponent(issue.owner) + "/" + encodeURIComponent(issue.repo) +
    "/issues/" + issue.number;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error("GitHub API PATCH failed (HTTP " + response.status +
      "): " + (result.message || "Unknown error"));
  }
  if (result.body !== body) throw new Error("GitHub returned a different Issue body.");
  console.log(JSON.stringify({ issue: result.number, url: result.html_url, characters: body.length }));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
