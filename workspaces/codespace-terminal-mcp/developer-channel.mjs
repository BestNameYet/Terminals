import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repository = 'BestNameYet/Terminals';
const issueNumber = 12;
const issueEndpoint = 'repos/' + repository + '/issues/' + issueNumber;
const commentsEndpoint = 'repos/' + repository + '/issues/comments';
const resourceStart = '<!-- terminals-channel-resource:v1 -->';
const resourceEnd = '<!-- /terminals-channel-resource:v1 -->';
const participantPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const commentIdPattern = /^[1-9][0-9]{0,19}$/;
const cursorPattern = /^(0|[1-9][0-9]{0,19})$/;
const writeLocks = new Map();

export const DEVELOPER_CHANNEL_RESOURCE_TEMPLATE =
  'terminals://developer-channel/participant/{participant_id}/comment/{comment_id}';

export const DEVELOPER_CHANNEL_READ_SCHEMA = {
  type: 'object',
  required: ['participant_id', 'comment_id'],
  additionalProperties: false,
  properties: {
    participant_id: {
      type: 'string', minLength: 1, maxLength: 128,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$',
      description: 'Stable target-agent identifier for this channel resource.'
    },
    comment_id: {
      type: 'string', minLength: 1, maxLength: 20,
      pattern: '^[1-9][0-9]{0,19}$',
      description: 'Existing Issue #12 comment that stores this participant resource.'
    },
    after_cursor: {
      type: 'string', minLength: 1, maxLength: 20,
      pattern: '^(0|[1-9][0-9]{0,19})$',
      description: 'Return events with a per-resource cursor greater than this value.'
    }
  }
};

export const DEVELOPER_CHANNEL_SEND_SCHEMA = {
  type: 'object',
  required: ['participant_id', 'comment_id', 'message'],
  additionalProperties: false,
  properties: {
    participant_id: {
      type: 'string', minLength: 1, maxLength: 128,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$',
      description: 'Stable target-agent identifier for this channel resource.'
    },
    comment_id: {
      type: 'string', minLength: 1, maxLength: 20,
      pattern: '^[1-9][0-9]{0,19}$',
      description: 'Existing Issue #12 comment to update in place.'
    },
    message: {
      type: 'string', minLength: 1, maxLength: 5000,
      description: 'Text to append to the target participant resource.'
    }
  }
};

function validateParticipantId(value) {
  if (typeof value !== 'string' || !participantPattern.test(value)) {
    throw new TypeError('participant_id must be a stable 1-128 character identifier');
  }
  return value;
}

function validateCommentId(value) {
  if (typeof value !== 'string' || !commentIdPattern.test(value)) {
    throw new TypeError('comment_id must be a positive decimal string');
  }
  return value;
}

export function normalizeCursor(value = '0') {
  if (typeof value !== 'string' || !cursorPattern.test(value)) {
    throw new TypeError('after_cursor must be a nonnegative decimal string');
  }
  return value;
}

function compareDecimal(left, right) {
  const a = BigInt(left);
  const b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function participantResourceUri(participantId, commentId) {
  return 'terminals://developer-channel/participant/' +
    encodeURIComponent(validateParticipantId(participantId)) +
    '/comment/' + validateCommentId(commentId);
}

export function parseParticipantResourceUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'terminals:' || parsed.hostname !== 'developer-channel') return null;
  const match = /^\/participant\/([^/]+)\/comment\/([1-9][0-9]{0,19})$/.exec(parsed.pathname);
  if (!match) return null;
  let participantId;
  try {
    participantId = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (!participantPattern.test(participantId)) return null;
  const afterCursor = parsed.searchParams.get('after_cursor') ?? '0';
  if (!cursorPattern.test(afterCursor)) return null;
  return { participant_id: participantId, comment_id: match[2], after_cursor: afterCursor };
}

