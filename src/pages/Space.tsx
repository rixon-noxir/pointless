import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronRight, FolderOpen } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Item } from '@/lib/types';
import { ageLabel } from '@/lib/time';
import Sketch from '@/components/Sketch';
import { Chip, SectionTitle } from '@/components/TypeBits';

const UNSORTED = 'Unsorted';

/**
 * Notes. Tap new, write, leave. No title box, no save button, no folder picker.
 * Each note files itself into a folder from what it says; move one and the sorter learns.
 */
export default function Space() {
  const navigate = useNavigate();
  const items = useStore((s) => s.items);
  const folders = useStore((s) => s.folders);
  const addItem = useStore((s) => s.addItem);
  const migrateScratch = useStore((s) => s.migrateScratch);
  const scratchMigrated = useStore((s) => s.scratchMigrated);
  const [filter, setFilter] = useState<string | null>(null);
  const [showSketch, setShowSketch] = useState(false);

  useEffect(() => {
    if (!scratchMigrated) migrateScratch();
  }, [scratchMigrated, migrateScratch]);

  const notes = useMemo(
    () => items.filter((i) => i.type === 'note' && !i.tucked).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  );
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of notes) c.set(n.folder ?? UNSORTED, (c.get(n.folder ?? UNSORTED) ?? 0) + 1);
    return c;
  }, [notes]);

  const visible = filter ? notes.filter((n) => (n.folder ?? UNSORTED) === filter) : notes;
  const grouped = useMemo(() => {
    if (filter) return [[filter, visible] as [string, Item[]]];
    const order = [...folders, UNSORTED];
    const m = new Map<string, Item[]>();
    for (const n of visible) {
      const k = n.folder ?? UNSORTED;
      m.set(k, [...(m.get(k) ?? []), n]);
    }
    return order.filter((k) => m.has(k)).map((k) => [k, m.get(k)!] as [string, Item[]]);
  }, [visible, folders, filter]);

  const newNote = () => {
    const n = addItem({ type: 'note', title: '', body: '' });
    navigate(`/note/${n.id}`, { state: { fresh: true } });
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-medium tracking-tight">Notes</h1>
        <button type="button" onClick={newNote} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-ink text-paper text-[14px] font-medium">
          <Plus size={16} /> New note
        </button>
      </div>

      {notes.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          <Chip active={filter === null} onClick={() => setFilter(null)}>All</Chip>
          {[...folders, UNSORTED]
            .filter((f) => counts.has(f))
            .map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(filter === f ? null : f)}>
                {f} <span className="text-ink-3 text-[12px]">{counts.get(f)}</span>
              </Chip>
            ))}
        </div>
      )}

      {notes.length === 0 && (
        <div className="mt-8 text-[15px] text-ink-2 leading-relaxed max-w-md">
          <p>Write anything. No title, no saving, no folders to pick. Each note reads itself and lands in Work, School, Home, Health, Money, People or Ideas. Move one and it learns.</p>
          <button type="button" onClick={newNote} className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-line text-[14px] hover:border-ink-3">
            <Plus size={15} /> Start one
          </button>
        </div>
      )}

      {grouped.map(([folder, list]) => (
        <section key={folder}>
          <SectionTitle aside={`${list.length}`}>
            <span className="inline-flex items-center gap-1.5"><FolderOpen size={13} /> {folder}</span>
          </SectionTitle>
          {list.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => navigate(`/note/${n.id}`)}
              className="w-full text-left py-2.5 -mx-2 px-2 rounded-xl hover:bg-paper-2/70 transition-colors"
            >
              <div className="text-[15px] leading-snug truncate">{n.autoTitle || n.title || 'Untitled'}</div>
              <div className="text-[12px] text-ink-3 truncate">
                {ageLabel(n.updatedAt)}
                {n.body && <span> · {n.body.split('\n').find((l) => l.trim()) ?? ''}</span>}
              </div>
            </button>
          ))}
        </section>
      ))}

      <section className="mt-10">
        <button type="button" onClick={() => setShowSketch((v) => !v)} aria-expanded={showSketch} className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          <ChevronRight size={14} className={`transition-transform ${showSketch ? 'rotate-90' : ''}`} />
          Sketch
        </button>
        <div className="expand mt-2" data-open={showSketch}>
          <div>
            <Sketch height={320} />
          </div>
        </div>
      </section>
    </div>
  );
}
