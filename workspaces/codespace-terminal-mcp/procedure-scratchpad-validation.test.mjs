import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateScratchpadNote, scratchpadDiagnostic, appendNote, scratchpadFor } from '../2d-state-event-procedure-design/src/scratchpad.mjs';
import { dispatchAliasReceipt } from './alias-dispatcher.mjs';

function richNote(label = 'current active projection', readiness = 'ready', evidenceStatus = 'verified') {
  return {
    category: 'verification',
    summary: 'Inspected the source and current state for the specific case: ' + label + '; its expected outcome is recorded.',
    evidence_status: evidenceStatus,
    evidence: evidenceStatus === 'verified' ? [{
      kind: 'tool_result',
      reference: 'test:mandatory-scratchpad:' + label.replaceAll(' ', '_'),
      finding: 'An explicit fixture demonstrates this case under the active state and a traceable source reference.'
    }] : [],
    assessment: 'The current test state and recorded evidence determine whether this specific state transition is permitted.',
    next_action: 'Submit the current projection input and verify the resulting state, diagnostic and saved revision.',
    readiness,
    unresolved: readiness === 'blocked' ? ['The current fixture has not satisfied the required readiness condition.'] : [],
    ...(evidenceStatus === 'unverified' ? { limitation: 'The original evidence required for this fixture remains unavailable or has not yet been checked.' } : {})
  };
}

test('schema requires substantive typed structured notes, no freeform compatibility bypass', () => {
  const good = { note: richNote() };
  assert.equal(validateScratchpadNote(good).valid, true);
  const bad = [
    undefined,
    {},
    { note: 'This was previously accepted as a freeform note' },
    { note: null },
    { note: { ...richNote(), summary: '     ' } },
    { note: { ...richNote(), category: 'filler' } },
    { note: { ...richNote(), extra_unrecognized: 1 } },
    { note: { ...richNote(), next_action: '' } },
    { note: { ...richNote(), evidence: [] } },
    { note: { ...richNote(), readiness: 'blocked', unresolved: [] } },
    { note: { ...richNote('missing limitation', 'ready', 'unverified'), limitation: undefined } },
    { note: { ...richNote(), evidence: [{kind:'tool_result',reference:'a', finding:'tiny'}] } },
    { note: { ...richNote(), evidence: [{kind:'fictitious',reference:'test:fixture',finding:'A valid length but unsupported source classification.'}] } },
    { ...good, nonce: 'caller-is-not-allowed-to-supply-nonce' }
  ];
  for (const value of bad) {
    const check = validateScratchpadNote(value);
    assert.equal(check.valid, false, 'unexpected acceptance of ' + JSON.stringify(value));
    assert.ok(check.errors.length, 'expected machine-readable Ajv error');
  }
  assert.equal(validateScratchpadNote({ note: richNote('source not yet accessible', 'ready', 'unverified') }).valid, true);
  assert.equal(validateScratchpadNote({ note: richNote('genuine no-external-evidence case', 'ready', 'not_applicable') }).valid, true);
  assert.equal(validateScratchpadNote({ note: richNote('documented blocker', 'blocked') }).valid, true);
});

