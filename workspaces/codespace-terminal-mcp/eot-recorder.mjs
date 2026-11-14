import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual, promisify } from 'node:util';

const exec = promisify(execFile);
const repository = 'BestNameYet/Terminals';
const path = 'conversations/analytics.json';
const route = 'repos/' + repository + '/contents/' + path;
const branch = 'main';
const templateUrl = new URL('../../conversations/conversation-record.template.json', import.meta.url);

function validate(value, shape, key = 'record') {
  const fail = () => { throw new Error('Invalid value for ' + key); };
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) fail();
    value.forEach((item, index) => validate(item, shape[0], key + '[' + index + ']'));
  } else if (shape && typeof shape === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
    for (const name of Object.keys(value)) {
      if (!Object.hasOwn(shape, name)) throw new Error('Unexpected field ' + key + '.' + name);
    }
    for (const [name, entry] of Object.entries(shape)) validate(value[name], entry, key + '.' + name);
  } else if (shape === 'integer' || shape === 'positive_integer') {
    if (!Number.isSafeInteger(value) || value < (shape === 'positive_integer' ? 1 : 0)) fail();
  } else if (shape === 'utc_datetime') {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)
        || !Number.isFinite(Date.parse(value))) fail();
  } else if (shape === 'text' || shape === 'text_or_null') {
    if (!(shape === 'text_or_null' && value === null) && (typeof value !== 'string' || !value.trim())) fail();
  } else if (value !== shape) {
    fail();
  }
}

async function githubRequest(method, endpoint, { ref, body } = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
    || (await exec('gh', ['auth', 'token', '--hostname', 'github.com'], { timeout: 5000 })).stdout.trim();
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

export function createEOTRecorder({ request = githubRequest } = {}) {
  async function read(ref, allowMissing = false) {
    const result = await request('GET', route, { ref });
    if (result.status === 404 && allowMissing) return { records: [], sha: undefined };
    if (result.status !== 200) throw new Error('Analytics read failed (GitHub HTTP ' + result.status + ')');
    const sha = result.data?.sha;
    const blob = result.data?.encoding === 'none' && sha
      ? await request('GET', 'repos/' + repository + '/git/blobs/' + sha)
      : result;
    if (blob.status !== 200 || blob.data?.encoding !== 'base64' || typeof blob.data.content !== 'string') {
      throw new Error('GitHub did not return the analytics file contents (HTTP ' + blob.status + ')');
    }
    const records = JSON.parse(Buffer.from(blob.data.content, 'base64').toString('utf8'));
    if (!Array.isArray(records)) throw new Error('The persisted analytics file must contain a JSON array');
    return { records, sha };
  }

  return async function EOTRecorder(record) {
    const template = JSON.parse(await readFile(templateUrl, 'utf8'));
    validate(record, template);
    const context = record.target_exchange.summary_of_adjacent_conversation;
    if (context.preceding_user_turn_count !== context.preceding_user_turns_chronological.length) {
      throw new Error('preceding_user_turn_count must match preceding_user_turns_chronological');
    }

    let snapshot = await read(branch, true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const { records, sha } = snapshot;
      const updated = [...records, record];
      const content = Buffer.from(JSON.stringify(updated, null, 2) + '\n').toString('base64');
      const write = await request('PUT', route, {
        body: { message: 'Append conversation analytics record', branch, content, sha },
      });
      if (write.status === 409 || write.status === 422) {
        const latest = await read(branch, true);
        if (write.status === 409 || latest.sha !== sha) {
          snapshot = latest;
          continue;
        }
      }
      if (write.status !== 200 && write.status !== 201) {
        throw new Error('Analytics write failed (GitHub HTTP ' + write.status + ')');
      }
      const commit = write.data?.commit?.sha;
      if (!/^[a-f0-9]{40}$/.test(commit ?? '')) {
        throw new Error('Analytics verification failed: GitHub returned no commit SHA');
      }
      try {
        const persisted = await read(commit);
        if (!isDeepStrictEqual(persisted.records, updated)) {
          throw new Error('committed analytics differ from the expected append');
        }
      } catch (error) {
        throw new Error('Analytics verification failed at ' + commit + ': ' + error.message);
      }
      return { status: 'verified', repository, branch, path, commit, index: records.length };
    }
    throw new Error('Analytics write failed after five revision conflicts');
  };
}

export const EOTRecorder = createEOTRecorder();