export function parseResourceCommentBody(body = '') {
  const text = String(body);
  if (!text.startsWith(resourceStart + '\n')) return { resource: null, preamble: text };
  const contentStart = resourceStart.length + 1;
  const endAt = text.indexOf('\n' + resourceEnd, contentStart);
  if (endAt < 0) throw new TypeError('Target comment has an incomplete channel resource marker');
  let resource;
  try {
    resource = JSON.parse(text.slice(contentStart, endAt));
  } catch {
    throw new TypeError('Target comment has invalid channel resource JSON');
  }
  const visibleStart = endAt + 1 + resourceEnd.length;
  const visible = text.slice(visibleStart).replace(/^\r?\n\r?\n/, '');
  if (!resource || resource.schema !== 'terminals.developer-channel.resource.v1' ||
      !Array.isArray(resource.events) || typeof resource.cursor !== 'string' ||
      !cursorPattern.test(resource.cursor)) {
    throw new TypeError('Target comment has an invalid channel resource payload');
  }
  return { resource, preamble: resource.preamble || visible };
}

export function renderResourceCommentBody(resource) {
  const visibleEvents = resource.events.map(event =>
    '### Update ' + event.cursor + '\n\n' + event.message +
    (event.created_at ? '\n\n_' + event.created_at + '_' : '')
  );
  const visible = [resource.preamble, ...visibleEvents]
    .filter(value => typeof value === 'string' && value.length > 0)
    .join('\n\n---\n\n');
  return resourceStart + '\n' + JSON.stringify(resource) + '\n' +
    resourceEnd + (visible ? '\n\n' + visible : '');
}

export function selectResourceEvents(resource, afterCursor = '0') {
  const after = normalizeCursor(afterCursor);
  const cursor = resource?.cursor ?? '0';
  if (!cursorPattern.test(cursor)) throw new TypeError('Resource cursor is invalid');
  const events = (resource?.events ?? []).filter(event =>
    typeof event.cursor === 'string' && compareDecimal(event.cursor, after) > 0
  );
  return { after_cursor: after, cursor, events };
}

function resourceFromComment(comment, participantId, commentId) {
  const parsed = parseResourceCommentBody(comment.body || '');
  if (parsed.resource) {
    if (parsed.resource.participant_id !== participantId ||
        String(parsed.resource.comment_id) !== commentId) {
      throw new Error('comment_id is already bound to a different participant resource');
    }
    return parsed.resource;
  }
  return {
    schema: 'terminals.developer-channel.resource.v1',
    participant_id: participantId,
    comment_id: commentId,
    cursor: '0',
    preamble: parsed.preamble,
    events: []
  };
}

function assertUniqueParticipantRoute(comments, participantId, commentId) {
  for (const comment of comments) {
    if (String(comment.id) === commentId) continue;
    const parsed = parseResourceCommentBody(comment.body || '');
    if (parsed.resource?.participant_id === participantId) {
      throw new Error('participant_id already routes to Issue #12 comment ' + parsed.resource.comment_id);
    }
  }
}

function findComment(comments, commentId) {
  const target = comments.find(comment => String(comment.id) === commentId);
  if (!target) throw new RangeError('comment_id is not a comment on BestNameYet/Terminals issue 12');
  return target;
}

async function githubApi(args) {
  try {
    const { stdout } = await execFileAsync('gh', ['api', ...args], {
      timeout: 20000,
      maxBuffer: 4 * 1024 * 1024
    });
    return JSON.parse(stdout);
  } catch (error) {
    const detail = String(error.stderr || '').trim();
    throw new Error(detail || ('GitHub request failed: ' + error.message));
  }
}

async function readIssueAndComments() {
  const [issue, commentPages] = await Promise.all([
    githubApi([issueEndpoint]),
    githubApi(['--paginate', '--slurp', issueEndpoint + '/comments?per_page=100'])
  ]);
  const comments = Array.isArray(commentPages) ? commentPages.flat(Infinity) : commentPages;
  if (!Array.isArray(comments)) throw new TypeError('GitHub returned an invalid issue comment list');
  return { issue, comments };
}

function resourcePayload(resource, afterCursor = '0') {
  const selected = selectResourceEvents(resource, afterCursor);
  return {
    schema: 'terminals.developer-channel.resource.v1',
    participant_id: resource.participant_id,
    comment_id: resource.comment_id,
    after_cursor: selected.after_cursor,
    cursor: selected.cursor,
    events: selected.events,
    resource_uri: participantResourceUri(resource.participant_id, resource.comment_id)
  };
}

