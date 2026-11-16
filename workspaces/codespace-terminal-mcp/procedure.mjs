import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { create, f } from '../2d-state-event-procedure-design/src/iterator.mjs';

// One nonce identifies one saved execution record throughout the procedure.
// A bare Procedure starts a run. Procedure {"nonce":"..."} replays it.
// Procedure {"nonce":"...","input":{...}} validates and advances it.
const root = process.env.MCP_PROCEDURE_STATE_DIR
  ?? join('/workspaces/.terminals-mcp', process.env.CODESPACE_NAME || 'local', 'procedures');

function fileFor(nonce) {
  if (typeof nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(nonce)) {
    throw new TypeError('Invalid procedure nonce');
  }
  return join(root, nonce + '.json');
}

async function load(nonce) {
  return JSON.parse(await readFile(fileFor(nonce), 'utf8'));
}

async function save(nonce, record) {
  await mkdir(root, { recursive: true });
  const target = fileFor(nonce);
  const temp = join(root, nonce + '.' + randomUUID() + '.tmp');
  await writeFile(temp, JSON.stringify(record), { mode: 0o600 });
  await rename(temp, target);
}

export async function Procedure(args = {}, { onTransition } = {}) {
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
    return f(args.input, args.nonce, { load, save, render, onTransition });
  }
  return f(undefined, args.nonce, { load, save, render, onTransition });
}
