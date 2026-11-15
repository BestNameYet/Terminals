import { execFile } from 'node:child_process';
import { isDeepStrictEqual, promisify } from 'node:util';

const exec = promisify(execFile);
const repository = 'BestNameYet/Terminals';
const path = 'conversations/analytics.json';
const route = 'repos/' + repository + '/contents/' + path;
const branch = 'main';
const allowedEntryTypes = new Set([
  'BEGINNING_OF_TURN',
  'SCRATCHPAD',
  'JOURNAL',
  'TASK_ANALYSIS',
  'END_OF_TURN',
]);

function validateEntryType(event) {
  if (!allowedEntryTypes.has(event?.entry_type)) {
    throw new Error('Invalid entry_type: expected one of ' + [...allowedEntryTypes].join(', '));
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
    if (result.status !== 200) throw new Error('Event journal read failed (GitHub HTTP ' + result.status + ')');
    const sha = result.data?.sha;
    const blob = result.data?.encoding === 'none' && sha
      ? await request('GET', 'repos/' + repository + '/git/blobs/' + sha)
      : result;
    if (blob.status !== 200 || blob.data?.encoding !== 'base64' || typeof blob.data.content !== 'string') {
      throw new Error('GitHub did not return the event journal file contents (HTTP ' + blob.status + ')');
    }
    const records = JSON.parse(Buffer.from(blob.data.content, 'base64').toString('utf8'));
    if (!Array.isArray(records)) throw new Error('The persisted event journal file must contain a JSON array');
    return { records, sha };
  }

  return async function EOTRecorder(event) {
    validateEntryType(event);

    let snapshot = await read(branch, true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const { records, sha } = snapshot;
      const updated = [...records, event];
      const content = Buffer.from(JSON.stringify(updated, null, 2) + '\n').toString('base64');
      const write = await request('PUT', route, {
        body: { message: 'Append conversation event', branch, content, sha },
      });
      if (write.status === 409 || write.status === 422) {
        const latest = await read(branch, true);
        if (write.status === 409 || latest.sha !== sha) {
          snapshot = latest;
          continue;
        }
      }
      if (write.status !== 200 && write.status !== 201) {
        throw new Error('Event append failed (GitHub HTTP ' + write.status + ')');
      }
      const commit = write.data?.commit?.sha;
      if (!/^[a-f0-9]{40}$/.test(commit ?? '')) {
        throw new Error('Event append verification failed: GitHub returned no commit SHA');
      }
      try {
        const persisted = await read(commit);
        if (!isDeepStrictEqual(persisted.records, updated)) {
          throw new Error('committed event journal differs from the expected append');
        }
      } catch (error) {
        throw new Error('Event append verification failed at ' + commit + ': ' + error.message);
      }
      return { status: 'verified', message: 'Event appended and verified', entry_type: event.entry_type, repository, branch, path, commit, index: records.length };
    }
    throw new Error('Event append failed after five revision conflicts');
  };
}

export const EOTRecorder = createEOTRecorder();