async function withCommentLock(commentId, operation) {
  const prior = writeLocks.get(commentId) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  writeLocks.set(commentId, current);
  await prior;
  try {
    return await operation();
  } finally {
    release();
    if (writeLocks.get(commentId) === current) writeLocks.delete(commentId);
  }
}

export async function readDeveloperChannel({ participant_id, comment_id, after_cursor = '0' } = {}) {
  const participantId = validateParticipantId(participant_id);
  const commentId = validateCommentId(comment_id);
  const afterCursor = normalizeCursor(after_cursor);
  const { comments } = await readIssueAndComments();
  const comment = findComment(comments, commentId);
  const resource = resourceFromComment(comment, participantId, commentId);
  return resourcePayload(resource, afterCursor);
}

export async function readDeveloperChannelResource(uri) {
  const route = parseParticipantResourceUri(uri);
  if (!route) throw new TypeError('Unknown developer channel resource URI');
  return readDeveloperChannel(route);
}

export async function listDeveloperChannelResources() {
  const { comments } = await readIssueAndComments();
  const resources = [];
  for (const comment of comments) {
    const parsed = parseResourceCommentBody(comment.body || '');
    if (!parsed.resource) continue;
    const resource = parsed.resource;
    resources.push({
      uri: participantResourceUri(resource.participant_id, resource.comment_id),
      name: 'Comm channel for ' + resource.participant_id,
      description: 'Stable resource stored in Issue #12 comment ' + resource.comment_id,
      mimeType: 'application/json'
    });
  }
  return resources;
}

export async function sendDeveloperChannelMessage({ participant_id, comment_id, message } = {}) {
  const participantId = validateParticipantId(participant_id);
  const commentId = validateCommentId(comment_id);
  if (typeof message !== 'string' || !message.trim()) throw new TypeError('Message must be nonblank text');
  if (message.length > 5000) throw new RangeError('Message must be 5000 characters or fewer');

  return withCommentLock(commentId, async () => {
    const { comments } = await readIssueAndComments();
    const target = findComment(comments, commentId);
    assertUniqueParticipantRoute(comments, participantId, commentId);
    const resource = resourceFromComment(target, participantId, commentId);
    const cursor = (BigInt(resource.cursor) + 1n).toString();
    const event = {
      cursor,
      participant_id: participantId,
      comment_id: commentId,
      created_at: new Date().toISOString(),
      message
    };
    const updatedResource = { ...resource, cursor, events: [...resource.events, event] };
    const updated = await githubApi([
      commentsEndpoint + '/' + commentId,
      '-X', 'PATCH',
      '-f', 'body=' + renderResourceCommentBody(updatedResource)
    ]);
    const verified = parseResourceCommentBody(updated.body || '');
    if (verified.resource?.participant_id !== participantId ||
        verified.resource?.comment_id !== commentId ||
        verified.resource?.cursor !== cursor ||
        verified.resource?.events.at(-1)?.message !== message) {
      throw new Error('Issue #12 comment update did not persist the appended channel event');
    }
    return resourcePayload(verified.resource, (BigInt(cursor) - 1n).toString());
  });
}

export async function DeveloperChannel(args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new TypeError('DeveloperChannel requires one JSON object');
  }
  const keys = Object.keys(args);
  if (args.action === 'read' && keys.length >= 3 &&
      ['action', 'participant_id', 'comment_id'].every(key => keys.includes(key)) &&
      keys.every(key => ['action', 'participant_id', 'comment_id', 'after_cursor'].includes(key))) {
    return readDeveloperChannel(args);
  }
  if (args.action === 'send' && keys.length === 4 &&
      ['action', 'participant_id', 'comment_id', 'message'].every(key => keys.includes(key))) {
    return sendDeveloperChannelMessage(args);
  }
  throw new TypeError('Expected read with participant_id/comment_id and optional after_cursor, or send with participant_id/comment_id/message');
}
