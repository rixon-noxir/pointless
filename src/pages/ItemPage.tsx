import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowUpRight, Pin, PinOff, Trash2, Square, CheckSquare2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { ItemType } from '@/lib/types';
import { fromLocalInput, toLocalInput, whenLabel, ageLabel } from '@/lib/time';
import { Chip, TypeIcon } from '@/components/TypeBits';
import { TYPE_META } from '@/lib/typeMeta';
import { askForNotifications } from '@/lib/notify';

const TYPES: ItemType[] = ['task', 'note', 'link', 'reminder'];
const REPEATS = [
  { label: 'never', days: 0 },
  { label: 'daily', days: 1 },
  { label: 'weekly', days: 7 },
  { label: 'every 2 weeks', days: 14 },
  { label: 'monthly', days: 30 },
];

export default function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = useStore((s) => s.items.find((i) => i.id === id));
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const togglePin = useStore((s) => s.togglePin);
  const toggleDone = useStore((s) => s.toggleDone);
  const setRepeat = useStore((s) => s.setRepeat);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  }, [item?.body]);

  if (!item) {
    return (
      <div className="fade-in">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="mt-8 text-ink-2">That one is gone.</p>
      </div>
    );
  }

  const checkable = item.type === 'task' || item.type === 'reminder';
  const showDue = item.type === 'task' || item.type === 'reminder';

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => togglePin(item.id)}
            aria-label={item.pinned ? 'Unpin' : 'Pin'}
            title={item.pinned ? 'Unpin' : 'Pin to Today'}
            className={`p-2 rounded-full hover:bg-paper-2 ${item.pinned ? 'text-accent-ink' : 'text-ink-2'}`}
          >
            {item.pinned ? <PinOff size={18} strokeWidth={1.75} /> : <Pin size={18} strokeWidth={1.75} />}
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                deleteItem(item.id);
                navigate(-1);
              }}
              className="h-9 px-3 rounded-full bg-ink text-paper text-[13px] font-medium"
            >
              Delete for real
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Delete" className="p-2 rounded-full text-ink-2 hover:bg-paper-2">
              <Trash2 size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3">
        {checkable && (
          <button type="button" onClick={() => toggleDone(item.id)} aria-label={item.done ? 'Mark not done' : 'Mark done'} className="mt-2 text-ink-2 hover:text-ink">
            {item.done ? <CheckSquare2 size={22} strokeWidth={1.75} /> : <Square size={22} strokeWidth={1.75} />}
          </button>
        )}
        <input
          value={item.title}
          onChange={(e) => updateItem(item.id, { title: e.target.value })}
          aria-label="Title"
          className={`flex-1 min-w-0 bg-transparent text-[24px] font-medium tracking-tight outline-none ${item.done ? 'line-through text-ink-3' : ''}`}
        />
      </div>

      <div className="flex gap-2 flex-wrap mt-4">
        {TYPES.map((t) => (
          <Chip key={t} active={item.type === t} onClick={() => updateItem(item.id, { type: t })}>
            <TypeIcon type={t} size={14} />
            {TYPE_META[t].label}
          </Chip>
        ))}
      </div>

      {item.type === 'link' && (
        <div className="mt-5 flex items-center gap-2">
          <input
            value={item.url ?? ''}
            onChange={(e) => updateItem(item.id, { url: e.target.value })}
            placeholder="https://"
            aria-label="URL"
            className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[15px]"
          />
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-11 px-4 rounded-xl bg-ink text-paper text-[14px] font-medium">
              Open <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      )}

      {showDue && (
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <label className="text-[13px] text-ink-2">When</label>
          <input
            type="datetime-local"
            value={toLocalInput(item.due)}
            onChange={(e) => {
              const due = fromLocalInput(e.target.value);
              updateItem(item.id, { due });
              if (due) askForNotifications();
            }}
            aria-label="Due"
            className="h-10 px-3 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[14px]"
          />
          {item.due && (
            <>
              <span className="text-[13px] text-ink-3">{whenLabel(item.due)}</span>
              <button type="button" onClick={() => updateItem(item.id, { due: undefined })} className="text-[13px] text-ink-3 hover:text-ink">
                clear
              </button>
            </>
          )}
        </div>
      )}

      {showDue && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <label className="text-[13px] text-ink-2">Comes back</label>
          {REPEATS.map((r) => (
            <Chip key={r.label} active={(item.repeatDays ?? 0) === r.days} onClick={() => setRepeat(item.id, r.days || undefined)}>
              {r.label}
            </Chip>
          ))}
          {item.repeatDays ? <span className="text-[12px] text-ink-3">counted from when you finish it</span> : null}
        </div>
      )}

      <textarea
        ref={bodyRef}
        value={item.body}
        onChange={(e) => updateItem(item.id, { body: e.target.value })}
        placeholder={item.type === 'link' ? 'Why you saved it' : 'More, if you want'}
        aria-label="Details"
        className="w-full mt-6 bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-ink-3"
      />

      <div className="mt-6">
        <input
          value={item.tags.join(', ')}
          onChange={(e) =>
            updateItem(item.id, {
              tags: e.target.value
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean),
            })
          }
          placeholder="tags, separated by commas"
          aria-label="Tags"
          className="w-full bg-transparent text-[13px] text-ink-2 outline-none placeholder:text-ink-3"
        />
      </div>

      <p className="mt-10 text-[12px] text-ink-3">
        Added {ageLabel(item.createdAt)} ago · opened {item.openCount} {item.openCount === 1 ? 'time' : 'times'}
      </p>
    </div>
  );
}
