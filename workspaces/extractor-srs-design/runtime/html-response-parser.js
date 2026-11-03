#!/usr/bin/env node
"use strict";

/**
 * EXT-SRS-001 candidate: post-validation HTML parser.
 * Inputs: already validated public-share URL and captured response HTML bytes.
 * Output: decoded source conversation, source-linear projection, selected-text
 * branch projection, and diagnostics in memory. No HTTP, eval, Git or file writes.
 * This module is intentionally NOT an end-to-end export or verification receipt.
 */
const { TextDecoder } = require("node:util");

const LIMITS = Object.freeze({
  htmlBytes: 25 * 1024 * 1024,
  slots: 300000,
  candidates: 32,
  graphNodes: 300000,
  depth: 100,
  ancestry: 300000
});
class ParseError extends Error {
  constructor(code, message) { super(message); this.name = "ParseError"; this.code = code; }
}
function fail(code, message) { throw new ParseError(code, message); }
function object(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
function own(x, k) { return Object.prototype.hasOwnProperty.call(x, k); }
function limitOptions(options) {
  if (!object(options)) fail("INVALID_OPTIONS", "options must be an object");
  const out = {};
  for (const [key, maximum] of Object.entries(LIMITS)) {
    const v = options[key] === undefined ? maximum : options[key];
    if (!Number.isSafeInteger(v) || v < 1 || v > maximum) fail("INVALID_LIMIT", "invalid limit: " + key);
    out[key] = v;
  }
  if (Object.keys(options).some(k => !own(LIMITS, k))) fail("INVALID_OPTIONS", "unknown limit option");
  return out;
}
function htmlText(html, limits) {
  let bytes;
  if (typeof html === "string") bytes = Buffer.from(html, "utf8");
  else if (Buffer.isBuffer(html) || html instanceof Uint8Array) bytes = Buffer.from(html);
  else fail("INVALID_HTML", "HTML must be a string or byte buffer");
  if (!bytes.length || bytes.length > limits.htmlBytes) fail("HTML_SIZE", "empty or oversized HTML response");
  try { return new TextDecoder("utf-8", { fatal:true }).decode(bytes); }
  catch { fail("INVALID_UTF8", "HTML response is not valid UTF-8"); }
}
function tablesFromHtml(html, limits) {
  const scripts = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  const calls = /window\.__reactRouterContext\.streamController\.enqueue\(\s*("(?:\\.|[^"\\])*")\s*\)/g;
  let script, tableCandidates = [], scriptCandidates = 0, matchingCalls = 0;
  while ((script = scripts.exec(html)) !== null) {
    if (!script[1].includes("window.__reactRouterContext.streamController.enqueue")) continue;
    scriptCandidates++;
    calls.lastIndex = 0;
    let call;
    while ((call = calls.exec(script[1])) !== null) {
      matchingCalls++;
      let decoded;
      try { decoded = JSON.parse(call[1]); }
      catch { fail("INVALID_ENQUEUE", "enqueue argument is not a JSON string literal"); }
      if (typeof decoded !== "string" || !decoded.trimStart().startsWith("[")) continue;
      let table;
      try { table = JSON.parse(decoded); }
      catch { fail("INVALID_TABLE", "serialized table is not valid JSON"); }
      if (!Array.isArray(table) || !table.length || table.length > limits.slots)
        fail("INVALID_TABLE", "serialized table missing or exceeds slot limit");
      tableCandidates.push(table);
      if (tableCandidates.length > limits.candidates) fail("TOO_MANY_CANDIDATES", "too many table candidates");
    }
  }
  if (!tableCandidates.length) fail("MISSING_STREAM", "no recognized React Router array payload");
  return { tables: tableCandidates, scriptCandidates, matchingCalls };
}
function decodeTable(table, limits) {
  const state = new Uint8Array(table.length); // 0 new, 1 visiting, 2 complete
  const memo = new Array(table.length);
  let nodes = 0;
  function resolve(slot, depth) {
    if (depth > limits.depth) fail("MAX_DEPTH", "serialized reference depth exceeded");
    if (slot === -1 || slot === -5) return { "$serializedType": "undefined" };
    if (slot === -2) return { "$serializedType": "NaN" };
    if (slot === -3) return { "$serializedType": "Infinity" };
    if (slot === -4) return { "$serializedType": "-Infinity" };
    if (!Number.isInteger(slot) || slot < 0 || slot >= table.length)
      fail("INVALID_REFERENCE", "serialized index out of range: " + String(slot));
    if (state[slot] === 1) fail("CYCLIC_REFERENCE", "cyclic indexed reference at " + slot);
    if (state[slot] === 2) return memo[slot];
    if (++nodes > limits.graphNodes) fail("GRAPH_LIMIT", "decoded graph node limit exceeded");
    state[slot] = 1;
    const raw = table[slot];
    let value;
    if (Array.isArray(raw)) {
      if (raw.length === 2 && raw[0] === "D") {
        if (typeof raw[1] !== "string" || !Number.isFinite(Date.parse(raw[1])))
          fail("INVALID_DATE", "invalid serialized Date");
        value = { "$serializedType":"Date", "value":raw[1] };
      } else if (raw.length === 2 && typeof raw[0] === "string" && raw[0] === "P") {
        fail("UNSUPPORTED_TAG", "unresolved Promise tag is unsupported by complete export");
      } else if (raw.length && typeof raw[0] === "string" && /^[A-Z]$/.test(raw[0])) {
        fail("UNSUPPORTED_TAG", "unsupported tagged array: " + raw[0]);
      } else {
        value = raw.map(x => resolve(x, depth + 1));
      }
    } else if (object(raw)) {
      value = Object.create(null);
      for (const [encodedKey, item] of Object.entries(raw)) {
        if (!/^_\d+$/.test(encodedKey)) fail("INVALID_OBJECT_KEY", "unexpected serialized object key");
        const keySlot = Number(encodedKey.slice(1));
        if (!Number.isSafeInteger(keySlot) || typeof table[keySlot] !== "string")
          fail("INVALID_OBJECT_KEY", "invalid indexed property name");
        const name = table[keySlot];
        if (own(value, name)) fail("DUPLICATE_PROPERTY", "decoded object repeats property: " + name);
        Object.defineProperty(value, name, { value:resolve(item, depth + 1), enumerable:true, writable:true, configurable:true });
      }
    } else {
      value = raw;
    }
    state[slot] = 2;
    memo[slot] = value;
    return value;
  }
  return { root:resolve(0, 0), decodedSlots:nodes };
}
function findConversation(root, limits) {
  const candidates = new Set(), visited = new Set();
  const queue = [{value:root, depth:0}];
  for (let i = 0; i < queue.length; i++) {
    if (queue.length > limits.graphNodes) fail("GRAPH_LIMIT", "conversation discovery limit exceeded");
    const {value, depth} = queue[i];
    if (value === null || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    if (object(value) && typeof value.conversation_id === "string" &&
        (own(value, "linear_conversation") || own(value, "mapping"))) candidates.add(value);
    if (depth >= limits.depth) continue;
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") queue.push({value:child,depth:depth+1});
    }
  }
  if (!candidates.size) fail("MISSING_CONVERSATION", "serialized data has no conversation candidate");
  if (candidates.size !== 1) fail("AMBIGUOUS_CONVERSATION", "multiple conversation candidates");
  return [...candidates][0];
}
function textParts(message) {
  const parts = message && message.content && message.content.parts;
  if (!Array.isArray(parts)) return null;
  const pieces = parts.filter(p => typeof p === "string");
  if (!pieces.length) return null;
  const result = pieces.join("\n").trimEnd();
  return result.trim() ? result : null;
}
function linearProjection(conversation) {
  const source = conversation.linear_conversation;
  if (!Array.isArray(source) || source.length === 0)
    fail("MISSING_LINEAR", "complete export requires a nonempty linear_conversation array");
  const duplicateIds = [], seenIds = new Set();
  const records = source.map((raw_node, index) => {
    const good = object(raw_node);
    const message = good && object(raw_node.message) ? raw_node.message : null;
    const node_id = good && typeof raw_node.id === "string" ? raw_node.id : null;
    if (node_id !== null) { if (seenIds.has(node_id)) duplicateIds.push(node_id); seenIds.add(node_id); }
    return {
      index, node_id,
      parent:good && typeof raw_node.parent === "string" ? raw_node.parent : null,
      record_kind:!good ? "malformed" : message ? "message" : "no_message",
      role:message && typeof message.author?.role === "string" ? message.author.role : null,
      author_name:message && typeof message.author?.name === "string" ? message.author.name : null,
      channel:message && typeof message.channel === "string" ? message.channel : null,
      recipient:message && typeof message.recipient === "string" ? message.recipient : null,
      create_time: message?.create_time ?? null,
      update_time: message?.update_time ?? null,
      content_type:message && typeof message.content?.content_type === "string" ? message.content.content_type : null,
      status:message && typeof message.status === "string" ? message.status : null,
      end_turn:message?.end_turn ?? null,
      model_slug:message && typeof message.metadata?.model_slug === "string" ? message.metadata.model_slug : null,
      derived_text:message ? textParts(message) : null,
      raw_node
    };
  });
  return {records, source_node_count:records.length,
    message_count:records.filter(r => r.record_kind === "message").length,
    duplicate_ids:duplicateIds};
}
function selectedProjection(conversation, limits) {
  const mapping = conversation.mapping;
  const current = conversation.current_node;
  if (!object(mapping) || typeof current !== "string" || !current)
    fail("MISSING_BRANCH", "selected branch requires mapping and current_node");
  const visited = new Set(), chain = [];
  let cursor = current;
  while (cursor !== null) {
    if (chain.length >= limits.ancestry) fail("ANCESTRY_LIMIT", "selected ancestry exceeds limit");
    if (visited.has(cursor)) fail("CYCLIC_PARENT", "selected branch parent cycle");
    visited.add(cursor);
    if (!own(mapping, cursor) || !object(mapping[cursor])) fail("MISSING_PARENT", "missing selected branch node: " + cursor);
    const node = mapping[cursor];
    chain.push({id:cursor,node});
    const parent = node.parent;
    if (parent !== null && parent !== undefined && typeof parent !== "string")
      fail("INVALID_PARENT", "parent link is not a string or null");
    cursor = parent ?? null;
  }
  chain.reverse();
  const counts = {user:0, commentary:0, final:0};
  const messages = [], included_ids = [];
  for (const {id,node} of chain) {
    const m = node.message;
    if (!object(m)) continue;
    const role = m.author?.role, channel = m.channel ?? null;
    if (role !== "user" && !(role === "assistant" && (channel === "commentary" || channel === "final"))) continue;
    const text = textParts(m);
    if (text === null) continue;
    const kind = role === "user" ? "user" : channel;
    counts[kind]++;
    included_ids.push(id);
    messages.push({role, channel:role === "user" ? null : channel, text});
  }
  if (!counts.user || !counts.final) fail("INCOMPLETE_BRANCH", "selected branch requires user and assistant final text");
  return { messages, counts, included_ids, ancestry_ids:chain.map(x => x.id), ancestry_nodes:chain.length };
}
function parseHtmlResponse(html, validated, options = {}) {
  if (!object(validated) || typeof validated.target_url !== "string" ||
      !/^https:\/\/chatgpt\.com\/share\/[a-f0-9-]{36}(?:\/|\?|$)/i.test(validated.target_url))
    fail("INPUT_NOT_VALIDATED", "expected normalized validated.target_url from preceding admission step");
  const limits = limitOptions(options);
  const text = htmlText(html, limits);
  const streams = tablesFromHtml(text, limits);
  const candidates = [];
  for (const table of streams.tables) {
    let decoded;
    try { decoded = decodeTable(table, limits); }
    catch (err) { if (err instanceof ParseError) throw err; throw err; }
    try {
      const conversation = findConversation(decoded.root, limits);
      candidates.push({conversation, decodedSlots:decoded.decodedSlots, tableSlots:table.length});
    } catch (error) {
      if (!(error instanceof ParseError) || error.code !== "MISSING_CONVERSATION") throw error;
    }
  }
  if (!candidates.length) fail("MISSING_CONVERSATION", "no serialized stream held a conversation");
  if (candidates.length !== 1) fail("AMBIGUOUS_CONVERSATION", "multiple conversation-bearing streams");
  const {conversation, decodedSlots, tableSlots} = candidates[0];
  const linear = linearProjection(conversation);
  const selected = selectedProjection(conversation, limits);
  const linearIds = linear.records.map(x => x.node_id).filter(x => x !== null);
  const a = new Set(linearIds), b = new Set(selected.ancestry_ids);
  const comparisonAvailable = linearIds.length === linear.records.length &&
    a.size === linearIds.length && b.size === selected.ancestry_ids.length;
  return {
    schema:"chatgpt.html-response-parser.candidate.v1",
    decoder:{name:"react-router-indexed",version:"candidate-1"},
    conversation,
    linear,
    selected,
    diagnostics:{
      discovery:{script_candidates:streams.scriptCandidates,payload_candidates:streams.tables.length,matching_calls:streams.matchingCalls,conversation_candidates:candidates.length},
      counts:{serialization_slots:tableSlots,decoded_slots:decodedSlots,linear_nodes:linear.source_node_count,linear_messages:linear.message_count,ancestry_nodes:selected.ancestry_nodes,selected_visible_messages:selected.messages.length},
      duplicate_ids:linear.duplicate_ids,
      linear_vs_selected:{
        comparison_available:comparisonAvailable,
        linear_only_ids:comparisonAvailable ? linearIds.filter(id => !b.has(id)) : [],
        selected_only_ids:comparisonAvailable ? selected.ancestry_ids.filter(id => !a.has(id)) : [],
        order_difference:comparisonAvailable ? JSON.stringify(linearIds.filter(id=>b.has(id))) !== JSON.stringify(selected.ancestry_ids.filter(id=>a.has(id))) : null
      }
    }
  };
}
module.exports = { ParseError, LIMITS, parseHtmlResponse, decodeTable, findConversation,
  linearProjection, selectedProjection, tablesFromHtml };