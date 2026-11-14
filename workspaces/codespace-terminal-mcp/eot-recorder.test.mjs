import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dispatchAliasReceipt, registerAlias } from './alias-dispatcher.mjs';

const record = {
  "template_id": "terminals.conversation-record",
  "template_version": "1.1.0",
  "task_type": "user_prompt_and_agent_response_contextual_analysis",
  "turn_id": 1,
  "timestamp": 1794678400,
  "created_at_utc": "2026-11-14T00:00:00Z",
  "target_exchange": {
    "verbatim_utterance": "Synthetic EOTRecorder smoke-test prompt.",
    "summary_of_adjacent_conversation": {
      "preceding_user_turn_count": 0,
      "preceding_user_turns_chronological": [],
      "immediate_preceding_agent_response": null,
      "sequence_summary": "First turn of the synthetic exchange."
    },
    "key_context_clues_to_meaning_and_intent": [
      "This is a synthetic test."
    ],
    "explanation_of_how_utterance_is_embedded_in_conversation": "First prompt of the synthetic exchange."
  },
  "agent_response": {
    "summary": "Acknowledged the synthetic smoke test.",
    "key_context_clues_to_response_intent": [
      "The test used synthetic content."
    ],
    "terms_or_explanations_risking_false_impressions": [],
    "relationship_to_preceding_user_prompt_and_recent_exchanges": {
      "immediate_user_prompt": "Synthetic EOTRecorder smoke-test prompt.",
      "immediate_relationship": "The response acknowledged the prompt.",
      "recent_user_prompts_and_agent_responses": [],
      "outcome_assessment": "Synthetic recorder test input."
    }
  }
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

test('the registered alias appends identical records and preserves existing values and order', async () => {
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
  assert.deepEqual(store.records, [legacy, record, record]);
});

test('concurrent writers retry against the new revision and both append', async () => {
  const store = githubStore();
  const append = await makeRecorder(store.request);
  const other = { ...record, turn_id: 2 };
  const receipts = await Promise.all([append(record), append(other)]);
  assert.deepEqual(receipts.map(({ index }) => index).sort(), [0, 1]);
  assert.equal(store.records.length, 2);
  assert.deepEqual(store.records.find(item => item.turn_id === 1), record);
  assert.deepEqual(store.records.find(item => item.turn_id === 2), other);
});

test('invalid records fail before contacting GitHub', async () => {
  const append = await makeRecorder(() => assert.fail('Invalid input reached GitHub'));
  await assert.rejects(append({ ...record, turn_id: 0 }), /turn_id/);
  await assert.rejects(append({ ...record, timestamp: '1794678400' }), /timestamp/);
  await assert.rejects(append({ ...record, conversation_id: 'legacy' }), /conversation_id/);
  const invalid = structuredClone(record);
  invalid.target_exchange.summary_of_adjacent_conversation.preceding_user_turns_chronological = [{ user_utterance: 'A prompt' }];
  await assert.rejects(append(invalid), /context_summary/);
});

test('a rejected write is reported without a second write', async () => {
  const store = githubStore([]);
  let attempts = 0;
  const append = await makeRecorder((method, ...args) => {
    if (method === 'GET') return store.request(method, ...args);
    attempts++;
    return { status: 403 };
  });
  await assert.rejects(append(record), /write.*403/i);
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
