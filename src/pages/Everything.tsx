import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { matches, orderedTypes, TUCK_AFTER_DAYS } from '@/lib/adapt';
import type { ItemType } from '@/lib/types';
import ItemRow from '@/components/ItemRow';
import { Chip, SectionTitle, TypeIcon } from '@/components/TypeBits';
import { TYPE_META } from '@/lib/typeMeta';

export default function Everything() {
  const items = useStore((s) => s.items);
  const usage = useStore((s) => s.usage);
  const untuck = useStore((s) => s.untuck);
  const clearDone = useStore((s) => s.clearDone);
  const [q, setQ] = useState('');
  const [type, setType] = useState<ItemType | null>(null);
  const [showTucked, setShowTucked] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const types = useMemo(() => orderedTypes(usage), [usage]);
  const filtered = useMemo(
    () => items.filter((i) => (!type || i.type === type) && matches(i, q)),
    [items, type, q],
  );
  const searching = q.trim().length > 0;
  const pinned = filtered.filter((i) => i.pinned && !i.tucked);
  const open = filtered.filter((i) => !i.pinned && !i.done && !i.tucked).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const done = filtered.filter((i) => !i.pinned && i.done && !i.tucked);
  const tucked = filtered.filter((i) => i.tucked);
  const tuckedVisible = showTucked || searching;
  const counts = useMemo(() => {
    const c: Record<ItemType, number> = { task: 0, note: 0, link: 0, reminder: 0 };
    for (const i of items) if (!i.tucked) c[i.type]++;
    return c;
  }, [items]);

  return (
    <div className="fade-in">
      <div className="relative mb-4">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find anything"
          aria-label="Search"
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[16px] placeholder:text-ink-3"
        />
        {q && (
          <button type="button" aria-label="Clear" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-2">
        <Chip active={type === null} onClick={() => setType(null)}>All</Chip>
        {types.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
            <TypeIcon type={t} size={14} />
            {TYPE_META[t].plural}
            {counts[t] > 0 && <span className="text-ink-3 text-[12px]">{counts[t]}</span>}
          </Chip>
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-2 leading-relaxed max-w-md">Nothing here yet. Everything you drop on Today ends up here, searchable.</p>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-2">Nothing matches that.</p>
      )}

      {pinned.length > 0 && (
        <section>
          <SectionTitle>Pinned</SectionTitle>
          {pinned.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {open.length > 0 && (
        <section>
          <SectionTitle aside={`${open.length}`}>{type ? TYPE_META[type].plural : 'Everything'}</SectionTitle>
          {open.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {done.length > 0 && (
        <section>
          <SectionTitle
            aside={
              <button type="button" onClick={clearDone} className="hover:text-ink">
                clear done
              </button>
            }
          >
            Done
          </SectionTitle>
          {done.map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      {tucked.length > 0 && (
        <section className="mt-10">
          <button
            type="button"
            onClick={() => setShowTucked((v) => !v)}
            className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
            aria-expanded={tuckedVisible}
          >
            <ChevronRight size={14} className={`transition-transform ${tuckedVisible ? 'rotate-90' : ''}`} />
            Tucked away · {tucked.length}
          </button>
          {tuckedVisible && (
            <div className="mt-2 fade-in">
              <p className="text-[12px] text-ink-3 mb-2">
                Things untouched for {TUCK_AFTER_DAYS} days rest here so the list above stays light. Nothing is deleted. Open one to bring it back.
              </p>
              {tucked.map((i) => (
                <div key={i.id} className="flex items-center gap-2 opacity-70 hover:opacity-100">
                  <div className="flex-1 min-w-0"><ItemRow item={i} /></div>
                  <button type="button" onClick={() => untuck(i.id)} className="text-[12px] text-ink-3 hover:text-ink shrink-0">bring back</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
