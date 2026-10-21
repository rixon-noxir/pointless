import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { del, get, list, put } from '@vercel/blob';

/**
 * Team notes: Colton's suggestions for the app, kept in the project's private Blob store.
 * Pre-release only: open to anyone with the app, so drop it before launch.
 * Needs BLOB_READ_WRITE_TOKEN (set by linking the pointless-team store to the project).
 *
 * Each note is one write-once blob at team/notes/<id>.json. "Done" is a separate marker at team/done/<id>,
 * so a note never gets overwritten and the list never reads a stale cached copy.
 *
 * GET                       list notes
 * POST {text, kind}         file a new note
 * PATCH {id, done}          mark done / reopen
 */

const KINDS = ['idea', 'bug', 'change'] as const;
type Kind = (typeof KINDS)[number];

interface Stored {
  id: string;
  text: string;
  kind: Kind;
  createdAt: string;
}

const NOTES = 'team/notes/';
const DONE = 'team/done/';

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

async function listAll(prefix: string) {
  const out: { pathname: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function readNote(pathname: string): Promise<Stored | null> {
  const r = await get(pathname, { access: 'private' });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text()) as Stored;
}

const validId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'Team notes are not set up on this server.' });

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!allowed(ip)) return send(res, 429, { error: 'Slow down.' });

  try {
    if (req.method === 'GET') {
      const [notes, done] = await Promise.all([listAll(NOTES), listAll(DONE)]);
      const closed = new Map(done.map((b) => [b.pathname.slice(DONE.length), b.uploadedAt.toISOString()]));
      const read = (await Promise.all(notes.map((b) => readNote(b.pathname)))).filter((n): n is Stored => !!n);
      read.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return send(res, 200, {
        notes: read.map((n) => ({ ...n, done: closed.has(n.id), closedAt: closed.get(n.id) ?? null })),
      });
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
      const note: Stored = { id: randomUUID(), text, kind, createdAt: new Date().toISOString() };
      await put(`${NOTES}${note.id}.json`, JSON.stringify(note), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
      return send(res, 201, { note: { ...note, done: false, closedAt: null } });
    }

    if (req.method === 'PATCH') {
      if (!validId(parsed.id)) return send(res, 400, { error: 'Bad request.' });
      if (parsed.done) {
        await put(`${DONE}${parsed.id}`, '1', { access: 'private', addRandomSuffix: false, allowOverwrite: true });
      } else {
        await del(`${DONE}${parsed.id}`).catch(() => undefined);
      }
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed.' });
  } catch {
    return send(res, 500, { error: 'Something went wrong.' });
  }
}
