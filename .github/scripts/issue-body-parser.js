"use strict";

const fs = require("node:fs");
const parse5 = require("parse5");

function attributes(node) {
  return Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
}

function collect(node, result = []) {
  if (node.tagName) result.push(node);
  for (const child of node.childNodes || []) collect(child, result);
  return result;
}

function parseIssueBody(body) {
  if (typeof body !== "string") throw new TypeError("Issue body must be a string.");
  // Source locations allow a later writer to replace a targeted range without
  // serializing or altering the rest of the original Markdown/HTML string.
  const document = parse5.parseFragment(body, { sourceCodeLocationInfo: true });
  const nodes = collect(document);
  const inputs = [];
  const statuses = [];
  for (const node of nodes) {
    const attrs = attributes(node);
    if (!attrs["data-control"]) continue;
    const loc = node.sourceCodeLocation;
    if (!loc || !loc.startTag || !loc.endTag) continue;
    const innerText = body.slice(loc.startTag.endOffset, loc.endTag.startOffset);
    if (attrs["data-role"] === "input") {
      const checkboxes = [...innerText.matchAll(/^\s*- \[([ xX])\](?=\s|$)/gm)];
      if (checkboxes.length !== 1) {
        throw new Error("Expected one Markdown checkbox for control " + attrs["data-control"]);
      }
      inputs.push({ control: attrs["data-control"], checked: checkboxes[0][1].toLowerCase() === "x",
        source: { start: loc.startOffset, end: loc.endOffset } });
    }
    if (attrs["data-role"] === "status") {
      const stateMap = JSON.parse(attrs["data-state-map"]);
      const displayMap = JSON.parse(attrs["data-display-map"]);
      const textNodes = [];
      function visitText(current) {
        if (current.nodeName === "#text" && current.value.trim()) textNodes.push(current);
        for (const child of current.childNodes || []) visitText(child);
      }
      visitText(node);
      if (textNodes.length !== 1 || !textNodes[0].sourceCodeLocation) {
        throw new Error("Status must have exactly one visible text node: " + attrs["data-control"]);
      }
      const statusAttr = loc.attrs?.["data-status"];
      if (!statusAttr) throw new Error("Missing data-status source attribute: " + attrs["data-control"]);
      statuses.push({ control: attrs["data-control"], state: attrs["data-status"],
        stateMap, displayMap, text: innerText,
        source: { start: loc.startOffset, end: loc.endOffset,
          attribute: { start: statusAttr.startOffset, end: statusAttr.endOffset },
          display: { start: textNodes[0].sourceCodeLocation.startOffset,
            end: textNodes[0].sourceCodeLocation.endOffset } } });
    }
  }
  return { inputs, statuses };
}

function compareInputs(previous, current) {
  function byControl(inputs, version) {
    const index = new Map();
    for (const input of inputs) {
      if (index.has(input.control)) {
        throw new Error("Duplicate input control in " + version + ": " + input.control);
      }
      if (typeof input.checked !== "boolean") {
        throw new TypeError("Invalid checkbox value for " + input.control);
      }
      index.set(input.control, input.checked);
    }
    return index;
  }

  const before = byControl(previous.inputs, "previous");
  const after = byControl(current.inputs, "current");
  for (const control of before.keys()) {
    if (!after.has(control)) throw new Error("Input removed: " + control);
  }
  for (const control of after.keys()) {
    if (!before.has(control)) throw new Error("Input added: " + control);
  }
  return [...after].map(([control, checked]) => ({
    control,
    previous: before.get(control),
    current: checked,
    changed: before.get(control) !== checked
  }));
}

