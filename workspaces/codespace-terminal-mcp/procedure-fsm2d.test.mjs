import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dispatchAliasReceipt } from './alias-dispatcher.mjs';
import * as original from '../2d-state-event-procedure-design/src/iterator.mjs';
import * as revised from '../revised-procedure/src/iterator.mjs';

test('both tables contain callable cells and preserve the original research matrix', async () => {
  const matrix = JSON.parse(await readFile(new URL(
    '../2d-state-event-procedure-design/research/fsm2d-matrix.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(original.table), matrix.state_axis);
  for (const [profile, count] of [[original, 14], [revised, 13]]) {
    assert.equal(Object.keys(profile.table).length, count);
    for (const [state, row] of Object.entries(profile.table)) {
      assert.deepEqual(Object.keys(row), matrix.event_axis);
      for (const cell of Object.values(row)) assert.equal(typeof cell.handle, 'function');
      if (profile === original && state !== 'COMPLETE') {
        assert.equal(row.E_RETURN.routes.default.next, matrix.cells[state].E_RETURN.on_accept);
      }
    }
  }
});

test('mutation serializes against the latest saved state and ignores observer failures', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'procedure-matrix-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  const { Procedure } = await import('./procedure.mjs');
  const { nonce } = await Procedure({}, { onTransition() { throw new Error('monitor'); } });
  const [first, second] = await Promise.all([
    Procedure({ nonce, input: { verbatim_request: 'first' } }, {
      async onTransition() { throw new Error('monitor'); }
    }),
    Procedure({ nonce, input: { verbatim_request: 'second' } })
  ]);
  assert.equal(first.projection.keyword, 'user_intent');
  assert.equal(second.projection.keyword, 'user_intent');
  assert.equal(second.projection.context.verbatim_request, 'first');
  assert.ok(second.projection.error_message);
});

test('revised alias skips optional questions and repairs a failed preflight', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'procedure-revised-matrix-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  const { Procedure } = await import('./procedure.mjs?revised-fsm-test');
  const registry = new Map([['Procedure', Procedure]]);
  const call = async prompt => {
    const result = await dispatchAliasReceipt(prompt, registry);
    assert.equal(result.exitCode, 0, result.stderr);
    return JSON.parse(result.outputThat[0]);
  };
  const { nonce } = await call('Procedure -r');
  const command = 'Procedure -r ' + nonce;
  const submit = input => call(command + ' ' + JSON.stringify(input));
  const intent = { intent: 'Design', objectives: [], constraints: ['Design only'], requested_outcome: 'Report' };
  await submit({ verbatim_request: 'Design a report' });
  const orient = await submit({ user_intent: intent });
  assert.equal(orient.projection.keyword, 'current_state');
  assert.deepEqual(orient.projection.context.user_intent, intent);
  await submit({ current_state: { description: 'Observed', observations: [], unknowns: [] } });
  assert.equal((await submit({ clarifying_questions: [] })).projection.keyword, 'desired_state');

  const path = join(dir, 'revised', nonce + '.json');
  const { inputs } = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(inputs.question_answers, []);
  const step = {
    id: 'S1', change_ids: ['R1'], action_ids: ['A1'], action: 'Write report',
    expected_change: 'Report available', verification: 'Read report', depends_on: []
  };
  const condition = { id: 'C1', requirement: 'Report', verification: 'Read report' };
  Object.assign(inputs, {
    desired_state: { description: 'Report', conditions: [condition] },
    required_changes: [{ id: 'R1', condition_ids: ['C1'] }],
    agent_actions: [{ id: 'A1', change_ids: ['R1'] }],
    execution_procedure: { steps: [step] }
  });
  const state = await revised.buildState('simulation_results', inputs);
  await writeFile(path, JSON.stringify({ state, inputs }));
  const checklist = [{ condition_id: 'C1', expected: 'Report', simulated: 'Report', passed: true, discrepancy: '' }];
  const simulation = {
    steps: [{ step_id: 'S1', simulated_result: 'Report', passed: true }],
    checklist, matches_desired_state: true, revisions: []
  };
  const blocked = { ...simulation, revisions: ['Specify the output path'] };
  const repair = await submit({ simulation_results: blocked });
  assert.equal(repair.projection.keyword, 'execution_procedure');
  assert.deepEqual(repair.projection.context.repair.revisions, blocked.revisions);
  assert.deepEqual(await call(command), repair);
  await submit({ execution_procedure: { steps: [{ ...step, action: 'Write report.md' }] } });
  const execute = await submit({ simulation_results: simulation });
  assert.equal(execute.projection.keyword, 'execution_results');
  const saved = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(saved.planAttempts[0].simulation_results, blocked);
  assert.equal(saved.repair, undefined);
});

test('failed save leaves a previously loaded record intact', async () => {
  const saved = { state: await original.buildState('verbatim_request', {}), inputs: {} };
  const snapshot = structuredClone(saved);
  await assert.rejects(original.f({ verbatim_request: 'test' }, 'nonce', {
    load: async () => saved,
    save: async () => { throw new Error('write failed'); },
    render: () => assert.fail('rendered after failed save')
  }), /write failed/);
  assert.deepEqual(saved, snapshot);
});
