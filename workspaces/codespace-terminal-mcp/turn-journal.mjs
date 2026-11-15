import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual, promisify } from 'node:util';

const exec = promisify(execFile);
const repository = 'BestNameYet/Terminals';
const branch = 'main';
const path = 'conversations/analytics.json';
const route = 'repos/' + repository + '/contents/' + path;
const templateURL = new URL('../../conversations/turn-journal.template.json', import.meta.url);
const validKey = /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/;
const validEvents = new Set(['begin_turn','scratchpad','end_task','end_turn']);

function validate(value, shape, key) {
  const invalid = () => { throw new Error('Invalid value for ' + key); };
  if (Array.isArray(shape)) {
    if (!Array.isArray(value) || shape.length !== 1) invalid();
    value.forEach((item, index) => validate(item, shape[0], key + '[' + index + ']'));
  } else if (shape && typeof shape === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
    const required = Object.keys(shape);
    if (Object.keys(value).length !== required.length) invalid();
    for (const prop of Object.keys(value)) {
      if (!Object.hasOwn(shape, prop)) throw new Error('Unexpected field ' + key + '.' + prop);
    }
    for (const prop of required) validate(value[prop], shape[prop], key + '.' + prop);
  } else if (shape === 'text' || shape === 'text_or_null') {
    if (shape === 'text_or_null' && value === null) return;
    if (typeof value !== 'string' || !value.trim()) invalid();
  } else if (shape === 'integer' || shape === 'positive_integer') {
    if (!Number.isSafeInteger(value) || value < (shape === 'positive_integer' ? 1 : 0)) invalid();
  } else if (shape === 'utc_datetime') {
    if (typeof value !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value))) invalid();
  } else if (shape === 'boolean') {
    if (typeof value !== 'boolean') invalid();
  } else if (value !== shape) invalid();
}

function dateOf(event) {
  return event.data.started_at_utc || event.data.recorded_at_utc ||
    event.data.ended_at_utc;
}

function checkRequest(request, template) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Expected a JSON event object');
  const event = request.event;
  if (!validEvents.has(event)) throw new Error('Unknown journal event: ' + String(event));
  const keys = ['template_id', 'template_version', 'event', 'event_id', 'turn_key', 'data'];
  if (event === 'begin_turn') keys.push('task_id', 'turn_id');
  for (const key of keys) if (!Object.hasOwn(request, key)) throw new Error('Missing field ' + key);
  for (const key of Object.keys(request)) if (!keys.includes(key)) throw new Error('Unexpected field ' + key);
  if (request.template_id !== template.template_id || request.template_version !== template.template_version) {
    throw new Error('Incompatible journal template version');
  }
  if (!validKey.test(request.turn_key)) throw new Error('Invalid turn_key');
  if (!validKey.test(request.event_id)) throw new Error('Invalid event_id');
  if (event === 'begin_turn') {
    if (!validKey.test(request.task_id)) throw new Error('Invalid task_id');
    validate(request.turn_id, 'positive_integer', 'turn_id');
  }
  validate(request.data, template.event_data_shapes[event], 'data');
  if (event === 'begin_turn') {
    if (!request.data.conversation_topics.length || !request.data.topic_categories.length) {
      throw new Error('Beginning of turn requires topics and categories');
    }
    if (Math.floor(Date.parse(request.data.started_at_utc) / 1000) !== request.data.started_unix_seconds) {
      throw new Error('Begin timestamp does not match its Unix seconds');
    }
  }
  if (event === 'scratchpad' && !['observation','action','tool','decision','blocker','correction','verification','progress','other'].includes(request.data.entry_type)) {
    throw new Error('Invalid scratchpad entry_type');
  }
  if (event === 'end_task') {
    if (!['completed','partial','blocked','failed','cancelled'].includes(request.data.task_status)) {
      throw new Error('Invalid task_status');
    }
    for (const item of request.data.requirements_evaluation) {
      if (!['pass','fail','partial','unverified'].includes(item.status)) {
        throw new Error('Invalid requirements_evaluation.status');
      }
    }
  }
  return request;
}

