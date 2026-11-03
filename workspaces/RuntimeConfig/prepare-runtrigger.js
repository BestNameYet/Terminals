"use strict";

const fs = require("node:fs");
const path = require("node:path");

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const comment = JSON.parse(event.comment.body);
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

if (!isObject(comment)) {
  throw new Error("Issue comment must be a JSON object.");
}
if (!Object.prototype.hasOwnProperty.call(comment, "set")) {
  throw new Error("JSON must contain a set object.");
}
// Issue #10 documents lowercase runpath. Preserve legacy runPath inputs, but
// reject ambiguous or additional keys rather than guessing user intent.
const canonical = Object.prototype.hasOwnProperty.call(comment, "runpath");
const legacy = Object.prototype.hasOwnProperty.call(comment, "runPath");
if (canonical === legacy || Object.keys(comment).length !== 2) {
  throw new Error("JSON must contain exactly runpath (or legacy runPath) and set.");
}
const runPath = canonical ? comment.runpath : comment.runPath;
if (typeof runPath !== "string" || !runPath.trim()) {
  throw new Error("JSON must contain a nonempty string runpath.");
}
if (path.isAbsolute(runPath) || /[\r\n\0]/.test(runPath) ||
    runPath.split(/[\\/]/).includes("..")) {
  throw new Error("runPath must be a relative RuntimeConfig subfolder.");
}

const base = path.resolve("workspaces/RuntimeConfig");
const requested = runPath.startsWith("workspaces/RuntimeConfig/")
  ? path.resolve(runPath)
  : path.resolve(base, runPath);
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return !!relative && relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
};
if (!inside(base, requested)) {
  throw new Error("runPath is not a RuntimeConfig subfolder.");
}

const actualBase = fs.realpathSync(base);
const directory = fs.realpathSync(requested);
if (!inside(actualBase, directory) || !fs.statSync(directory).isDirectory()) {
  throw new Error("runPath must resolve to an existing RuntimeConfig subfolder.");
}
const trigger = fs.realpathSync(path.join(directory, "runtrigger.json"));
if (path.dirname(trigger) !== directory || !fs.statSync(trigger).isFile()) {
  throw new Error("Selected subfolder must contain a regular runtrigger.json.");
}

let triggerToRun = trigger;
let created = false;

if (Object.prototype.hasOwnProperty.call(comment, "set")) {
  if (!isObject(comment.set)) {
    throw new Error("set must be a JSON object.");
  }
  const template = JSON.parse(fs.readFileSync(trigger, "utf8"));
  if (!isObject(template)) {
    throw new Error("runtrigger.json must contain a JSON object.");
  }

  function assertPopulated(value, location) {
    if (value === null || value === undefined) {
      throw new Error(location + " must not be null.");
    }
    if (typeof value === "string" && !value.trim()) {
      throw new Error(location + " must not be empty.");
    }
    if (Array.isArray(value)) {
      if (value.length === 0) throw new Error(location + " must not be empty.");
      value.forEach((item, i) => assertPopulated(item, location + "[" + i + "]"));
    } else if (isObject(value)) {
      if (Object.keys(value).length === 0) {
        throw new Error(location + " must not be empty.");
      }
      for (const [key, item] of Object.entries(value)) {
        assertPopulated(item, location + "." + key);
      }
    }
  }

  function applyExactSet(templateValue, suppliedValue, location = "set") {
    if (isObject(templateValue)) {
      if (!isObject(suppliedValue)) {
        throw new Error(location + " must be an object matching the template.");
      }
      const required = Object.keys(templateValue);
      const actual = Object.keys(suppliedValue);
      const missing = required.filter(key =>
        !Object.prototype.hasOwnProperty.call(suppliedValue, key));
      const extra = actual.filter(key =>
        !Object.prototype.hasOwnProperty.call(templateValue, key));
      if (missing.length || extra.length) {
        throw new Error(location + " keys must match runtrigger.json exactly; missing: " +
          JSON.stringify(missing) + "; extra: " + JSON.stringify(extra));
      }
      for (const key of required) {
        templateValue[key] = applyExactSet(
          templateValue[key], suppliedValue[key], location + "." + key);
      }
      return templateValue;
    }

    if (Array.isArray(templateValue)) {
      if (!Array.isArray(suppliedValue) ||
          suppliedValue.length !== templateValue.length ||
          suppliedValue.length === 0) {
        throw new Error(location + " must have the same nonempty array structure.");
      }
      return templateValue.map((value, i) =>
        applyExactSet(value, suppliedValue[i], location + "[" + i + "]"));
    }

    assertPopulated(suppliedValue, location);
    if (typeof suppliedValue === "object" ||
        (templateValue !== null &&
         typeof suppliedValue !== typeof templateValue)) {
      throw new Error(location + " must be a populated scalar matching the template type.");
    }
    return suppliedValue;
  }

  // metadata is maintained by the template and is not part of the set contract.
  const setTemplate = Object.fromEntries(
    Object.entries(template).filter(([key]) => key !== "metadata")
  );
  applyExactSet(setTemplate, comment.set);
  for (const key of Object.keys(setTemplate)) {
    template[key] = setTemplate[key];
  }

  const id = event.comment.id;
  const number = event.issue.number;
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid event comment ID or issue number.");
  }
  const timestamp = new Date(event.comment.created_at).toISOString()
    .replace(/[-:.]/g, "");
  const name = "runtrigger_" + id + "_issue" + number + "_" + timestamp + ".json";
  triggerToRun = path.join(directory, name);
  fs.writeFileSync(triggerToRun, JSON.stringify(template, null, 2) + "\n", {
    flag: "wx", encoding: "utf8"
  });
  created = true;
}

const triggerPath = path.relative(process.cwd(), triggerToRun);
fs.appendFileSync(process.env.GITHUB_ENV,
  "RUNTRIGGER_PATH=" + triggerPath + "\n" +
  "CREATED_TRIGGER=" + String(created) + "\n");
console.log("Validated RUNTRIGGER_PATH=" + triggerPath);
