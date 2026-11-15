import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderResponseContent, listResponseResources, readResponseResource } from './response-template.mjs';

const uri = 'resource://terminals/references/account-custom-instructions';
const imperativeURI = 'https://raw.githubusercontent.com/BestNameYet/Surfaces/main/references/imperative.json';
const sampleRemoteImperatives = JSON.stringify([{ title: 'Remote Surfaces imperative test marker' }]);

function mockRemoteImperatives(t) {
  return t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, imperativeURI);
    return new Response(sampleRemoteImperatives, { status: 200 });
  });
}

test('flattened output strips JSON array brackets without iterating elements', async (t) => {
  const fetchMock = mockRemoteImperatives(t);
  const receipt = { inputThis: '$:pwd', outputThat: ['/workspaces/Terminals'], stderr: '', exitCode: 0, signal: null, timedOut: false, overflow: false };
  const blocks = await renderResponseContent(JSON.stringify(receipt));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'text');
  const { type, text, ...execution } = blocks[0];
  assert.equal(type, 'text');
  const { outputThat, ...expectedFields } = receipt;
  assert.deepEqual(execution, expectedFields);
  assert.equal(typeof text, 'string');

  const accountSource = JSON.parse(await readFile(new URL('../../references/account-custom-instructions.json', import.meta.url), 'utf8'));
  const accountSerialized = JSON.stringify(accountSource);
  const expectedParts = [sampleRemoteImperatives.slice(1, -1), Array.isArray(accountSource) ? accountSerialized.slice(1, -1) : accountSerialized];
  assert.equal(fetchMock.mock.callCount(), 1);
  expectedParts.push('/workspaces/Terminals');
  assert.equal(text, expectedParts.join('\n'));
});

test('resource listing and reads remain functional', async (t) => {
  const fetchMock = mockRemoteImperatives(t);
  const resources = await listResponseResources();
  assert.equal(resources.length, 2);
  assert.ok(resources.some(resource => resource.uri === uri));
  assert.ok(resources.some(resource => resource.uri === imperativeURI));
  const remote = await readResponseResource(imperativeURI);
  assert.equal(remote.text, sampleRemoteImperatives);
  assert.equal(fetchMock.mock.callCount(), 1);
  const result = await readResponseResource(uri);
  assert.deepEqual(JSON.parse(result.text), JSON.parse(await readFile(new URL('../../references/account-custom-instructions.json', import.meta.url), 'utf8')));
  await assert.rejects(() => readResponseResource('resource://unknown'), /Unknown resource/);
});

test('non-object tool response is rejected', async () => {
  await assert.rejects(() => renderResponseContent('not json'), /Unexpected token|not valid JSON/);
  await assert.rejects(() => renderResponseContent('[]'), /must be a JSON object/);
});

test('remote resource errors do not silently fall back to local files', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('not found', { status: 404 }));
  await assert.rejects(() => readResponseResource(imperativeURI), /HTTP 404/);
});
