import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ArrowUpRight, Check, Shuffle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { pickOne } from '@/lib/adapt';
import type { Item } from '@/lib/types';
import { whenLabel } from '@/lib/time';

const MINUTES = 5;

/**
 * One thing. The app chose it, so there is nothing to decide.
 * A five-minute timer starts on its own because starting is the hard part.
 */
export default function Now() {
  const items = useStore((s) => s.items);
  const [skip, setSkip] = useState<string[]>([]);
  const item = useMemo(() => pickOne(items, skip), [items, skip]);

  if (!item) {
    return (
      <div className="fade-in">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="mt-10 text-[28px] font-medium tracking-tight">Nothing to pick from.</h1>
        <p className="mt-3 text-[15px] text-ink-2">
          {skip.length > 0 ? 'You passed on everything that was open. That is allowed.' : 'No open tasks or reminders right now. Enjoy it.'}
        </p>
      </div>
    );
  }

  // Keyed on the item so the timer and state start fresh for each pick.
  return <Focus key={item.id} item={item} onSkip={() => setSkip((s) => [...s, item.id])} />;
}

function Focus({ item, onSkip }: { item: Item; onSkip: () => void }) {
  const toggleDone = useStore((s) => s.toggleDone);
  const touch = useStore((s) => s.touch);
  const navigate = useNavigate();
  const [left, setLeft] = useState(MINUTES * 60);

  useEffect(() => {
    touch(item.id);
    const started = Date.now();
    const t = window.setInterval(() => {
      const gone = Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, MINUTES * 60 - gone));
    }, 500);
    return () => window.clearInterval(t);
  }, [item.id, touch]);

  const finished = left === 0;
  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="fade-in min-h-[70dvh] flex flex-col">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Back
        </Link>
        <span className="text-[12px] uppercase tracking-wider text-ink-3">Just this one</span>
      </div>

      <div className="flex-1 flex flex-col justify-center py-10">
        <div className="font-serif italic text-[20px] text-ink-2">Right now,</div>
        <h1 className="mt-2 text-[34px] sm:text-[40px] leading-tight font-medium tracking-tight">{item.title}</h1>
        {item.body && <p className="mt-4 text-[16px] text-ink-2 leading-relaxed whitespace-pre-wrap">{item.body}</p>}
        {item.due && <p className="mt-3 text-[13px] text-ink-3">{whenLabel(item.due)}</p>}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-[15px] underline underline-offset-4 decoration-dashed">
            Open <ArrowUpRight size={15} />
          </a>
        )}

        <div className="mt-10 flex items-baseline gap-3 flex-wrap">
          <span className="text-[48px] font-medium tabular-nums tracking-tight">
            {mm}:{ss}
          </span>
          <span className="text-[13px] text-ink-3">
            {finished ? 'Five minutes is up. Keep going or stop. Both are fine.' : 'five minutes, then you can stop'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-6">
        <button
          type="button"
          onClick={() => {
            toggleDone(item.id);
            navigate('/');
          }}
          className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-ink text-paper text-[15px] font-medium"
        >
          <Check size={17} /> Done
        </button>
        <button type="button" onClick={onSkip} className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-line text-[15px] hover:border-ink-3">
          <Shuffle size={16} /> Not this one
        </button>
      </div>
    </div>
  );
}
