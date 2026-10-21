import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Team notes: Colton's suggestions for the app, filed as GitHub issues in the app's repo
 * so they land where the work happens. Pre-release only: open to anyone with the app, so drop it before launch.
 * Needs GITHUB_TOKEN (fine-grained, Issues read/write on the repo) in the Vercel project env.
 * GITHUB_REPO defaults to rixon-noxir/pointless.
 *
 * GET              list open + recently done notes
 * POST {text, kind}         file a new note
 * PATCH {number, done}      mark done / reopen
 */

const LABEL = 'team-note';
const KINDS = ['idea', 'bug', 'change'] as const;
type Kind = (typeof KINDS)[number];

interface GhIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  html_url: string;
  labels: { name: string }[];
  pull_request?: unknown;
}

const hits = new Map<string, { n: number; t: number }>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) {
    hits.set(ip, { n: 1, t: now });
    return true;
  }
  h.n += 1;
  return h.n <= 30;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c: Buffer) => {
      data += c.toString();
      if (data.length > 20_000) reject(new Error('too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function gh(path: string, init: RequestInit = {}): Promise<Response> {
  const repo = process.env.GITHUB_REPO || 'rixon-noxir/pointless';
  return fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'pointless-team-notes',
    },
  });
}

/** First line, trimmed to something that reads well in an issue list. */
function titleFrom(text: string): string {
  const first = text.split('\n').find((l) => l.trim())?.trim() ?? 'Note';
  return first.length > 72 ? `${first.slice(0, 70).trimEnd()}…` : first;
}

function toNote(i: GhIssue) {
  const kind = (i.labels.map((l) => l.name).find((n) => (KINDS as readonly string[]).includes(n)) ?? 'idea') as Kind;
  const text = (i.body ?? '').trim();
  return {
    number: i.number,
    title: i.title,
    text,
    kind,
    done: i.state === 'closed',
    createdAt: i.created_at,
    closedAt: i.closed_at,
    url: i.html_url,
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!process.env.GITHUB_TOKEN) return send(res, 503, { error: 'Team notes are not set up on this server.' });

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!allowed(ip)) return send(res, 429, { error: 'Slow down.' });

  try {
    if (req.method === 'GET') {
      const r = await gh(`/issues?labels=${LABEL}&state=all&per_page=100&sort=created&direction=desc`);
      if (!r.ok) return send(res, 502, { error: 'Could not reach GitHub.' });
      const issues = ((await r.json()) as GhIssue[]).filter((i) => !i.pull_request);
      return send(res, 200, { notes: issues.map(toNote) });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(await readBody(req)) as Record<string, unknown>;
    } catch {
      return send(res, 400, { error: 'Bad request.' });
    }

    if (req.method === 'POST') {
      const text = typeof parsed.text === 'string' ? parsed.text.trim().slice(0, 8000) : '';
      if (!text) return send(res, 400, { error: 'Write something first.' });
      const kind: Kind = (KINDS as readonly unknown[]).includes(parsed.kind) ? (parsed.kind as Kind) : 'idea';
      const r = await gh('/issues', {
        method: 'POST',
        body: JSON.stringify({
          title: titleFrom(text),
          body: text,
          labels: [LABEL, kind],
        }),
      });
      if (!r.ok) return send(res, 502, { error: 'Could not save to GitHub.' });
      return send(res, 201, { note: toNote((await r.json()) as GhIssue) });
    }

    if (req.method === 'PATCH') {
      const number = typeof parsed.number === 'number' && Number.isInteger(parsed.number) ? parsed.number : 0;
      if (number <= 0) return send(res, 400, { error: 'Bad request.' });
      // Only team notes can be touched from here, never other issues in the repo.
      const cur = await gh(`/issues/${number}`);
      if (!cur.ok) return send(res, 404, { error: 'Not found.' });
      const issue = (await cur.json()) as GhIssue;
      if (!issue.labels.some((l) => l.name === LABEL)) return send(res, 404, { error: 'Not found.' });
      const r = await gh(`/issues/${number}`, {
        method: 'PATCH',
        body: JSON.stringify(parsed.done ? { state: 'closed', state_reason: 'completed' } : { state: 'open' }),
      });
      if (!r.ok) return send(res, 502, { error: 'Could not update GitHub.' });
      return send(res, 200, { note: toNote((await r.json()) as GhIssue) });
    }

    return send(res, 405, { error: 'Method not allowed.' });
  } catch {
    return send(res, 500, { error: 'Something went wrong.' });
  }
}