test('transition validator checks latest note revision, state, payload and readiness', () => {
  const record = { state: { keyword: 'current_state' }, scratchpad: { mode: 'optional', revision: 3, entries: [] } };
  assert.equal(scratchpadDiagnostic(record).errortype, 'scratchpad.note_required');
  assert.equal(scratchpadFor(record).mode, 'mandatory', 'legacy optional state must be upgraded on resume');
  const note = richNote('decision for current state');
  const entry = appendNote(record, note);
  assert.equal(entry.sequence, 1);
  assert.equal(entry.revision, 3);
  assert.equal(entry.keyword, 'current_state');
  assert.match(entry.timestamp, /^20\d\d-/);
  assert.equal(scratchpadDiagnostic(record), undefined);
  entry.keyword = 'execution_procedure';
  assert.equal(scratchpadDiagnostic(record).errortype, 'scratchpad.note_state_mismatch');
  entry.keyword = 'current_state';
  entry.note.summary = 'garbage';
  assert.equal(scratchpadDiagnostic(record).errortype, 'scratchpad.note_invalid');
  entry.note = richNote('documented blocked state', 'blocked');
  const blocked = scratchpadDiagnostic(record);
  assert.equal(blocked.errortype, 'scratchpad.note_blocked');
  assert.ok(blocked.diagnostic_data.unresolved.length);
  appendNote(record, richNote('recovered state after a documented blocker'));
  assert.equal(scratchpadDiagnostic(record), undefined);
  record.scratchpad.revision++;
  assert.equal(scratchpadDiagnostic(record).errortype, 'scratchpad.note_required', 'stale note must fail');
  const snapshot = structuredClone(record.scratchpad.entries);
  assert.throws(() => appendNote(record, 'old string'), /Invalid scratchpad note/);
  assert.deepEqual(record.scratchpad.entries, snapshot, 'invalid direct append must not mutate history');
});

test('completed records remain readable and reject note writes', () => {
  const record = { completed: true, state: { keyword: 'post_execution_diagnostic' },
    scratchpad: { mode: 'optional', revision: 12, entries: [{sequence:1,revision:1,keyword:'verbatim_request',note:'legacy freeform note'}] } };
  assert.equal(scratchpadFor(record).mode, 'optional', 'do not misrepresent completed historical modes');
  assert.equal(scratchpadDiagnostic(record), undefined);
  assert.throws(() => appendNote(record, richNote('after completion')), /read-only/);
});

