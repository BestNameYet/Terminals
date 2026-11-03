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
      statuses.push({ control: attrs["data-control"], state: attrs["data-status"],
        stateMap, displayMap, text: innerText,
        source: { start: loc.startOffset, end: loc.endOffset } });
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

if (require.main === module) {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const previousBody = event.changes?.body?.from;
  if (typeof previousBody !== "string") {
    throw new Error("Issue body edit event is missing changes.body.from");
  }
  const previous = parseIssueBody(previousBody);
  const current = parseIssueBody(event.issue.body);
  const comparisons = compareInputs(previous, current);
  console.log(JSON.stringify({
    issue: event.issue.number,
    comparisons,
    changedInputs: comparisons.filter(item => item.changed)
  }, null, 2));
}

module.exports = { parseIssueBody, compareInputs };
