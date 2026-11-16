import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dispatchAliasReceipt } from './alias-dispatcher.mjs';

test('Procedure accepts no argument and makes nonce replay available', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'procedure-alias-'));
  const old = process.env.MCP_PROCEDURE_STATE_DIR;
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  try {
    // The Procedure module resolves its root at import time.
    const { Procedure } = await import('./procedure.mjs');
    const registry = new Map([['Procedure', Procedure]]);
    const created = await dispatchAliasReceipt('Procedure', registry);
    assert.equal(created.exitCode, 0, created.stderr);
    const initial = JSON.parse(created.outputThat[0]);
    assert.equal(initial.projection.keyword, 'verbatim_request');
    assert.ok(initial.nonce);
    assert.ok(initial.projection.final_schema);
    const replayed = await dispatchAliasReceipt('Procedure ' + JSON.stringify({ nonce: initial.nonce }), registry);
    assert.equal(replayed.exitCode, 0, replayed.stderr);
    assert.deepEqual(JSON.parse(replayed.outputThat[0]), initial);
    const rejected = await dispatchAliasReceipt('Procedure ' + JSON.stringify({ nonce: initial.nonce, input: {wrong:1} }), registry);
    assert.equal(rejected.exitCode, 0, rejected.stderr);
    const rejectedValue = JSON.parse(rejected.outputThat[0]);
    assert.equal(rejectedValue.projection.keyword, 'verbatim_request');
    assert.ok(rejectedValue.projection.error_message);
    const advanced = await dispatchAliasReceipt('Procedure ' + JSON.stringify({ nonce: initial.nonce, input: {verbatim_request:'Example prompt'} }), registry);
    assert.equal(advanced.exitCode, 0, advanced.stderr);
    const next = JSON.parse(advanced.outputThat[0]);
    assert.equal(next.nonce, initial.nonce);
    assert.equal(next.projection.keyword, 'user_intent');
    assert.equal(next.projection.context.verbatim_request, 'Example prompt');
  } finally {
    if (old === undefined) delete process.env.MCP_PROCEDURE_STATE_DIR;
    else process.env.MCP_PROCEDURE_STATE_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});
