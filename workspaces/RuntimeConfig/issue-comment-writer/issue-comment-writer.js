"use strict";

const fs = require("node:fs");

function parseIssuePath(value) {
  const match = value.match(/^(?:https?:\/\/github\.com\/)?([^\/?#]+)\/([^\/?#]+)\/issues\/([1-9]\d*)\/?(?:[?#].*)?$/i);
  if (!match) {
    throw new Error("Issue path must be owner/repo/issues/number or a GitHub Issue URL.");
  }
  const number = Number(match[3]);
  if (!Number.isSafeInteger(number)) throw new Error("Invalid issue number.");
  return { owner: match[1], repo: match[2], number };
}

function readTests(value) {
  const input = value.trimStart().startsWith("[")
    ? value
    : fs.readFileSync(value, "utf8");
  const tests = JSON.parse(input);
  if (!Array.isArray(tests) || tests.length === 0) {
    throw new Error("jsonArrayPath must represent a nonempty JSON array.");
  }
  return tests;
}

function renderTests(tests) {
  let body = "";
  for (const entry of tests) {
    if (entry === null || Array.isArray(entry) || typeof entry !== "object") {
      throw new Error("Each array entry must be a key/value object.");
    }
    const values = Object.values(entry);
    if (values.length === 0) throw new Error("Each array entry must contain a value.");
    for (const html of values) {
      if (typeof html !== "string") throw new Error("Every HTML value must be a string.");
      if (body) body += "\n\n";
      body += html;
    }
  }
  if (!body) throw new Error("Rendered comment body is empty.");
  return body;
}

async function apiRequest(method, endpoint, token, body) {
  const response = await fetch("https://api.github.com" + endpoint, {
    method,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error("GitHub API " + method + " " + endpoint + " failed (HTTP " + response.status + "): " + (result.message || "Unknown error"));
  }
  return result;
}

function parseNamedArgs(input) {
  const args = JSON.parse(input);
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Expected a JSON object with issuePath, commentId, and jsonArrayPath.");
  }
  for (const name of ["issuePath", "commentId", "jsonArrayPath"]) {
    if (typeof args[name] !== "string" || !args[name].trim()) {
      throw new Error("Argument '" + name + "' must be a nonempty string.");
    }
  }
  return args;
}

async function main() {
  if (process.argv.length !== 3) {
    throw new Error("Usage: node issue-comment-writer.js '<named-args-json-object>'");
  }
  const { issuePath, commentId, jsonArrayPath } = parseNamedArgs(process.argv[2]);
  const issue = parseIssuePath(issuePath);
  const body = renderTests(readTests(jsonArrayPath));
  const token = process.env.GH_TOKEN || process.env.WORKSPACE_API || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Set GH_TOKEN, WORKSPACE_API, or GITHUB_TOKEN with Issues: write access to the target repository.");

  const repoEndpoint = "/repos/" + encodeURIComponent(issue.owner) + "/" + encodeURIComponent(issue.repo);
  let result;
  if (/^new$/i.test(commentId)) {
    result = await apiRequest("POST", repoEndpoint + "/issues/" + issue.number + "/comments", token, { body });
  } else {
    if (!/^[1-9]\d*$/.test(commentId) || !Number.isSafeInteger(Number(commentId))) {
      throw new Error("Comment ID must be a positive integer or 'new' (case-insensitive).");
    }
    const endpoint = repoEndpoint + "/issues/comments/" + commentId;
    const existing = await apiRequest("GET", endpoint, token);
    const expectedIssuePath = (repoEndpoint + "/issues/" + issue.number).toLowerCase();
    if (!existing.issue_url || new URL(existing.issue_url).pathname.toLowerCase() !== expectedIssuePath) {
      throw new Error("Comment ID does not belong to the specified Issue.");
    }
    result = await apiRequest("PATCH", endpoint, token, { body });
  }
  console.log(JSON.stringify({ id: result.id, url: result.html_url, characters: body.length }));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
