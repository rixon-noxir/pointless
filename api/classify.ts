import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

/**
 * Files a note into a folder and gives it a short title.
 * Opt-in from the app ("Smart sorting"). Only the note text and folder names are sent; nothing is stored here.
 * Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
 */

const Out = z.object({
  folder: z.string().describe('One of the given folders, or a new 1-2 word folder name only if nothing fits.'),
  title: z.string().describe('A 2-6 word title for the note, in the writer\'s own words.'),
});

const SYSTEM = `You file short personal notes for someone with ADHD who never titles or organizes anything.
Pick the folder that fits the note best from the list given. Prefer an existing folder; make up a new one (one or two plain words, like "Travel" or "Car") only when nothing listed fits at all.
Then write a short title the person would recognize in a list. Use their words. No quotes, no trailing period.`;

// Per-instance throttle: cheap protection against someone hammering the endpoint.
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'Smart sorting is not set up on this server.' });

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!allowed(ip)) return send(res, 429, { error: 'Slow down.' });

  let text = '';
  let folders: string[] = [];
  try {
    const parsed = JSON.parse(await readBody(req)) as { text?: unknown; folders?: unknown };
    text = typeof parsed.text === 'string' ? parsed.text.trim().slice(0, 4000) : '';
    folders = Array.isArray(parsed.folders) ? parsed.folders.filter((f): f is string => typeof f === 'string').slice(0, 30) : [];
  } catch {
    return send(res, 400, { error: 'Bad request.' });
  }
  if (!text) return send(res, 400, { error: 'Nothing to sort.' });

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 256,
      output_config: { effort: 'low', format: zodOutputFormat(Out) },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Folders: ${folders.join(', ') || '(none yet)'}\n\nNote:\n${text}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) return send(res, 204, null);
    const out = response.parsed_output;
    return send(res, 200, { folder: out.folder.trim().slice(0, 24), title: out.title.trim().slice(0, 60) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Busy, try again in a minute.' });
    if (err instanceof Anthropic.AuthenticationError) return send(res, 503, { error: 'Smart sorting is not set up on this server.' });
    if (err instanceof Anthropic.APIConnectionError) return send(res, 502, { error: 'Could not reach the sorter.' });
    return send(res, 500, { error: 'Sorting failed.' });
  }
}
