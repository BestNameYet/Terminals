import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';

const secretKey = /^(?:.*(?:password|passwd|token|secret|credential)|authorization|cookie|set-cookie|api[_-]?key|private[_-]?key)$/i;

function maskText(text) {
  return text
    .replace(/(\bBearer\s+|\bAuthorization\s*:\s*Basic\s+|"authorization"\s*:\s*"Basic\s+)[\w.~+/=-]+/gi, '$1[masked]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[masked]')
    .replace(/((?:"[^"]*(?:token|password|passwd|secret|credential)"|"authorization"|"cookie"|"set-cookie"|"api[_-]?key"|"private[_-]?key")\s*:\s*)"(?:\\.|[^"\\])*"/gi, '$1"[masked]"')
    .replace(/(\b[\w-]*(?:token|password|passwd|secret|credential)|\bapi[_-]?key|\bcookie)(\s*=\s*|\s*:\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s;,)}]+)/gi, '$1$2[masked]')
    .replace(/(--[\w-]*(?:token|password|passwd|secret|credential|api-key)\s+)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s;,)}]+)/gi, '$1[masked]');
}

function capture(value, maxBytes) {
  const text = JSON.stringify(value ?? null, (key, entry) => {
    if (secretKey.test(key)) return '[masked]';
    return typeof entry === 'string' ? maskText(entry) : entry;
  }, 2);
  const bytes = Buffer.from(text);
  return bytes.length > maxBytes
    ? { text: new TextDecoder().decode(bytes.subarray(0, maxBytes), { stream: true }), truncated: true }
    : { text, truncated: false };
}

function describe(params) {
  const args = params.arguments;
  const mode = ['$', 'gh', '@'].includes(args?.runOn) ? args.runOn : undefined;
  const prompt = typeof args?.whatPrompt === 'string' ? args.whatPrompt.trim() : '';
  const [alias, payload] = mode === '@' ? (prompt.match(/^([A-Za-z][\w-]{0,80})(?:\s+([\s\S]+))?$/)?.slice(1) ?? []) : [];
  let procedure;
  if (alias === 'Procedure' && payload) {
    try {
      const { nonce } = JSON.parse(payload) ?? {};
      if (typeof nonce === 'string' && /^[a-f0-9-]{36}$/i.test(nonce)) procedure = { nonce };
    } catch {
      // The tool dispatcher reports invalid syntax to the caller.
    }
  }
  const forWhom = typeof args?.forWhom === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(args.forWhom)
    ? maskText(args.forWhom) : undefined;
  const summary = mode && mode !== '@' && prompt ? maskText(prompt.split('\n', 1)[0]).slice(0, 80) : undefined;
  return { tool: maskText(params.name ?? '').slice(0, 120), mode, alias: alias && maskText(alias), forWhom, summary, procedure };
}

function formatEvent(event) {
  return 'id: ' + event.id + '\ndata: ' + JSON.stringify(event) + '\n\n';
}

