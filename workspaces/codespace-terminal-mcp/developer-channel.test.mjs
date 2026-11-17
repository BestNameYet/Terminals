import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEVELOPER_CHANNEL_READ_SCHEMA,
  DEVELOPER_CHANNEL_SEND_SCHEMA,
  listDeveloperChannelResources,
  parseParticipantResourceUri,
  participantResourceUri,
  readDeveloperChannel,
  readDeveloperChannelResource,
  sendDeveloperChannelMessage
} from './developer-channel.mjs';

const anchorCommentId = '6962337133';
let scratch;
let statePath;
let originalPath;
let originalStatePath;

async function readState() {
  return JSON.parse(await readFile(statePath, 'utf8'));
}

before(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'terminals-channel-test-'));
  statePath = join(scratch, 'github-state.json');
  originalPath = process.env.PATH;
  originalStatePath = process.env.MOCK_GH_STATE;
  process.env.MOCK_GH_STATE = statePath;
  process.env.PATH = scratch + ':' + (originalPath || '');
  await writeFile(statePath, JSON.stringify({
    issue: {
      number: 12,
      title: 'Comm channel',
      html_url: 'https://github.com/BestNameYet/Terminals/issues/12',
      updated_at: '2026-11-17T00:00:00Z'
    },
    comments: [{
      id: Number(anchorCommentId),
      body: 'Counterpart introduction',
      html_url: 'https://github.com/BestNameYet/Terminals/issues/12#issuecomment-' + anchorCommentId,
      created_at: '2026-11-17T00:00:00Z',
      user: { login: 'BestNameYet' }
    }]
  }));
  const mockGh = [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    "const path = process.env.MOCK_GH_STATE;",
    "const state = JSON.parse(fs.readFileSync(path, 'utf8'));",
    'const args = process.argv.slice(2);',
    "const endpoint = args.find(value => value.startsWith('repos/BestNameYet/Terminals/')) || '';",
    "if (endpoint === 'repos/BestNameYet/Terminals/issues/12') { process.stdout.write(JSON.stringify(state.issue)); process.exit(0); }",
    "if (endpoint === 'repos/BestNameYet/Terminals/issues/12/comments?per_page=100') { process.stdout.write(JSON.stringify([state.comments])); process.exit(0); }",
    "if (endpoint.startsWith('repos/BestNameYet/Terminals/issues/comments/')) {",
    "  const id = Number(endpoint.split('/').at(-1));",
    "  const bodyArg = args.find(value => value.startsWith('body='));",
    "  const comment = state.comments.find(item => item.id === id);",
    "  if (!comment || !bodyArg) { process.stderr.write('invalid comment patch'); process.exit(2); }",
    "  comment.body = bodyArg.slice(5);",
    "  fs.writeFileSync(path, JSON.stringify(state));",
    "  process.stdout.write(JSON.stringify(comment));",
    "  process.exit(0);",
    '}',
    "process.stderr.write('unsupported gh api call: ' + args.join(' '));",
    'process.exit(2);',
    ''
  ].join('\n');
  const ghPath = join(scratch, 'gh');
  await writeFile(ghPath, mockGh);
  await chmod(ghPath, 0o755);
});

after(async () => {
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  if (originalStatePath === undefined) delete process.env.MOCK_GH_STATE;
  else process.env.MOCK_GH_STATE = originalStatePath;
  await rm(scratch, { recursive: true, force: true });
});

test('send appends to the addressed Issue #12 comment and returns cursor event', async () => {
  const result = await sendDeveloperChannelMessage({
    participant_id: 'counterpart',
    comment_id: anchorCommentId,
    message: 'First channel update'
  });
  assert.equal(result.participant_id, 'counterpart');
  assert.equal(result.comment_id, anchorCommentId);
  assert.equal(result.cursor, '1');
  assert.deepEqual(result.events.map(event => event.message), ['First channel update']);
  assert.equal(result.events[0].participant_id, 'counterpart');
  assert.equal(result.resource_uri, participantResourceUri('counterpart', anchorCommentId));

  const state = await readState();
  assert.equal(state.comments.length, 1);
  assert.equal(state.comments[0].id, Number(anchorCommentId));
  assert.match(state.comments[0].body, /Counterpart introduction/);
  assert.match(state.comments[0].body, /First channel update/);
});

test('read returns the stable resource and events after the supplied cursor', async () => {
  const second = await sendDeveloperChannelMessage({
    participant_id: 'counterpart',
    comment_id: anchorCommentId,
    message: 'Second channel update'
  });
  assert.equal(second.cursor, '2');
  assert.deepEqual(second.events.map(event => event.message), ['Second channel update']);

  const fromStart = await readDeveloperChannel({
    participant_id: 'counterpart',
    comment_id: anchorCommentId,
    after_cursor: '0'
  });
  assert.equal(fromStart.cursor, '2');
  assert.deepEqual(fromStart.events.map(event => event.cursor), ['1', '2']);

  const afterFirst = await readDeveloperChannel({
    participant_id: 'counterpart',
    comment_id: anchorCommentId,
    after_cursor: '1'
  });
  assert.deepEqual(afterFirst.events.map(event => event.message), ['Second channel update']);
  assert.equal(afterFirst.cursor, '2');

  const resources = await listDeveloperChannelResources();
  assert.deepEqual(resources.map(resource => resource.uri), [
    participantResourceUri('counterpart', anchorCommentId)
  ]);
  assert.deepEqual(parseParticipantResourceUri(resources[0].uri), {
    participant_id: 'counterpart',
    comment_id: anchorCommentId,
    after_cursor: '0'
  });
  const resourceContent = await readDeveloperChannelResource(resources[0].uri);
  assert.equal(resourceContent.cursor, '2');
  assert.deepEqual(resourceContent.events.map(event => event.message), [
    'First channel update',
    'Second channel update'
  ]);
});

test('rejects a comment outside Issue #12 and a participant mismatch', async () => {
  await assert.rejects(
    sendDeveloperChannelMessage({
      participant_id: 'counterpart',
      comment_id: '999',
      message: 'Should not append'
    }),
    /not a comment on BestNameYet\/Terminals issue 12/
  );
  await assert.rejects(
    readDeveloperChannel({
      participant_id: 'someone-else',
      comment_id: anchorCommentId
    }),
    /already bound to a different participant resource/
  );
});

test('schemas require participant and target comment identifiers', () => {
  assert.deepEqual(DEVELOPER_CHANNEL_SEND_SCHEMA.required, ['participant_id', 'comment_id', 'message']);
  assert.equal(DEVELOPER_CHANNEL_SEND_SCHEMA.additionalProperties, false);
  assert.deepEqual(DEVELOPER_CHANNEL_READ_SCHEMA.required, ['participant_id', 'comment_id']);
  assert.equal(DEVELOPER_CHANNEL_READ_SCHEMA.properties.after_cursor.type, 'string');
});

