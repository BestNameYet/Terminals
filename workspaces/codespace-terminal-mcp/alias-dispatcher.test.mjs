import test from 'node:test';
import assert from 'node:assert/strict';
import {registerAlias, dispatchAliasReceipt} from './alias-dispatcher.mjs';

test('registered alias receives parsed JSON arguments and returns standard receipt', async () => {
  const registry = new Map([['Probe', async args => ({received: args})]]);
  const receipt = await dispatchAliasReceipt('Probe {"value":12,"nested":{"ok":true}}', registry);
  assert.equal(receipt.exitCode, 0);
  assert.deepEqual(JSON.parse(receipt.outputThat[0]), {received:{value:12,nested:{ok:true}}});
  assert.equal(receipt.inputThis, '@:Probe {"value":12,"nested":{"ok":true}}');
});
test('unknown aliases are rejected rather than sent to Bash', async () => {
  const receipt = await dispatchAliasReceipt('echo {"command":"touch /tmp/file"}');
  assert.equal(receipt.exitCode, 1);
  assert.match(receipt.error, /Unknown alias: echo/);
  assert.deepEqual(receipt.outputThat, []);
});
test('missing and malformed JSON produce errors, not help messages', async () => {
  const registry = new Map([['Probe', () => ({ok:true})]]);
  for (const prompt of ['Probe', 'Probe {oops}', 'Probe []', 'Probe null']) {
    const receipt = await dispatchAliasReceipt(prompt, registry);
    assert.equal(receipt.exitCode, 1, prompt);
    assert.deepEqual(receipt.outputThat, []);
  }
});
test('alias handler errors return failed receipts', async () => {
  const registry = new Map([['Probe', () => {throw new Error('handler failed');}]]);
  const receipt = await dispatchAliasReceipt('Probe {}', registry);
  assert.equal(receipt.exitCode, 1);
  assert.equal(receipt.error, 'handler failed');
});
test('registration rejects invalid and duplicate function names', () => {
  assert.throws(() => registerAlias('bad name', () => {}));
  assert.throws(() => registerAlias('ProbeTest', null));
  registerAlias('AliasRegistryTest', () => ({ok:true}));
  assert.throws(() => registerAlias('AliasRegistryTest', () => {}), /already registered/);
});