function digest(request) {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

function apply(records, request) {
  const index = records.findIndex(item => item?.template_id === 'terminals.turn-journal' &&
    item.turn_key === request.turn_key);
  const fingerprint = digest(request);
  if (request.event === 'begin_turn') {
    if (index !== -1) {
      const existing = records[index];
      const found = existing.event_log?.find(x => x.event_id === request.event_id);
      if (found?.fingerprint === fingerprint) return { updated: records, index, duplicate: true };
      throw new Error('turn_key already exists or begin event was modified');
    }
    const initial = request.data;
    const journal = {
      record_type: 'turn_lifecycle_journal',
      template_id: request.template_id,
      template_version: request.template_version,
      turn_key: request.turn_key,
      task_id: request.task_id,
      turn_id: request.turn_id,
      state: 'open',
      initial,
      scratchpad_entries: [],
      end_of_task_analysis: null,
      end_of_turn_analysis: null,
      event_log: [{ event_id: request.event_id, event: request.event,
        at_utc: dateOf(request), fingerprint }],
      updated_at_utc: dateOf(request),
    };
    return { updated: [...records, journal], index: records.length, duplicate: false };
  }
  if (index === -1) throw new Error('Unknown turn_key; begin_turn is required first');
  const current = records[index];
  const previous = current.event_log.find(x => x.event_id === request.event_id);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error('event_id reuse with different content');
    return { updated: records, index, duplicate: true };
  }
  if (current.state !== 'open') throw new Error('Cannot modify a closed turn journal');
  const now = dateOf(request);
  if (Date.parse(now) < Date.parse(current.updated_at_utc)) {
    throw new Error('Journal event timestamps must be chronological');
  }
  const next = {
    ...current,
    scratchpad_entries: [...current.scratchpad_entries],
    event_log: [...current.event_log, { event_id: request.event_id,
      event: request.event, at_utc: now, fingerprint }],
    updated_at_utc: now,
  };
  if (request.event === 'scratchpad') next.scratchpad_entries.push(request.data);
  if (request.event === 'end_task') {
    if (current.end_of_task_analysis !== null) throw new Error('Task analysis already recorded for turn');
    next.end_of_task_analysis = request.data;
  }
  if (request.event === 'end_turn') {
    if (request.data.task_closed !== (current.end_of_task_analysis !== null)) {
      throw new Error('task_closed must match the recorded end_task event');
    }
    next.end_of_turn_analysis = request.data;
    next.state = 'closed';
  }
  const updated = records.slice();
  updated[index] = next;
  return { updated, index, duplicate: false };
}

async function githubRequest(method, endpoint, { ref, body } = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN ||
    (await exec('gh', ['auth','token','--hostname','github.com'], {timeout:5000})).stdout.trim();
  const url = new URL('https://api.github.com/' + endpoint);
  if (ref) url.searchParams.set('ref', ref);
  const response = await fetch(url, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, data: await response.json() };
}

export function createTurnJournal({ request = githubRequest } = {}) {
  async function read(ref, allowMissing = false) {
    const result = await request('GET', route, { ref });
    if (result.status === 404 && allowMissing) return { records: [], sha: undefined };
    if (result.status !== 200) throw new Error('Journal read failed (GitHub HTTP ' + result.status + ')');
    const sha = result.data?.sha;
    const blob = result.data?.encoding === 'none' && sha
      ? await request('GET', 'repos/' + repository + '/git/blobs/' + sha)
      : result;
    if (blob.status !== 200 || blob.data?.encoding !== 'base64' || typeof blob.data.content !== 'string') {
      throw new Error('GitHub did not return journal contents (HTTP ' + blob.status + ')');
    }
    const records = JSON.parse(Buffer.from(blob.data.content, 'base64').toString('utf8'));
    if (!Array.isArray(records)) throw new Error('Analytics destination must be a JSON array');
    return { records, sha };
  }

  return async function TurnJournal(input) {
    const template = JSON.parse(await readFile(templateURL, 'utf8'));
    if (template.template_id !== 'terminals.turn-journal' || template.template_version !== '2.0.0') {
      throw new Error('Unsupported journal template');
    }
    const command = checkRequest(input, template);
    let snapshot = await read(branch, true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = apply(snapshot.records, command);
      if (result.duplicate) {
        return {status:'already_recorded',repository,branch,path,turn_key:command.turn_key,
          event_id:command.event_id,index:result.index,commit:null};
      }
      const content = Buffer.from(JSON.stringify(result.updated,null,2) + '\n').toString('base64');
      const write = await request('PUT', route, {body:{
        message:'Record turn journal ' + command.event + ' ' + command.turn_key,
        branch, content, sha:snapshot.sha,
      }});
      if (write.status === 409 || write.status === 422) {
        const latest = await read(branch, true);
        if (write.status === 409 || latest.sha !== snapshot.sha) {
          snapshot = latest;
          continue;
        }
      }
      if (write.status !== 200 && write.status !== 201) {
        throw new Error('Journal write failed (GitHub HTTP ' + write.status + ')');
      }
      const commit = write.data?.commit?.sha;
      if (!/^[a-f0-9]{40}$/.test(commit ?? '')) {
        throw new Error('Journal verification failed: commit SHA missing');
      }
      const persisted = await read(commit);
      if (!isDeepStrictEqual(persisted.records, result.updated)) {
        throw new Error('Journal verification failed: committed data differs from expected event');
      }
      return {status:'verified',repository,branch,path,commit,
        turn_key:command.turn_key,event:command.event,event_id:command.event_id,
        index:result.index,state:result.updated[result.index].state};
    }
    throw new Error('Journal update failed after five revision conflicts');
  };
}
export const TurnJournal = createTurnJournal();
