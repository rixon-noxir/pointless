import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Square, CheckSquare2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Item } from '@/lib/types';
import { parseCapture } from '@/lib/parse';
import { dateKey, fromDateKey, addDays, hourLabel, isSameDay } from '@/lib/time';
import { TypeIcon } from '@/components/TypeBits';
import { askForNotifications } from '@/lib/notify';

const FIRST_HOUR = 6;
const LAST_HOUR = 23;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function resolveParam(p: string | null): string {
  const today = new Date();
  if (!p || p === 'today') return dateKey(today);
  if (p === 'tomorrow') return dateKey(addDays(today, 1));
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : dateKey(today);
}

/** Six weeks of dates covering the month, starting on Sunday. */
function monthGrid(first: Date): Date[] {
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * One day at a time. The date header opens into a month to jump around.
 * Tap an empty hour to add something there. Tap an unplaced task, then an hour, to give it a time.
 */
export default function Plan() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const items = useStore((s) => s.items);
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const toggleDone = useStore((s) => s.toggleDone);

  const [selected, setSelected] = useState(() => resolveParam(params.get('d')));
  const [dir, setDir] = useState<1 | -1>(1);
  const [monthOpen, setMonthOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = fromDateKey(resolveParam(params.get('d')));
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [addingHour, setAddingHour] = useState<number | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const day = useMemo(() => fromDateKey(selected), [selected]);
  const isToday = isSameDay(day, now);

  /** Items keyed by local date, for dots on the month and the day's list. */
  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) {
      if (!i.due || i.tucked) continue;
      const k = dateKey(new Date(i.due));
      const g = m.get(k) ?? [];
      g.push(i);
      m.set(k, g);
    }
    for (const g of m.values()) g.sort((a, b) => a.due!.localeCompare(b.due!));
    return m;
  }, [items]);

  const dayItems = byDay.get(selected) ?? [];
  const early = dayItems.filter((i) => new Date(i.due!).getHours() < FIRST_HOUR);
  const unplaced = useMemo(
    () => items.filter((i) => !i.due && !i.done && !i.tucked && (i.type === 'task' || i.type === 'reminder')).slice(0, 8),
    [items],
  );

  const go = (key: string) => {
    setDir(key > selected ? 1 : -1);
    setSelected(key);
    setAddingHour(null);
    const d = fromDateKey(key);
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const atHour = (h: number, minute = 0) => {
    const d = new Date(day);
    d.setHours(h, minute, 0, 0);
    return d;
  };

  const placeAt = (h: number) => {
    if (!placing) return;
    updateItem(placing, { due: atHour(h).toISOString() });
    setPlacing(null);
    askForNotifications();
  };

  const addAt = (h: number, text: string) => {
    const parsed = parseCapture(text);
    const title = parsed.title || text.trim();
    if (!title) return;
    addItem({ type: parsed.type === 'reminder' ? 'reminder' : 'task', title, body: parsed.body, due: atHour(h).toISOString() });
    setAddingHour(null);
    askForNotifications();
  };

  const grid = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const nextFreeHour = () => {
    const h = isToday ? Math.min(LAST_HOUR, Math.max(FIRST_HOUR, now.getHours() + 1)) : 9;
    return h;
  };

  return (
    <div className="fade-in">
      {/* Date header: tap to open the month */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonthOpen((v) => !v)}
          aria-expanded={monthOpen}
          className="group flex items-center gap-2 text-left"
        >
          <div>
            <div className="text-[12px] uppercase tracking-wider text-ink-3">{isToday ? 'Today' : dateKey(addDays(now, 1)) === selected ? 'Tomorrow' : ' '}</div>
            <h1 className="text-[26px] font-medium tracking-tight leading-tight">{dayFmt.format(day)}</h1>
          </div>
          <ChevronDown size={20} className={`mt-4 text-ink-3 group-hover:text-ink transition-transform duration-300 ${monthOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous day" onClick={() => go(dateKey(addDays(day, -1)))} className="p-2 rounded-full text-ink-2 hover:bg-paper-2">
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next day" onClick={() => go(dateKey(addDays(day, 1)))} className="p-2 rounded-full text-ink-2 hover:bg-paper-2">
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            aria-label="Add something"
            onClick={() => {
              setPlacing(null);
              setAddingHour(nextFreeHour());
            }}
            className="ml-1 w-9 h-9 rounded-full bg-ink text-paper inline-flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="expand" data-open={monthOpen}>
        <div>
          <div className="mt-4 rounded-2xl bg-paper-2/70 border border-line p-3">
            <div className="flex items-center justify-between px-1">
              <button type="button" aria-label="Previous month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="p-1.5 rounded-full text-ink-2 hover:bg-paper">
                <ChevronLeft size={16} />
              </button>
              <div className="text-[14px] font-medium">{monthFmt.format(viewMonth)}</div>
              <div className="flex items-center gap-1">
                {!isToday && (
                  <button type="button" onClick={() => go(dateKey(now))} className="text-[12px] px-2 h-7 rounded-full hover:bg-paper text-ink-2">
                    today
                  </button>
                )}
                <button type="button" aria-label="Next month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="p-1.5 rounded-full text-ink-2 hover:bg-paper">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-ink-3">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {grid.map((d) => {
                const k = dateKey(d);
                const inMonth = d.getMonth() === viewMonth.getMonth();
                const sel = k === selected;
                const tod = isSameDay(d, now);
                const dots = (byDay.get(k) ?? []).filter((i) => !i.done).length;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => go(k)}
                    className={`relative mx-auto w-9 h-9 rounded-full text-[13px] transition-colors ${
                      sel ? 'bg-ink text-paper font-medium' : tod ? 'border border-ink text-ink' : inMonth ? 'text-ink hover:bg-paper' : 'text-ink-3/60 hover:bg-paper'
                    }`}
                  >
                    {d.getDate()}
                    {dots > 0 && (
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 flex gap-0.5">
                        {Array.from({ length: Math.min(dots, 3) }).map((_, i) => (
                          <span key={i} className={`w-1 h-1 rounded-full ${sel ? 'bg-paper' : 'bg-accent'}`} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unplaced things */}
      {unplaced.length > 0 && (
        <div className="mt-5">
          <div className="text-[12px] uppercase tracking-wider text-ink-3 mb-2">
            {placing ? 'Now tap an hour below' : 'Not on the calendar yet · tap one, then an hour'}
          </div>
          <div className="flex gap-2 flex-wrap">
            {unplaced.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => {
                  setAddingHour(null);
                  setPlacing(placing === i.id ? null : i.id);
                }}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] border transition-all ${
                  placing === i.id ? 'bg-ink text-paper border-ink scale-105' : 'border-line text-ink-2 hover:text-ink hover:border-ink-3'
                }`}
              >
                <TypeIcon type={i.type} size={13} />
                <span className="max-w-[12rem] truncate">{i.title}</span>
                {placing === i.id && <X size={13} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The day */}
      <div key={selected} className={`mt-6 ${dir === 1 ? 'slide-in' : 'slide-in-back'}`}>
        {early.length > 0 && (
          <HourRow label="early" items={early} now={now} isToday={isToday} onToggle={toggleDone} onOpen={(id) => navigate(`/item/${id}`)} />
        )}
        {HOURS.map((h) => {
          const inHour = dayItems.filter((i) => new Date(i.due!).getHours() === h);
          const isNowHour = isToday && now.getHours() === h;
          return (
            <HourRow
              key={h}
              label={hourLabel(h)}
              items={inHour}
              now={now}
              isToday={isToday}
              nowLine={isNowHour ? now.getMinutes() / 60 : null}
              highlight={!!placing}
              adding={addingHour === h}
              onTap={() => {
                if (placing) placeAt(h);
                else setAddingHour(addingHour === h ? null : h);
              }}
              onAdd={(text) => addAt(h, text)}
              onCancel={() => setAddingHour(null)}
              onToggle={toggleDone}
              onOpen={(id) => navigate(`/item/${id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  items: Item[];
  now: Date;
  isToday: boolean;
  nowLine?: number | null;
  highlight?: boolean;
  adding?: boolean;
  onTap?: () => void;
  onAdd?: (text: string) => void;
  onCancel?: () => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

function HourRow({ label, items, now, isToday, nowLine = null, highlight, adding, onTap, onAdd, onCancel, onToggle, onOpen }: RowProps) {
  const past = isToday && nowLine === null && items.length === 0 && label !== 'early' && parseHour(label) < now.getHours();
  return (
    <div className="relative flex gap-3 min-h-[52px] border-t border-dashed border-line">
      <div className={`w-14 shrink-0 pt-2 text-[11px] uppercase tracking-wider ${past ? 'text-ink-3/60' : 'text-ink-3'}`}>{label}</div>
      <div className="flex-1 min-w-0 py-1.5">
        {items.map((i) => (
          <div key={i.id} className={`pop flex items-start gap-2.5 rounded-xl bg-paper-2/80 border border-line px-3 py-2 mb-1.5 ${i.done ? 'opacity-50' : ''}`}>
            {i.type === 'task' || i.type === 'reminder' ? (
              <button type="button" aria-label={i.done ? 'Mark not done' : 'Mark done'} onClick={() => onToggle(i.id)} className="mt-0.5 text-ink-2 hover:text-ink">
                {i.done ? <CheckSquare2 size={17} strokeWidth={1.75} /> : <Square size={17} strokeWidth={1.75} />}
              </button>
            ) : (
              <span className="mt-0.5 text-ink-3"><TypeIcon type={i.type} size={17} /></span>
            )}
            <button type="button" onClick={() => onOpen(i.id)} className="flex-1 min-w-0 text-left">
              <div className={`text-[14px] leading-snug truncate ${i.done ? 'line-through' : ''}`}>{i.title}</div>
              <div className="text-[11px] text-ink-3">{timeFmt.format(new Date(i.due!))}</div>
            </button>
          </div>
        ))}
        {adding ? (
          <QuickAdd label={label} onAdd={onAdd!} onCancel={onCancel!} />
        ) : (
          onTap && (
            <button
              type="button"
              onClick={onTap}
              aria-label={highlight ? `Put it at ${label}` : `Add at ${label}`}
              className={`w-full text-left h-8 rounded-lg text-[12px] transition-colors ${
                highlight ? 'bg-accent-soft text-ink-2 hover:text-ink' : 'text-transparent hover:text-ink-3 hover:bg-paper-2/60'
              }`}
            >
              {highlight ? `put it here` : `+ add at ${label.toLowerCase()}`}
            </button>
          )
        )}
      </div>
      {nowLine !== null && (
        <div className="absolute left-12 right-0 flex items-center pointer-events-none" style={{ top: `${Math.round(nowLine * 100)}%` }}>
          <span className="w-2 h-2 rounded-full bg-accent-ink -ml-1" />
          <span className="flex-1 h-px bg-accent-ink/70" />
        </div>
      )}
    </div>
  );
}

function parseHour(label: string): number {
  const m = /^(\d+) (AM|PM)$/.exec(label);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (m[2] === 'PM') h += 12;
  return h;
}

function QuickAdd({ label, onAdd, onCancel }: { label: string; onAdd: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="pop flex items-center gap-2">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) onAdd(text);
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={`What, at ${label.toLowerCase()}?`}
        aria-label={`Add at ${label}`}
        className="flex-1 min-w-0 h-9 px-3 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[14px]"
      />
      <button type="button" onClick={() => text.trim() && onAdd(text)} className="h-9 px-3 rounded-full bg-ink text-paper text-[13px] font-medium">
        Add
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancel" className="p-2 text-ink-3 hover:text-ink">
        <X size={15} />
      </button>
    </div>
  );
}