let profileNumber = 0;
async function withProcedure(callback) {
  const dir = await mkdtemp(join(tmpdir(), 'scratchpad-validated-'));
  const old = process.env.MCP_PROCEDURE_STATE_DIR;
  process.env.MCP_PROCEDURE_STATE_DIR = dir;
  try {
    const { Procedure } = await import('./procedure.mjs?mandatory-contract-' + (++profileNumber));
    await callback(Procedure, dir);
  } finally {
    if (old === undefined) delete process.env.MCP_PROCEDURE_STATE_DIR;
    else process.env.MCP_PROCEDURE_STATE_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
}

test('both profiles enforce mandatory mode by default and allow no optional bypass', async () => {
  await withProcedure(async Procedure => {
    for (const revised of [false, true]) {
      await assert.rejects(Procedure({ scratchpadMode: 'optional' }, { revised }), /mandatory/);
      const initial = await Procedure({}, { revised });
      assert.equal(initial.scratchpad.mode, 'mandatory');
      assert.equal(initial.scratchpad.revision, 1);
      assert.equal(initial.projection.keyword, 'verbatim_request');
      const nonce = initial.nonce;
      const wrong = await Procedure({ nonce, input: { verbatim_request: 'Run the sample procedure' } }, { revised });
      assert.equal(wrong.projection.error_message.errortype, 'scratchpad.note_required');
      await assert.rejects(Procedure({ nonce, scratchpad: { note: 'old freeform string' } }, { revised }), /Invalid scratchpad append/);
      await assert.rejects(Procedure({ nonce, scratchpad: { note: { ...richNote('invalid evidence'), evidence: [] } } }, { revised }), /evidence/);
      const receipt = await Procedure({ nonce, scratchpad: { note: richNote('initial stage') } }, { revised });
      assert.equal(receipt.entry.sequence, 1);
      assert.equal(receipt.entry.keyword, 'verbatim_request');
      assert.equal(receipt.entry.revision, 1);
      const advance = await Procedure({ nonce, input: { verbatim_request: 'Run the sample procedure' } }, { revised });
      assert.equal(advance.projection.keyword, 'user_intent');
      assert.equal(advance.scratchpad.revision, 2);
      const intent = { intent: 'Run sample', objectives: [], constraints: [], requested_outcome: 'Verified run' };
      const stale = await Procedure({ nonce, input: { user_intent: intent } }, { revised });
      assert.equal(stale.projection.error_message.errortype, 'scratchpad.note_required');
    }
  });
});

test('both profiles block an unresolved note but accept a later valid ready note', async () => {
  await withProcedure(async Procedure => {
    for (const revised of [false, true]) {
      const { nonce } = await Procedure({}, { revised });
      const input = { verbatim_request: 'Build a report with provenance' };
      const blockedNote = await Procedure({ nonce, scratchpad: { note: richNote('required original PDF unavailable', 'blocked', 'unverified') } }, { revised });
      assert.equal(blockedNote.entry.note.readiness, 'blocked');
      const blocked = await Procedure({ nonce, input }, { revised });
      assert.equal(blocked.projection.keyword, 'verbatim_request');
      assert.equal(blocked.projection.error_message.errortype, 'scratchpad.note_blocked');
      const receipt = await Procedure({ nonce, scratchpad: { note: richNote('required original PDF now confirmed') } }, { revised });
      assert.equal(receipt.entry.sequence, 2);
      const advanced = await Procedure({ nonce, input }, { revised });
      assert.equal(advanced.projection.keyword, 'user_intent');
    }
  });
});

test('persisted missing, malformed and wrong-state notes fail after disk reload', async () => {
  await withProcedure(async (Procedure, dir) => {
    const { nonce } = await Procedure({}, { revised: true });
    const path = join(dir, 'revised', nonce + '.json');
    await Procedure({ nonce, scratchpad: { note: richNote('first valid stored revision') } }, { revised: true });
    const original = JSON.parse(await readFile(path, 'utf8'));
    const last = original.scratchpad.entries.at(-1);
    last.keyword = 'agent_actions';
    await writeFile(path, JSON.stringify(original));
    const mismatch = await Procedure({ nonce, input: { verbatim_request: 'Valid source prompt' } }, { revised: true });
    assert.equal(mismatch.projection.error_message.errortype, 'scratchpad.note_state_mismatch');
    let corrupted = JSON.parse(await readFile(path,'utf8'));
    corrupted.scratchpad.entries.at(-1).keyword = 'verbatim_request';
    corrupted.scratchpad.entries.at(-1).note.evidence_status = 'wrong';
    await writeFile(path, JSON.stringify(corrupted));
    const invalid = await Procedure({ nonce, input: { verbatim_request: 'Valid source prompt' } }, { revised: true });
    assert.equal(invalid.projection.error_message.errortype, 'scratchpad.note_invalid');
    assert.ok(invalid.projection.error_message.diagnostic_data.errors.length);
    await Procedure({ nonce, scratchpad: { note: richNote('recovered after a tampered persisted note') } }, { revised: true });
    const good = await Procedure({ nonce, input: { verbatim_request: 'Valid source prompt' } }, { revised: true });
    assert.equal(good.projection.keyword, 'user_intent');
  });
});

test('alias invocation returns useful error and preserves notes on replay', async () => {
  await withProcedure(async Procedure => {
    const registry = new Map([['Procedure', Procedure]]);
    const call = input => dispatchAliasReceipt(input, registry);
    const rejected = await call('Procedure -r --scratchpad=optional');
    assert.equal(rejected.exitCode, 1);
    assert.match(rejected.stderr, /mandatory/);
    const created = await call('Procedure -r');
    assert.equal(created.exitCode, 0);
    const { nonce } = JSON.parse(created.outputThat[0]);
    const command = 'Procedure -r ' + nonce + ' --scratchpad ';
    const oldInput = await call(command + JSON.stringify({ note: 'old freeform' }));
    assert.equal(oldInput.exitCode, 1);
    assert.match(oldInput.stderr, /note must be object/);
    const valid = await call(command + JSON.stringify({ note: richNote('through alias') }));
    assert.equal(valid.exitCode, 0);
    const read = await call('Procedure -r ' + nonce + ' --scratchpad');
    const history = JSON.parse(read.outputThat[0]).scratchpad;
    assert.equal(history.mode, 'mandatory');
    assert.equal(history.entries.length, 1);
    assert.equal(history.entries[0].note.category, 'verification');
    assert.deepEqual(history.entries[0].note, JSON.parse(valid.outputThat[0]).entry.note);
  });
});
