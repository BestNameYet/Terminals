import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dispatchAliasReceipt, registerAlias } from './alias-dispatcher.mjs';

const record = {
  entry_type: 'SCRATCHPAD',
  content: { observation: 'Synthetic recorder test', arbitrary: [null, false, 0, { nested: [] }] }
};

async function makeRecorder(request) {
  const { createEOTRecorder } = await import('./eot-recorder.mjs');
  return createEOTRecorder({ request });
}

function githubStore(initial = null) {
  let records = initial;
  let revision = 0;
  const history = new Map();
  const writes = [];
  const path = 'repos/BestNameYet/Terminals/contents/conversations/analytics.json';
  return {
    writes,
    get records() { return records; },
    async request(method, route, { ref, body } = {}) {
      assert.equal(route, path);
      if (method === 'GET') {
        const snapshot = ref === 'main' ? records : history.get(ref);
        return snapshot === null ? { status: 404 } : {
          status: 200,
          data: { sha: String(revision), encoding: 'base64', content: Buffer.from(JSON.stringify(snapshot)).toString('base64') },
        };
      }
      assert.equal(method, 'PUT');
      assert.equal(body.branch, 'main');
      if (body.sha !== (records === null ? undefined : String(revision))) {
        return { status: 409 };
      }
      writes.push(body);
      records = JSON.parse(Buffer.from(body.content, 'base64').toString());
      const commit = String(++revision).padStart(40, 'a');
      history.set(commit, records);
      return { status: revision === 1 && initial === null ? 201 : 200, data: { commit: { sha: commit } } };
    },
  };
}

test('registered EOTRecorder appends one event per invocation and preserves preceding records', async () => {
  const legacy = { template_version: '1.0.0', conversation_id: 'legacy' };
  const store = githubStore([legacy]);
  registerAlias('EOTRecorder', await makeRecorder(store.request));
  const prompt = 'EOTRecorder ' + JSON.stringify(record);
  const first = await dispatchAliasReceipt(prompt);
  const second = await dispatchAliasReceipt(prompt);
  assert.equal(first.exitCode, 0, first.stderr);
  assert.equal(second.exitCode, 0, second.stderr);
  assert.equal(JSON.parse(first.outputThat[0]).index, 1);
  assert.equal(JSON.parse(second.outputThat[0]).index, 2);
  assert.equal(JSON.parse(first.outputThat[0]).message, 'Event appended and verified');
  assert.deepEqual(store.records, [legacy, record, record]);
  assert.equal(store.writes[0].message, 'Append conversation event');
});

test('all five recognized types accept unrestricted JSON content and arbitrary extra fields', async () => {
  const store = githubStore([]);
  const append = await makeRecorder(store.request);
  const types = ['BEGINNING_OF_TURN', 'SCRATCHPAD', 'JOURNAL', 'TASK_ANALYSIS', 'END_OF_TURN'];
  const inputs = types.map((entry_type, i) => ({
    entry_type,
    content: [undefined, null, false, 23, 'unstructured text'][i],
    unrelated_fields: { any: true },
    turn_id: 0,
    timestamp: 'not a timestamp',
  }));
  // Only JSON-serializable event content is submitted through the MCP interface.
  inputs[0].content = null;
  for (const input of inputs) {
    const receipt = await append(input);
    assert.equal(receipt.status, 'verified');
    assert.equal(receipt.entry_type, input.entry_type);
  }
  assert.deepEqual(store.records, inputs);
});

test('only entry_type is validated before GitHub is contacted', async () => {
  const append = await makeRecorder(() => assert.fail('Invalid event reached GitHub'));
  for (const input of [null, {}, [], 'SCRATCHPAD', { entry_type: 'scratchpad' },
    { entry_type: 'OTHER', content: 'x' }, { entry_type: null }]) {
    await assert.rejects(append(input), /Invalid entry_type/);
  }
});

test('concurrent writers retry against the latest revision without lost events', async () => {
  const store = githubStore();
  const append = await makeRecorder(store.request);
  const other = { entry_type: 'JOURNAL', content: 'Second event' };
  const receipts = await Promise.all([append(record), append(other)]);
  assert.deepEqual(receipts.map(({ index }) => index).sort(), [0, 1]);
  assert.equal(store.records.length, 2);
  assert.deepEqual(store.records.find(item => item.entry_type === 'SCRATCHPAD'), record);
  assert.deepEqual(store.records.find(item => item.entry_type === 'JOURNAL'), other);
});

test('a rejected write is reported without a second write', async () => {
  const store = githubStore([]);
  let attempts = 0;
  const append = await makeRecorder((method, ...args) => {
    if (method === 'GET') return store.request(method, ...args);
    attempts++;
    return { status: 403 };
  });
  await assert.rejects(append(record), /append.*403/i);
  assert.equal(attempts, 1);
});

test('a write acknowledgement with divergent readback fails without replay', async () => {
  const store = githubStore([]);
  const append = await makeRecorder(async (method, route, options) => {
    if (method === 'GET' && options.ref !== 'main') {
      return { status: 200, data: { encoding: 'base64', content: 'W10=' } };
    }
    return store.request(method, route, options);
  });
  await assert.rejects(append(record), /verification/i);
  assert.deepEqual(store.records, [record]);
});

test('an invalid existing JSON array leaves the destination untouched', async () => {
  const store = githubStore({ legacy: true });
  const append = await makeRecorder(store.request);
  await assert.rejects(append(record), /array/i);
  assert.deepEqual(store.records, { legacy: true });
  assert.equal(store.writes.length, 0);
});