function updateChangedStatuses(body, parsed, comparisons) {
  const statuses = new Map();
  for (const status of parsed.statuses) {
    if (statuses.has(status.control)) {
      throw new Error("Duplicate status for control: " + status.control);
    }
    statuses.set(status.control, status);
  }

  const replacements = [];
  const updates = [];
  for (const change of comparisons) {
    if (!change.changed) continue;
    const status = statuses.get(change.control);
    if (!status) throw new Error("Missing status for changed control: " + change.control);

    const stateKey = String(change.current);
    if (!Object.prototype.hasOwnProperty.call(status.stateMap, stateKey)) {
      throw new Error("Missing state mapping for " + change.control + ": " + stateKey);
    }
    const state = status.stateMap[stateKey];
    if (typeof state !== "string") throw new TypeError("State mapping must return a string");
    if (!Object.prototype.hasOwnProperty.call(status.displayMap, state)) {
      throw new Error("Missing display mapping for " + change.control + ": " + state);
    }
    const display = status.displayMap[state];
    if (typeof display !== "string") throw new TypeError("Display mapping must return a string");

    // Both edits use source offsets from the original Issue body string.
    const span = status.source.attribute;
    const originalAttribute = body.slice(span.start, span.end);
    const match = originalAttribute.match(/^(data-status\s*=\s*)(["'])([\s\S]*?)\2$/i);
    if (!match) throw new Error("Unrecognized data-status attribute syntax: " + change.control);
    const quote = match[2];
    const escapedState = state.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    replacements.push({ start: span.start, end: span.end,
      value: match[1] + quote + escapedState + quote });

    const textSpan = status.source.display;
    const escapedDisplay = display.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    replacements.push({ start: textSpan.start, end: textSpan.end, value: escapedDisplay });
    updates.push({ control: change.control, checked: change.current, state, display });
  }

  replacements.sort((a, b) => b.start - a.start);
  let updatedBody = body;
  let lastStart = body.length;
  for (const item of replacements) {
    if (item.start < 0 || item.end > lastStart || item.start >= item.end) {
      throw new Error("Invalid or overlapping status replacement offsets");
    }
    updatedBody = updatedBody.slice(0, item.start) + item.value + updatedBody.slice(item.end);
    lastStart = item.start;
  }
  return { body: updatedBody, updates };
}

async function synchronizeIssue(event, { request = globalThis.fetch } = {}) {
  const previousBody = event.changes?.body?.from;
  if (typeof previousBody !== "string") {
    throw new Error("Issue body edit event is missing changes.body.from");
  }
  if (event.issue?.number !== 2 || event.issue?.pull_request) {
    throw new Error("Only Issue #2 body edits are supported");
  }
  const repo = event.repository?.full_name;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || "")) {
    throw new Error("Invalid event repository name");
  }
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required");

  const previous = parseIssueBody(previousBody);
  const eventCurrent = parseIssueBody(event.issue.body);
  const changes = compareInputs(previous, eventCurrent);
  const changedInputs = changes.filter(change => change.changed);
  if (!changedInputs.length) {
    return { changedInputs: [], statusUpdates: [], action: "unchanged" };
  }

  const url = "https://api.github.com/repos/" + repo + "/issues/2";
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28"
  };
  async function api(method, body) {
    const response = await request(url, {
      method, headers: body === undefined ? headers : { ...headers, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify({ body }) })
    });
    if (!response.ok) {
      throw new Error("GitHub " + method + " issue request failed (" + response.status + "): " +
        (await response.text()).slice(0, 500));
    }
    return response.json();
  }

  // Read the newest body to avoid reverting edits that occurred after the event.
  const latestIssue = await api("GET");
  if (typeof latestIssue.body !== "string") throw new TypeError("Latest Issue body is not a string");
  const latest = parseIssueBody(latestIssue.body);
  const latestInputs = new Map(latest.inputs.map(input => [input.control, input.checked]));
  for (const change of changedInputs) {
    if (!latestInputs.has(change.control) || latestInputs.get(change.control) !== change.current) {
      return { changedInputs, statusUpdates: [], action: "stale-event-skipped" };
    }
  }

  const result = updateChangedStatuses(latestIssue.body, latest, changedInputs);
  if (result.body === latestIssue.body) {
    return { changedInputs, statusUpdates: result.updates, action: "already-synchronized" };
  }

  const writtenIssue = await api("PATCH", result.body);
  if (writtenIssue.body !== result.body) throw new Error("GitHub PATCH response body differs from intended body");
  const verifiedIssue = await api("GET");
  if (verifiedIssue.body !== result.body) {
    throw new Error("GitHub Issue body verification failed after PATCH");
  }
  return { changedInputs, statusUpdates: result.updates, action: "updated-and-verified" };
}

if (require.main === module) {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  synchronizeIssue(event)
    .then(result => console.log(JSON.stringify({ issue: event.issue.number, ...result }, null, 2)))
    .catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { parseIssueBody, compareInputs, updateChangedStatuses, synchronizeIssue };
