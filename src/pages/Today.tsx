import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Sparkles, CalendarDays, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { reachFor, routineHint, repeatSuggestion, pickableCount } from '@/lib/adapt';
import { isOverdue, isDueToday } from '@/lib/time';
import Capture from '@/components/Capture';
import ItemRow from '@/components/ItemRow';
import RepeatCard from '@/components/RepeatCard';
import { SectionTitle } from '@/components/TypeBits';

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? 'Still up' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  return name ? `${part}, ${name}.` : `${part}.`;
}

/** Text handed to us by the phone's share sheet (see share_target in the manifest). */
function sharedText(search: string): string | undefined {
  const p = new URLSearchParams(search);
  const parts = [p.get('title'), p.get('text'), p.get('url')].filter((x): x is string => !!x && x.trim().length > 0);
  if (parts.length === 0) return undefined;
  return Array.from(new Set(parts)).join(' ').trim();
}

export default function Today() {
  const items = useStore((s) => s.items);
  const name = useStore((s) => s.profile.name);
  const usage = useStore((s) => s.usage);
  const dismissed = useStore((s) => s.dismissedRepeats);
  const guideDismissed = useStore((s) => s.guideDismissed);
  const dismissGuide = useStore((s) => s.dismissGuide);
  const location = useLocation();
  const navigate = useNavigate();
  // Read once on arrival, then clean the URL so a refresh does not re-share it.
  const [initial] = useState(() => sharedText(location.search));
  useEffect(() => {
    if (initial && location.search) navigate('/', { replace: true });
  }, [initial, location.search, navigate]);

  const { due, pinned, reach, recent } = useMemo(() => {
    const now = new Date();
    const live = items.filter((i) => !i.tucked);
    const due = live
      .filter((i) => i.due && !i.done && (isOverdue(i.due, now) || isDueToday(i.due, now)))
      .sort((a, b) => a.due!.localeCompare(b.due!));
    const pinned = live.filter((i) => i.pinned && !i.done && !due.includes(i));
    const reach = reachFor(live, now).filter((i) => !due.includes(i) && !pinned.includes(i));
    const recent = live
      .filter((i) => !due.includes(i) && !pinned.includes(i) && !reach.includes(i))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
    return { due, pinned, reach, recent };
  }, [items]);
  const hint = routineHint(usage);
  const repeat = useMemo(() => repeatSuggestion(items, dismissed), [items, dismissed]);
  const pickable = pickableCount(items);

  return (
    <div className="fade-in">
      <h1 className="text-[28px] font-medium tracking-tight mb-5">{greeting(name)}</h1>

      <Capture key={initial ?? ''} autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768} initial={initial} />

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/plan"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-line text-[13px] text-ink-2 hover:text-ink hover:border-ink-3"
        >
          <CalendarDays size={14} /> Plan my day
        </Link>
        {pickable >= 2 && (
          <Link
            to="/now"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-line text-[13px] text-ink-2 hover:text-ink hover:border-ink-3"
          >
            <Sparkles size={14} /> Can't decide? Pick one for me
          </Link>
        )}
      </div>

      {repeat && <RepeatCard s={repeat} />}

      {!guideDismissed && items.length < 8 && (
        <div className="fade-in mt-6 rounded-2xl border border-dashed border-line px-4 py-4 text-[14px] leading-relaxed text-ink-2">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-ink">How this works</p>
            <button type="button" onClick={dismissGuide} aria-label="Close" className="p-1 -m-1 text-ink-3 hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <ul className="mt-2 space-y-1.5 list-disc pl-4">
            <li>
              <span className="text-ink">Drop anything in the box.</span> A to-do, a thought, a link, or "remind me friday 3pm". It works out which one it is and files it.
            </li>
            <li>
              <span className="text-ink">This page stays short.</span> Only what is due, pinned, or new shows here. The full list is under{' '}
              <Link to="/all" className="underline underline-offset-4 decoration-dashed">Everything</Link>, with search.
            </li>
            <li>
              <span className="text-ink">Space</span> is a blank page for thinking out loud and sketching.
            </li>
            <li>Nothing to set up. Things you stop touching tuck themselves away. Nothing is ever deleted for you.</li>
          </ul>
          <button type="button" onClick={dismissGuide} className="mt-3 h-8 px-3 rounded-full bg-ink text-paper text-[13px] font-medium">
            Got it
          </button>
        </div>
      )}

      {due.length > 0 && (
        <section>
          <SectionTitle>Due</SectionTitle>
          {due.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {pinned.length > 0 && (
        <section>
          <SectionTitle>Pinned</SectionTitle>
          {pinned.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {reach.length > 0 && (
        <section>
          <SectionTitle aside="things you keep opening">Reach for</SectionTitle>
          {reach.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <SectionTitle aside={<Link to="/all" className="hover:text-ink">everything ↗</Link>}>Recent</SectionTitle>
          {recent.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {hint && <p className="mt-10 font-serif italic text-[15px] text-ink-3">{hint}</p>}
    </div>
  );
}
