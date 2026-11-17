import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { appendNote, scratchpadFor, scratchpadSummary, validateScratchpadNote } from '../2d-state-event-procedure-design/src/scratchpad.mjs';
import * as legacy from '../2d-state-event-procedure-design/src/iterator.mjs';

// One nonce identifies one saved execution record throughout the procedure.
// A bare Procedure starts a run. Procedure {"nonce":"..."} replays it.
// Procedure {"nonce":"...","input":{...}} validates and advances it.
const root = process.env.MCP_PROCEDURE_STATE_DIR
  ?? join('/workspaces/.terminals-mcp', process.env.CODESPACE_NAME || 'local', 'procedures');

const pendingMutations = new Map();

async function serializeMutation(key, mutate) {
  const previous = pendingMutations.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(mutate);
  pendingMutations.set(key, current);
  try {
    return await current;
  } finally {
    if (pendingMutations.get(key) === current) pendingMutations.delete(key);
  }
}

function fileFor(directory, nonce) {
  if (typeof nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(nonce)) {
    throw new TypeError('Invalid procedure nonce');
  }
  return join(directory, nonce + '.json');
}

export async function Procedure(args = {}, { revised = false, onTransition } = {}) {
  const directory = revised ? join(root, 'revised') : root;
  const { create, f } = revised
    ? await import('../revised-procedure/src/iterator.mjs')
    : legacy;
  const load = async nonce => JSON.parse(await readFile(fileFor(directory, nonce), 'utf8'));
  const save = async (nonce, record) => {
    await mkdir(directory, { recursive: true });
    const target = fileFor(directory, nonce);
    const temp = join(directory, nonce + '.' + randomUUID() + '.tmp');
    try {
      await writeFile(temp, JSON.stringify(record), { mode: 0o600 });
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true }).catch(() => {});
      throw error;
    }
  };
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new TypeError('Procedure requires an argument object');
  }
  const keys = Object.keys(args);
  if (keys.some(key => !['nonce', 'input', 'scratchpadMode', 'scratchpad'].includes(key))) {
    throw new TypeError('Unrecognized Procedure argument');
  }
  const renderFor = nonce => (projection, record) =>
    ({ nonce, projection, scratchpad: scratchpadSummary(record) });
  if (!Object.hasOwn(args, 'nonce')) {
    if (Object.hasOwn(args, 'input') || Object.hasOwn(args, 'scratchpad')) {
      throw new TypeError('Input and scratchpad operations require a nonce');
    }
    const scratchpadMode = Object.hasOwn(args, 'scratchpadMode') ? args.scratchpadMode : 'mandatory';
    if (scratchpadMode !== 'mandatory') throw new TypeError('Scratchpad notes are mandatory; optional mode is not permitted');
    const nonce = randomUUID();
    // The new run is persisted before its first projection is returned.
    return create(nonce, { save, onTransition, scratchpadMode, render: renderFor(nonce) });
  }
  const { nonce } = args;
  const key = fileFor(directory, nonce);
  const render = renderFor(nonce);
  if (Object.hasOwn(args, 'scratchpadMode')) throw new TypeError('Scratchpad mode is set at creation');
  if (Object.hasOwn(args, 'scratchpad')) {
    if (Object.hasOwn(args, 'input')) throw new TypeError('Choose scratchpad or state input');
    if (args.scratchpad === true) {
      const record = await load(nonce);
      return { nonce, completed: Boolean(record.completed), scratchpad: scratchpadFor(record) };
    }
    const request = args.scratchpad;
    const validation = validateScratchpadNote(request);
    if (!validation.valid) {
      const details = validation.errors.map(issue => (issue.instancePath || '/') + ' ' + issue.message).join('; ');
      throw new TypeError('Invalid scratchpad append: ' + details);
    }
    return serializeMutation(key, async () => {
      const record = await load(nonce);
      const entry = appendNote(record, request.note);
      await save(nonce, record);
      return { nonce, entry, scratchpad: scratchpadSummary(record) };
    });
  }
  if (Object.hasOwn(args, 'input')) {
    return serializeMutation(key, () => f(args.input, nonce, { load, save, render, onTransition }));
  }
  return f(undefined, nonce, { load, save, render, onTransition });
}
