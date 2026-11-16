import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
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
  if (keys.some(key => !['nonce', 'input'].includes(key))) {
    throw new TypeError('Unrecognized Procedure argument');
  }
  const render = projection => ({ nonce: args.nonce, projection });
  if (!Object.hasOwn(args, 'nonce')) {
    if (Object.hasOwn(args, 'input')) throw new TypeError('Input requires nonce');
    const nonce = randomUUID();
    // The new run is persisted before its first projection is returned.
    return create(nonce, { save, onTransition, render: projection => ({ nonce, projection }) });
  }
  if (Object.hasOwn(args, 'input')) {
    return serializeMutation(fileFor(directory, args.nonce), () =>
      f(args.input, args.nonce, { load, save, render, onTransition }));
  }
  return f(undefined, args.nonce, { load, save, render, onTransition });
}
