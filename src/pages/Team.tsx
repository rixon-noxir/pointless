import { useEffect, useState } from 'react';
import { Check, RotateCcw, Send } from 'lucide-react';
import { Chip, SectionTitle } from '@/components/TypeBits';

/**
 * Team: Colton's notes on what to change in the app, filed as issues in the app's repo.
 * Pre-release only. To drop it: delete this page, api/team.ts, its route in App.tsx and its entry in Shell.tsx.
 */

type Kind = 'idea' | 'bug' | 'change';
interface Note {
  number: number;
  title: string;
  text: string;
  kind: Kind;
  done: boolean;
  createdAt: string;
  closedAt: string | null;
  url: string;
}

const KINDS: { v: Kind; label: string }[] = [
  { v: 'idea', label: 'Idea' },
  { v: 'change', label: 'Change' },
  { v: 'bug', label: 'Something broke' },
];

async function call(method: 'GET' | 'POST' | 'PATCH', body?: unknown) {
  const res = await fetch('/api/team', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; notes?: Note[]; note?: Note };
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function when(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Team() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('idea');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let live = true;
    call('GET')
      .then((d) => live && setNotes(d.notes ?? []))
      .catch((e: unknown) => live && setErr((e as Error).message));
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const d = await call('POST', { text, kind });
      if (d.note) setNotes((n) => [d.note!, ...(n ?? [])]);
      setText('');
      setErr(null);
    } catch (e2) {
      setErr((e2 as Error).message);
    }
    setBusy(false);
  };

  const toggle = async (n: Note) => {
    setNotes((all) => all?.map((x) => (x.number === n.number ? { ...x, done: !n.done } : x)) ?? null);
    try {
      await call('PATCH', { number: n.number, done: !n.done });
    } catch (e) {
      setNotes((all) => all?.map((x) => (x.number === n.number ? n : x)) ?? null);
      setErr((e as Error).message);
    }
  };

  const open = notes?.filter((n) => !n.done) ?? [];
  const done = notes?.filter((n) => n.done) ?? [];

  return (
    <div className="fade-in">
      <h1 className="text-[32px] leading-none font-medium tracking-tight">Team</h1>
      <p className="mt-2 text-[15px] text-ink-2">Colton's notes on what should change.</p>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-line bg-paper-2/40 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(e);
          }}
          rows={4}
          placeholder="What should change?"
          aria-label="Note"
          className="w-full resize-y bg-transparent outline-none text-[16px] leading-relaxed px-1"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <Chip key={k.v} active={kind === k.v} onClick={() => setKind(k.v)}>
              {k.label}
            </Chip>
          ))}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="ml-auto inline-flex items-center gap-2 h-9 px-4 rounded-full bg-ink text-paper text-[14px] font-medium disabled:opacity-40"
          >
            <Send size={14} /> Send
          </button>
        </div>
      </form>
      {err && <p className="mt-3 text-[13px] text-ink-2 fade-in">{err}</p>}

      <SectionTitle aside={notes ? `${open.length}` : undefined}>To do</SectionTitle>
      {notes === null ? (
        <div className="h-14 w-full bg-paper-2 rounded-2xl animate-pulse" />
      ) : open.length === 0 ? (
        <p className="text-[14px] text-ink-3">Nothing waiting.</p>
      ) : (
        <ul className="space-y-1">
          {open.map((n) => (
            <NoteRow key={n.number} n={n} onToggle={() => void toggle(n)} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <SectionTitle aside={<button type="button" onClick={() => setShowDone((v) => !v)} className="hover:text-ink">{showDone ? 'hide' : `show ${done.length}`}</button>}>
            Done
          </SectionTitle>
          {showDone && (
            <ul className="space-y-1">
              {done.map((n) => (
                <NoteRow key={n.number} n={n} onToggle={() => void toggle(n)} />
              ))}
            </ul>
          )}
        </>
      )}

    </div>
  );
}

function NoteRow({ n, onToggle }: { n: Note; onToggle: () => void }) {
  return (
    <li className="flex gap-3 items-start py-2.5 px-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={n.done ? 'Reopen' : 'Mark done'}
        className={`mt-0.5 shrink-0 grid place-items-center size-6 rounded-full border transition-colors ${
          n.done ? 'bg-accent-soft border-transparent text-ink' : 'border-line text-transparent hover:border-ink-3 hover:text-ink-3'
        }`}
      >
        {n.done ? <RotateCcw size={12} /> : <Check size={13} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] leading-snug whitespace-pre-wrap break-words ${n.done ? 'text-ink-3 line-through decoration-ink-3/50' : ''}`}>{n.text || n.title}</p>
        <p className="mt-1 text-[12px] text-ink-3">
          {KINDS.find((k) => k.v === n.kind)?.label}
          {' · '}{when(n.createdAt)} ·{' '}
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            #{n.number} ↗
          </a>
        </p>
      </div>
    </li>
  );
}
