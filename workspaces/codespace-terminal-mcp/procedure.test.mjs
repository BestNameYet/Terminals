import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

test('Procedure saves and replays a completion receipt with all accepted inputs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'procedure-completion-'));
  const old = process.env.MCP_PROCEDURE_STATE_DIR;
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  try {
    const { Procedure } = await import('./procedure.mjs?completion-test');
    const { buildState } = await import('../2d-state-event-procedure-design/src/iterator.mjs');
    const { nonce } = await Procedure();
    const condition = { condition_id: 'c1', expected: 'ready', simulated: 'ready', passed: true };
    const inputs = {
      simulation_results: { checklist: [condition] },
      execution_results: { steps: [] }
    };
    const state = await buildState('post_execution_diagnostic', inputs);
    const path = join(dir, nonce + '.json');
    await writeFile(path, JSON.stringify({ state, inputs }));

    const wrong = { post_execution_diagnostic: { checklist: [], overall_result: 'pass' } };
    const retry = await Procedure({ nonce, input: wrong });
    assert.equal(retry.projection.keyword, state.keyword);
    assert.ok(retry.projection.error_message);

    const final = {
      checklist: [{ ...condition, actual: 'ready', status: 'pass', discrepancy: '', evidence: ['readback'] }],
      overall_result: 'pass'
    };
    const receipt = {
      completed: true,
      message: 'Procedure complete.',
      nonce,
      inputs: { ...inputs, post_execution_diagnostic: final }
    };
    const registry = new Map([['Procedure', Procedure]]);
    const call = async (args) => {
      const result = await dispatchAliasReceipt('Procedure ' + JSON.stringify(args), registry);
      assert.equal(result.exitCode, 0, result.stderr);
      return result.outputThat[0];
    };
    const completed = await call({ nonce, input: { post_execution_diagnostic: final } });
    assert.deepEqual(JSON.parse(completed), receipt);
    const saved = await readFile(path, 'utf8');
    assert.deepEqual(JSON.parse(saved).completionReceipt, receipt);
    assert.equal(await call({ nonce }), completed);
    assert.equal(await call({ nonce, input: wrong }), completed);
    assert.equal(await readFile(path, 'utf8'), saved);

    // Records completed by earlier versions have no stored receipt.
    const { completionReceipt, ...legacy } = JSON.parse(saved);
    await writeFile(path, JSON.stringify(legacy));
    assert.equal(await call({ nonce }), completed);
    assert.equal(await call({ nonce, input: wrong }), completed);
  } finally {
    if (old === undefined) delete process.env.MCP_PROCEDURE_STATE_DIR;
    else process.env.MCP_PROCEDURE_STATE_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});

test('both profiles persist mandatory scratchpads and serialize notes with advancement', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'procedure-scratchpad-'));
  const old = process.env.MCP_PROCEDURE_STATE_DIR;
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  try {
    const { Procedure } = await import('./procedure.mjs?scratchpad-test');
    const registry = new Map([['Procedure', Procedure]]);
    const call = async prompt => {
      const receipt = await dispatchAliasReceipt(prompt, registry);
      assert.equal(receipt.exitCode, 0, receipt.stderr);
      return JSON.parse(receipt.outputThat[0]);
    };
    for (const revised of [false, true]) {
      const prefix = revised ? 'Procedure -r' : 'Procedure';
      const { nonce, projection } = await call(prefix + ' --scratchpad=mandatory');
      const submit = input => call(revised
        ? prefix + ' ' + nonce + ' ' + JSON.stringify(input)
        : prefix + ' ' + JSON.stringify({ nonce, input }));
      const note = prefix + ' ' + nonce + ' --scratchpad';
      const input = { verbatim_request: 'Design a report' };
      const blocked = await submit(input);
      assert.equal(blocked.projection.error_message.errortype, 'scratchpad.note_required');
      assert.deepEqual(blocked.projection.final_schema, projection.final_schema);
      await Promise.all([
        call(note + ' {"note":"First observation"}'),
        call(note + ' {"note":"Second observation"}')
      ]);
      const advanced = await submit(input);
      assert.equal(advanced.projection.keyword, 'user_intent');
      assert.equal(advanced.scratchpad.revision, 2);
      const history = await call(note);
      assert.deepEqual(history.scratchpad.entries.map(entry => [entry.sequence, entry.revision]), [[1, 1], [2, 1]]);
      const intent = { intent: 'Design', objectives: [], constraints: [], requested_outcome: 'Report' };
      assert.equal((await submit({ user_intent: intent })).projection.error_message.errortype, 'scratchpad.note_required');
    }
  } finally {
    if (old === undefined) delete process.env.MCP_PROCEDURE_STATE_DIR;
    else process.env.MCP_PROCEDURE_STATE_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});
