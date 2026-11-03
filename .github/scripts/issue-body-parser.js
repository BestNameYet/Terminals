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

if (require.main === module) {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const current = parseIssueBody(event.issue.body);
  const previous = event.changes?.body?.from == null ? null : parseIssueBody(event.changes.body.from);
  console.log(JSON.stringify({ issue: event.issue.number, previous, current }, null, 2));
}

module.exports = { parseIssueBody };
