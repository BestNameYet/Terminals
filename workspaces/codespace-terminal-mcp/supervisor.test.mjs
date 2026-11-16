import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSupervisor } from './supervisor.mjs';

async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-supervisor-test-'));
  const path = join(dir, 'events.jsonl');
  const supervisor = await createSupervisor({ journalPath: path, ...options });
  t.after(async () => {
    await supervisor.close();
    await rm(dir, { recursive: true, force: true });
  });
  return { supervisor, path };
}

test('overlapping requests are correlated and capture is masked before persistence', async t => {
  const { supervisor, path } = await fixture(t);
  let finish;
  const slow = supervisor.observe({
    name: 'terminal_execute',
    arguments: { runOn: '@', forWhom: 'duplicate', whatPrompt: 'Procedure {"token":"request-secret"}' }
  }, async metadata => {
    await new Promise(resolve => { finish = resolve; });
    metadata({ nonce: 'demo', outcome: 'advanced', before: 'user_intent', after: 'clarifying_questions' });
    return { content: [{ type: 'text', text: 'Authorization: Bearer response-secret' }] };
  });
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  const outcome = new Error('command failed');
  await assert.rejects(supervisor.observe({
    name: 'terminal_execute', arguments: { runOn: '$', forWhom: 'duplicate', whatPrompt: 'false' }
  }, async () => { throw outcome; }), error => error === outcome);
  finish();
  const result = await slow;
  assert.match(result.content[0].text, /response-secret/);
  const { events } = supervisor.snapshot();
  assert.deepEqual(events.map(e => e.type), ['call.started','call.started','call.finished','call.finished']);
  assert.equal(events[0].callId, events[3].callId);
  assert.equal(events[1].callId, events[2].callId);
  assert.notEqual(events[0].callId, events[1].callId);
  assert.equal(events[2].status, 'failed');
  assert.equal(events[3].procedure.outcome, 'advanced');
  const saved = await readFile(path, 'utf8');
  assert.doesNotMatch(saved, /request-secret|response-secret/);
  assert.match(saved, /\[masked\]/);
});

test('retention reports gaps, replays in order and preserves history across restart', async t => {
  const { supervisor, path } = await fixture(t, { limit: 4, maxBytes: 256 });
  const params = { name: 'terminal_execute', arguments: { whatPrompt: 'x'.repeat(1000) } };
  await supervisor.observe(params, async () => ({ isError: false }));
  const old = supervisor.snapshot().cursor;
  const runs = Array.from({ length: 4 }, () => supervisor.observe(params, async () => ({ isError: true })));
  await Promise.all(runs);
  const before = supervisor.snapshot();
  assert.equal(before.events.length, 4);
  assert.equal(supervisor.since(old).gap, true);
  assert.deepEqual(supervisor.since(before.events[1].id).events, before.events.slice(2));
  await supervisor.close();
  const reopened = await createSupervisor({ journalPath: path, limit: 4 });
  t.after(() => reopened.close());
  assert.deepEqual(reopened.snapshot().events, before.events);
  await reopened.observe({ name: 'tool' }, async () => ({}));
  assert.ok(reopened.snapshot().cursor > before.cursor);
});

test('viewer is loopback-only and delivers events by SSE without accepting writes', async t => {
  const { supervisor } = await fixture(t);
  const server = await supervisor.listen(0);
  assert.equal(server.address().address, '127.0.0.1');
  const base = 'http://127.0.0.1:' + server.address().port;
  assert.match(await (await fetch(base)).text(), /MCP supervisor/);
  assert.equal((await fetch(base + '/snapshot', { method: 'POST' })).status, 405);
  const { cursor } = await (await fetch(base + '/snapshot')).json();
  const controller = new AbortController();
  t.after(() => controller.abort());
  const response = await fetch(base + '/events?after=' + cursor, { signal: controller.signal });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  await supervisor.observe({ name: 'smoke' }, async () => ({ isError: false }));
  const decode = new TextDecoder();
  let text = '';
  while (!text.includes('call.finished')) {
    const part = await reader.read();
    assert.equal(part.done, false);
    text += decode.decode(part.value, { stream: true });
  }
  assert.match(text, /call.started/);
  assert.match(text, /call.finished/);
  controller.abort();
});

test('interrupted calls retain the request and receive a terminal status after restart', async t => {
  const { supervisor, path } = await fixture(t);
  let finish;
  const running = supervisor.observe({name: 'terminal_execute', arguments: {whatPrompt: '<script>fixture</script>'}}, async () => {
    await new Promise(resolve => { finish = resolve; });
    return {};
  });
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  const started = supervisor.snapshot().events[0];
  finish();
  await running;
  await supervisor.close();
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, JSON.stringify(started) + '\n');
  const restarted = await createSupervisor({ journalPath: path });
  t.after(() => restarted.close());
  const events = restarted.snapshot().events;
  assert.equal(events.at(-1).status, 'interrupted');
  assert.equal(events.at(-1).callId, started.callId);
  assert.equal(events.at(-1).started.request.text, started.request.text);
  assert.match(events.at(-1).started.request.text, /<script>fixture/);
});

test('journal failure signals degradation but does not change tool outcomes', async t => {
  const { supervisor, path } = await fixture(t);
  const { mkdir } = await import('node:fs/promises');
  await mkdir(path);
  const result = { content: [{ type: 'text', text: 'still works' }] };
  assert.strictEqual(await supervisor.observe({ name: 'terminal_execute' }, async () => result), result);
  assert.equal(supervisor.snapshot().degraded, true);
  assert.equal(supervisor.snapshot().events.at(-1).status, 'succeeded');
});
