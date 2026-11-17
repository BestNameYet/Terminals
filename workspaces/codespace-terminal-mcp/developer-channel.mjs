import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repository = 'BestNameYet/Terminals';
const issueNumber = 12;
const issueEndpoint = 'repos/' + repository + '/issues/' + issueNumber;

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

function issueMessage(issue) {
  return {
    id: 'issue-' + issue.number,
    kind: 'opening',
    author: issue.user?.login || 'unknown',
    createdAt: issue.created_at,
    body: issue.body || '',
    url: issue.html_url
  };
}

function commentMessage(comment) {
  return {
    id: String(comment.id),
    kind: 'comment',
    author: comment.user?.login || 'unknown',
    createdAt: comment.created_at,
    body: comment.body || '',
    url: comment.html_url
  };
}

export async function readDeveloperChannel() {
  const [issue, commentPages] = await Promise.all([
    githubApi([issueEndpoint]),
    githubApi(['--paginate', '--slurp', issueEndpoint + '/comments?per_page=100'])
  ]);
  const comments = Array.isArray(commentPages) ? commentPages.flat(Infinity) : commentPages;
  if (!Array.isArray(comments)) throw new TypeError('GitHub returned an invalid issue comment list');
  return {
    channel: {
      repository,
      issueNumber,
      title: issue.title,
      url: issue.html_url,
      updatedAt: issue.updated_at,
      refreshIntervalMs: 60000
    },
    messages: [issueMessage(issue), ...comments.map(commentMessage)]
  };
}

export async function sendDeveloperChannelMessage(message) {
  if (typeof message !== 'string' || !message.trim()) {
    throw new TypeError('Message must be nonblank text');
  }
  if (message.length > 5000) throw new RangeError('Message must be 5000 characters or fewer');
  const comment = await githubApi([
    issueEndpoint + '/comments',
    '-X', 'POST',
    '-f', 'body=' + message
  ]);
  return { channel: { repository, issueNumber }, message: commentMessage(comment) };
}

export async function DeveloperChannel(args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new TypeError('DeveloperChannel requires one JSON object');
  }
  const keys = Object.keys(args);
  if (args.action === 'read' && keys.length === 1) return readDeveloperChannel();
  if (args.action === 'send' && keys.length === 2 && Object.hasOwn(args, 'message')) {
    return sendDeveloperChannelMessage(args.message);
  }
  throw new TypeError('Expected {"action":"read"} or {"action":"send","message":"..."}');
}
