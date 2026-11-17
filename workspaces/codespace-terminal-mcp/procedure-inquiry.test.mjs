import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dispatchAliasReceipt } from './alias-dispatcher.mjs';

const roots = [
  { id: 'Q1', question: 'What constitutes a completed inquiry?' },
  { id: 'Q2', question: 'How are answers associated with the questions that prompted them?' },
  { id: 'Q3', question: 'How does inquiry influence the subsequent plan?' }
];
const intent = {
  intent: 'Exercise the inquiry protocol', objectives: ['Observe deterministic traversal'],
  constraints: ['Synthetic answers test mechanics, not model quality'], requested_outcome: 'A saved inquiry entering planning'
};
const observation = { description: 'A synthetic protocol fixture', observations: [], unknowns: [] };
function note(keyword) {
  return {
    category: 'verification',
    summary: `The test fixture inspected the current ${keyword} projection and its return schema.`,
    evidence_status: 'verified',
    evidence: [{ kind: 'tool_result', reference: 'procedure-inquiry.test.mjs',
      finding: 'Assertions inspect persisted case identifiers, source associations and transition results.' }],
    assessment: 'This is evidence about the protocol mechanics; the canned answers do not establish inquiry effectiveness.',
    next_action: 'Submit the prepared fixture input and assert the resulting saved projection.',
    readiness: 'ready', unresolved: []
  };
}
async function harness(t, revised = false) {
  const dir = await mkdtemp(join(tmpdir(), 'procedure-inquiry-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  const { Procedure } = await import('./procedure.mjs?' + dir);
  const registry = new Map([['Procedure', Procedure]]);
  const alias = revised ? 'Procedure -r' : 'Procedure';
  async function call(prompt) {
    const receipt = await dispatchAliasReceipt(prompt, registry);
    assert.equal(receipt.exitCode, 0, receipt.stderr);
    return JSON.parse(receipt.outputThat[0]);
  }
  let response = await call(alias);
  const nonce = response.nonce;
  const command = `${alias} ${nonce}`;
  const path = join(dir, revised ? 'revised' : '', nonce + '.json');
  const h = {
    revised, nonce, path,
    get response() { return response; },
    async read() { return JSON.parse(await readFile(path, 'utf8')); },
    async replay() { return call(revised ? command : 'Procedure ' + JSON.stringify({ nonce })); },
    async submit(input, withNote = true) {
      if (withNote) await call(command + ' --scratchpad ' + JSON.stringify({ note: note(response.projection.keyword) }));
      response = await call(revised ? command + ' ' + JSON.stringify(input) : 'Procedure ' + JSON.stringify({ nonce, input }));
      return response;
    },
    async reject(input, withNote = true) {
      const before = await h.read();
      const result = await h.submit(input, withNote);
      assert.ok(result.projection.error_message);
      assert.equal(result.projection.keyword, before.state.keyword);
      assert.deepEqual(result.projection.final_schema, before.state.projection.final_schema);
      assert.deepEqual(result.projection.context, before.state.projection.context);
      assert.deepEqual((await h.read()).inputs, before.inputs);
      assert.equal(result.scratchpad.revision, before.scratchpad.revision);
      assert.deepEqual(await h.replay(), result);
    }
  };
  return h;
}
async function reachRoots(h, selectedRoots = roots) {
  await h.submit({ verbatim_request: 'Exercise a source-linked Q&A cascade, then use its record to plan.' });
  await h.submit({ user_intent: intent });
  if (h.revised) await h.submit({ current_state: observation });
  assert.equal(h.response.projection.keyword, 'clarifying_questions');
  await h.reject({ clarifying_questions: [] });
  await h.submit({ clarifying_questions: selectedRoots });
  assert.equal(h.response.projection.keyword, 'question_answers');
  const answers = selectedRoots.map(({ id, question }) => ({
    question_id: id, question, answer: 'Fixture proposal: save and validate every issued case before planning.', unresolved: false
  }));
  await h.reject({ question_answers: [...answers].reverse().map((a, i) => i ? a : { ...a, question: 'Altered source question' }) });
  await h.submit({ question_answers: answers });
  assert.equal(h.response.projection.keyword, 'inquiry_perspectives');
}
function nominations(h, additional = false) {
  return h.response.projection.context.pairs.map((pair, index) => ({
    pair_id: pair.id,
    additional: additional && index === 0 ? [{
      name: 'Interactions', instruction: 'Examine dependencies between this answer and another source pair.'
    }] : []
  }));
}
function questions(h) {
  const c = h.response.projection.context;
  const other = c.available_source_pairs.find(pair => pair.id !== c.source_pair.id);
  return { inquiry_questions: {
    case_id: c.case.id,
    questions: Array.from({ length: c.question_count }, (_, i) => ({
      question: `For source ${c.source_pair.id}, what does ${c.case.perspective.name} reveal about completion and source matching (probe ${i + 1})?`,
      source_pair_ids: [c.source_pair.id, ...(other ? [other.id] : [])]
    }))
  } };
}
function answer(h) {
  return { inquiry_answers: {
    question_id: h.response.projection.context.question_id,
    answer: 'Synthetic fixture response: retain explicit identifiers, inspect the saved mapping, and test the stated condition.',
    evidence: ['Assumption: these canned responses exercise protocol mechanics only.'], unresolved: true
  } };
}
function synthesis(h) {
  const inquiry = h.response.projection.context.inquiry;
  return { inquiry_synthesis: inquiry.pairs.filter(pair => pair.depth === 0).map(pair => ({
    root_pair_id: pair.id, finding: 'The protocol preserved this source branch; substantive effectiveness remains untested.',
    pair_ids: [pair.id, ...inquiry.pairs.filter(p => p.parent_pair_id === pair.id).map(p => p.id)],
    implications: ['Measure solution quality separately from structural completeness.']
  })) };
}

for (const revised of [false, true]) {
  test(`${revised ? 'revised' : 'original'} alias exhausts two rounds, renominates perspectives and carries the inquiry into planning`, async t => {
    const h = await harness(t, revised);
    await reachRoots(h);
    const packets = [];
    let rounds = 0, generated = 0, answered = 0;
    while (h.response.projection.keyword !== 'inquiry_synthesis') {
      const { keyword, context } = h.response.projection;
      if (keyword === 'inquiry_perspectives') {
        rounds++;
        assert.equal(context.depth, rounds);
        assert.equal(context.pairs.length, rounds === 1 ? 3 : (revised ? 13 : 12));
        assert.ok(context.pairs.every(pair => pair.depth === rounds - 1));
        if (rounds === 2) assert.ok(context.ancestry.every(item => item.pairs.length === 1));
        await h.submit({ inquiry_perspectives: nominations(h, revised) });
      } else if (keyword === 'inquiry_questions') {
        generated++;
        assert.ok(context.available_source_pairs.every(pair => pair.depth < context.depth));
        if (context.case.perspective.id === 'evidence') assert.ok(context.prior_questions_for_pair.length >= 1);
        if (packets.length < 4) packets.push(structuredClone(h.response.projection));
        await h.submit(questions(h));
      } else if (keyword === 'inquiry_answers') {
        answered++;
        const pending = await h.read();
        const inquiry = pending.inputs.inquiry;
        const item = inquiry.rounds.at(-1).cases[inquiry.caseIndex];
        const q = item.questions[inquiry.questionIndex];
        assert.equal(context.primary_question, q.question);
        assert.equal(context.question_id, q.id);
        assert.deepEqual(context.source_pairs.map(pair => pair.id), q.source_pair_ids);
        assert.deepEqual(context.source_pairs, q.source_pair_ids.map(id => inquiry.pairs.find(pair => pair.id === id)));
        if (packets.length < 4) packets.push(structuredClone(h.response.projection));
        await h.submit(answer(h));
      } else assert.fail('Unexpected inquiry state: ' + keyword);
    }
    const record = await h.read();
    const inquiry = record.inputs.inquiry;
    assert.equal(rounds, 2);
    assert.equal(generated, revised ? 66 : 60);
    assert.equal(answered, generated);
    assert.equal(inquiry.pairs.length, revised ? 69 : 63);
    assert.equal(new Set(inquiry.pairs.map(pair => pair.id)).size, inquiry.pairs.length);
    for (const round of inquiry.rounds) for (const item of round.cases) for (const q of item.questions) {
      const pair = inquiry.pairs.find(pair => pair.id === q.answer_pair_id);
      assert.ok(pair);
      assert.equal(pair.parent_pair_id, item.parent_pair_id);
      assert.equal(pair.perspective.id, item.perspective.id);
      assert.equal(pair.question, q.question);
      assert.deepEqual(pair.source_pair_ids, q.source_pair_ids);
    }
    const result = await h.submit(synthesis(h));
    assert.equal(result.projection.keyword, 'desired_state');
    assert.deepEqual(result.projection.context.inquiry, inquiry);
    assert.equal(result.projection.context.inquiry_synthesis.length, 3);
    assert.deepEqual(await h.replay(), result);
    if (!revised && process.env.QA_CASCADE_EXAMPLE_PATH) await writeFile(process.env.QA_CASCADE_EXAMPLE_PATH, JSON.stringify({
      description: 'Synthetic integration-test record. Validates deterministic mechanics; these canned answers are not a model-quality experiment.',
      alias: 'Procedure', nonce: h.nonce, outcome: 'Inquiry completed; desired_state projected',
      sample_packets: packets, inquiry, synthesis: result.projection.context.inquiry_synthesis
    }, null, 2) + '\n');
    await h.submit({ desired_state: { description: 'A recorded plan', conditions: [{ id: 'D1', requirement: 'Saved inquiry', verification: 'Read record' }] } });
    if (!revised) await h.submit({ current_state: observation });
    assert.equal(h.response.projection.keyword, 'required_changes');
    assert.deepEqual(h.response.projection.context.inquiry, inquiry);
  });
}

test('invalid case, source, nomination and answer returns cannot skip work or alter accepted history', async t => {
  const h = await harness(t);
  await reachRoots(h);
  const n = nominations(h);
  await h.reject({ inquiry_perspectives: n.slice(1) });
  await h.reject({ inquiry_perspectives: [...n].reverse() });
  await h.reject({ inquiry_perspectives: [n[0], n[0], n[2]] });
  const duplicateName = structuredClone(n);
  duplicateName[0].additional = [{ name: ' assumptions ', instruction: 'Duplicate fixed perspective' }];
  await h.reject({ inquiry_perspectives: duplicateName });
  await h.submit({ inquiry_perspectives: n });
  await h.reject(questions(h), false);
  const valid = questions(h);
  await h.reject({ inquiry_questions: { ...valid.inquiry_questions, case_id: 'r1.c2' } });
  for (const ids of [['missing-pair'], ['r0.p2'], ['r0.p1', 'r0.p1']]) {
    const bad = structuredClone(valid);
    bad.inquiry_questions.questions[0].source_pair_ids = ids;
    await h.reject(bad);
  }
  await h.submit(valid);
  await h.reject({ inquiry_answers: { ...answer(h).inquiry_answers, question_id: 'r1.c2.q1' } });
  const accepted = answer(h);
  await h.submit(accepted);
  const saved = await h.read();
  assert.equal(saved.inputs.inquiry.pairs.length, 4);
  assert.equal(h.response.projection.context.case.id, 'r1.c2');
  await h.reject(accepted);
  assert.equal((await h.read()).inputs.inquiry.pairs.length, 4);
});

test('multiple questions in a case are each answered before the next case and the saved config is per run', async t => {
  const h = await harness(t);
  const initial = await h.read();
  Object.assign(initial.inputs.inquiry.config, { root_question_count: 1, questions_per_case: 2, max_depth: 1 });
  await writeFile(h.path, JSON.stringify(initial));
  await reachRoots(h, roots.slice(0, 1));
  await h.submit({ inquiry_perspectives: nominations(h) });
  let count = 0;
  while (h.response.projection.keyword !== 'inquiry_synthesis') {
    await h.submit(questions(h));
    const firstID = h.response.projection.context.question_id;
    await h.submit(answer(h));
    assert.equal(h.response.projection.keyword, 'inquiry_answers');
    assert.notEqual(h.response.projection.context.question_id, firstID);
    await h.submit(answer(h));
    count += 2;
  }
  assert.equal(count, 8);
  assert.equal(h.response.projection.context.inquiry.pairs.length, 9);
  const result = synthesis(h);
  await h.reject({ inquiry_synthesis: [] });
  const bad = structuredClone(result);
  bad.inquiry_synthesis[0].pair_ids = ['unknown'];
  await h.reject(bad);
  await h.submit(result);
  assert.equal(h.response.projection.keyword, 'desired_state');
});

test('legacy original record finishes its existing Q&A without acquiring a new cascade', async t => {
  const h = await harness(t);
  const record = await h.read();
  delete record.inputs.inquiry;
  await writeFile(h.path, JSON.stringify(record));
  await h.submit({ verbatim_request: 'Resume legacy inquiry' });
  await h.submit({ user_intent: intent });
  const schema = h.response.projection.final_schema.properties.clarifying_questions;
  const legacyRoots = Array.from({ length: schema.minItems }, (_, i) => ({ id: `Q${i}`, question: `Legacy question ${i}?` }));
  await h.submit({ clarifying_questions: legacyRoots });
  await h.submit({ question_answers: legacyRoots.map(q => ({ question_id: q.id, question: q.question, answer: 'Legacy answer', unresolved: false })) });
  assert.equal(h.response.projection.keyword, 'desired_state');
  assert.equal((await h.read()).inputs.inquiry, undefined);
});
