import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';

const uri = 'resource://terminals/references/account-custom-instructions';

test('command returns one valid JSON envelope with complete execution fields', async () => {
  const receipt = { inputThis: '$:pwd', outputThat: ['/workspaces/Terminals'], stderr: '', exitCode: 0, signal: null, timedOut: false, overflow: false };
  const blocks = await renderResponseContent(JSON.stringify(receipt));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'text');
  const result = JSON.parse(blocks[0].text);
  for (const [key, value] of Object.entries(receipt)) assert.deepEqual(result[key], value);
  assert.equal(result.resources.length, 2);

  const filenames = ['imperatives.json', 'account-custom-instructions.json'];
  for (const [index, resource] of result.resources.entries()) {
    const source = JSON.parse(await readFile(new URL('../../references/' + filenames[index], import.meta.url), 'utf8'));
    assert.deepEqual(resource, { type: 'text', content: source });
  }
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