export async function createSupervisor({ journalPath, limit = 300, maxBytes = 65536 }) {
  if (!Number.isSafeInteger(limit) || limit < 2 || limit > 2000) throw new RangeError('Invalid supervisor retention');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 256 || maxBytes > 262144) throw new RangeError('Invalid supervisor payload limit');

  let events = [];
  let floor = 0;
  let cursor = 0;
  let journalLines = 0;
  let degraded = false;
  let rewrite = false;
  let queue = Promise.resolve();
  let server;
  const active = new Map();
  const clients = new Set();

  async function compact() {
    const temporary = journalPath + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, [JSON.stringify({ floor }), ...events.map(event => JSON.stringify(event))].join('\n') + '\n', { mode: 0o600 });
    await rename(temporary, journalPath);
    journalLines = events.length;
    rewrite = false;
  }

  try {
    await mkdir(dirname(journalPath), { recursive: true, mode: 0o700 });
    const raw = await readFile(journalPath, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return '';
    });
    for (const line of raw.split('\n').filter(Boolean)) {
      try {
        const entry = JSON.parse(line);
        if (Number.isSafeInteger(entry.floor)) {
          floor = Math.max(floor, entry.floor);
        } else if (Number.isSafeInteger(entry.id) && entry.id > cursor && entry.callId &&
                   ['call.started', 'call.finished'].includes(entry.type)) {
          events.push(entry);
          cursor = entry.id;
        } else {
          rewrite = degraded = true;
        }
      } catch {
        rewrite = degraded = true;
      }
    }
    if (raw && !raw.endsWith('\n')) rewrite = true;
    cursor = Math.max(cursor, floor);
    journalLines = events.length;
    if (events.length > limit) {
      floor = events.at(-limit - 1).id;
      events = events.slice(-limit);
      rewrite = true;
    }
  } catch {
    degraded = rewrite = true;
  }

  function writeClient(client, text) {
    // Close a slow connection and let it replay from its last delivered cursor.
    if (client.destroyed) return;
    if (client.writableLength > 524288) client.destroy();
    else client.write(text);
  }

  function markDegraded() {
    if (degraded) return;
    degraded = true;
    for (const client of clients) writeClient(client, 'event: degraded\ndata: {}\n\n');
  }

  function record(payload) {
    const operation = queue.then(async () => {
      const event = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
      if (event.type === 'call.finished') event.started ??= active.get(event.callId);
      if (event.started === undefined) delete event.started;
      event.id = cursor = Math.max(cursor + 1, Date.now() * 1000);
      events.push(event);
      if (event.type === 'call.started') active.set(event.callId, event);
      else active.delete(event.callId);
      if (events.length > limit) floor = events.shift().id;

      try {
        if (rewrite || journalLines >= limit + Math.max(4, Math.floor(limit / 4))) await compact();
        else {
          await appendFile(journalPath, JSON.stringify(event) + '\n', { mode: 0o600 });
          journalLines++;
        }
      } catch {
        rewrite = true;
        markDegraded();
      }
      for (const client of clients) writeClient(client, formatEvent(event));
    });
    queue = operation.catch(markDegraded);
    return queue;
  }

  const interrupted = new Map();
  for (const event of events) {
    if (event.type === 'call.started') interrupted.set(event.callId, event);
    else interrupted.delete(event.callId);
  }
  for (const previous of interrupted.values()) {
    await record({
      type: 'call.finished', callId: previous.callId, timestamp: new Date().toISOString(),
      status: 'interrupted', procedure: previous.procedure, started: previous
    });
  }

  function snapshot() {
    const retained = new Map([...events.map(event => [event.id, event]), ...[...active.values()].map(event => [event.id, event])]);
    return { cursor, floor, degraded, events: [...retained.values()].sort((a, b) => a.id - b.id) };
  }

  function since(after) {
    const gap = !Number.isSafeInteger(after) || after < floor || after > cursor ||
      (after !== 0 && after !== floor && !events.some(event => event.id === after));
    return { gap, events: gap ? [] : events.filter(event => event.id > after) };
  }

  async function observe(params, run) {
    const callId = randomUUID();
    const start = performance.now();
    let procedure;
    try {
      const fields = describe(params);
      procedure = fields.procedure;
      await record({
        type: 'call.started', callId, timestamp: new Date().toISOString(), ...fields,
        request: capture(params.arguments, maxBytes)
      });
    } catch {
      markDegraded();
    }

    function observeProcedure(value) {
      procedure = value;
    }

    async function finish(result, error) {
      try {
        const envelope = result?.content?.find(block => block.type === 'text');
        const status = error ? 'failed' : envelope?.timedOut ? 'timed_out' : envelope?.overflow ? 'overflow'
          : result?.isError ? 'failed' : 'succeeded';
        await record({
          type: 'call.finished', callId, timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start), status, procedure,
          exitCode: envelope?.exitCode,
          response: capture(error ? { name: error.name, message: error.message, code: error.code } : result, maxBytes)
        });
      } catch {
        markDegraded();
      }
    }

    let result;
    try {
      result = await run(observeProcedure);
    } catch (error) {
      await finish(undefined, error);
      throw error;
    }
    await finish(result);
    return result;
  }

  async function listen(port) {
    const page = await readFile(new URL('./supervisor.html', import.meta.url));
    server = createServer((req, res) => {
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-content-type-options', 'nosniff');
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' }).end();
        return;
      }
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/') {
        res.setHeader('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page);
      } else if (url.pathname === '/snapshot') {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(snapshot()));
      } else if (url.pathname === '/events') {
        const raw = req.headers['last-event-id'] ?? url.searchParams.get('after') ?? '0';
        const replay = since(/^\d+$/.test(raw) ? Number(raw) : NaN);
        res.writeHead(200, { 'content-type': 'text/event-stream', 'x-accel-buffering': 'no' });
        res.flushHeaders();
        if (replay.gap) {
          res.end('event: gap\ndata: {}\n\n');
          return;
        }
        clients.add(res);
        const heartbeat = setInterval(() => writeClient(res, ': heartbeat\n\n'), 15000);
        res.on('close', () => {
          clearInterval(heartbeat);
          clients.delete(res);
        });
        for (const event of replay.events) writeClient(res, formatEvent(event));
        if (degraded) writeClient(res, 'event: degraded\ndata: {}\n\n');
      } else {
        res.writeHead(404).end();
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    return server;
  }

  async function close() {
    await queue;
    for (const client of clients) client.destroy();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }

  return { observe, snapshot, since, listen, close };
}
