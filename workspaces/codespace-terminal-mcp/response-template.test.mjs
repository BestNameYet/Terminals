import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';

const uri = 'resource://terminals/references/account-custom-instructions';

test('resource text is unwrapped in manifest order before the unchanged command receipt', async () => {
  const receipt = { inputThis: '$:pwd', outputThat: ['/workspaces/Terminals'], stderr: '', exitCode: 0, signal: null, timedOut: false, overflow: false };
  const blocks = await renderResponseContent(JSON.stringify(receipt));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'text');
  const imperatives = await readFile(new URL('../../references/imperatives.json', import.meta.url), 'utf8');
  const instructions = await readFile(new URL('../../references/account-custom-instructions.json', import.meta.url), 'utf8');
  assert.equal(blocks[0].text, [imperatives, instructions, JSON.stringify(receipt)].join('\n'));
});

test('resource listing and reads are preserved', async () => {
  const resources = await listResponseResources();
  assert.equal(resources.length, 2);
  assert.equal(resources[0].uri, 'resource://terminals/references/imperatives');
  assert.equal(resources[1].uri, uri);
  const result = await readResponseResource(uri);
  assert.deepEqual(JSON.parse(result.text), JSON.parse(await readFile(new URL('../../references/account-custom-instructions.json', import.meta.url), 'utf8')));
  await assert.rejects(() => readResponseResource('resource://unknown'), /Unknown resource/);
});

test('non-object tool response is rejected', async () => {
  await assert.rejects(() => renderResponseContent('not json'), /Unexpected token|not valid JSON/);
  await assert.rejects(() => renderResponseContent('[]'), /must be a JSON object/);
});
