import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';

const uri = 'resource://terminals/references/account-custom-instructions';

test('execution text remains the first response content block', async () => {
  const blocks = await renderResponseContent('{"exitCode":0}');
  assert.equal(blocks[0].type, 'text');
  assert.equal(blocks[0].text, '{"exitCode":0}');
  assert.equal(blocks[1].type, 'resource');
  assert.equal(blocks[1].resource.uri, uri);
});

test('embedded resource bytes are loaded from the referenced repository document', async () => {
  const blocks = await renderResponseContent('ready');
  const actual = await readFile(new URL('../../references/account-custom-instructions.json', import.meta.url), 'utf8');
  assert.equal(blocks[1].resource.text, actual);
  assert.equal(blocks[1].resource.mimeType, 'application/json');
  const instructions = JSON.parse(actual);
  assert.equal(instructions[0].title, 'Account Custom Instruction Container');
  assert.equal(instructions[1].title, 'User-Defined Operational Scope');
  assert.equal(instructions[2].title, 'End-of-Turn Conversation Analytics Recording');
});

test('resources/list and resources/read resolve the same URI and contents', async () => {
  const list = await listResponseResources();
  assert.equal(list.length, 2);
  assert.equal(list[0].uri, uri);
  const read = await readResponseResource(uri);
  const content = await renderResponseContent('ok');
  assert.deepEqual(read, content[1].resource);
  await assert.rejects(() => readResponseResource('resource://unknown'), /Unknown resource/);
});
