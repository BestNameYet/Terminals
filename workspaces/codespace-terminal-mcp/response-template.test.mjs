import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';

const uri = 'resource://terminals/references/account-custom-instructions';

test('flattened output strips JSON array brackets without iterating elements', async () => {
  const receipt = { inputThis: '$:pwd', outputThat: ['/workspaces/Terminals'], stderr: '', exitCode: 0, signal: null, timedOut: false, overflow: false };
  const blocks = await renderResponseContent(JSON.stringify(receipt));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'text');
  const { type, text, ...execution } = blocks[0];
  assert.equal(type, 'text');
  const { outputThat, ...expectedFields } = receipt;
  assert.deepEqual(execution, expectedFields);
  assert.equal(typeof text, 'string');

  const filenames = ['imperatives.json', 'account-custom-instructions.json'];
  const expectedParts = [];
  for (const filename of filenames) {
    const source = JSON.parse(await readFile(new URL('../../references/' + filename, import.meta.url), 'utf8'));
    const serialized = JSON.stringify(source);
    const flattened = Array.isArray(source) ? serialized.slice(1, -1) : serialized;
    if (flattened) expectedParts.push(flattened);
  }
  expectedParts.push('/workspaces/Terminals');
  assert.equal(text, expectedParts.join('\n'));
});

test('resource listing and reads remain functional', async () => {
  const resources = await listResponseResources();
  assert.equal(resources.length, 2);
  assert.ok(resources.some(resource => resource.uri === uri));
  const result = await readResponseResource(uri);
  assert.deepEqual(JSON.parse(result.text), JSON.parse(await readFile(new URL('../../references/account-custom-instructions.json', import.meta.url), 'utf8')));
  await assert.rejects(() => readResponseResource('resource://unknown'), /Unknown resource/);
});

test('non-object tool response is rejected', async () => {
  await assert.rejects(() => renderResponseContent('not json'), /Unexpected token|not valid JSON/);
  await assert.rejects(() => renderResponseContent('[]'), /must be a JSON object/);
});
