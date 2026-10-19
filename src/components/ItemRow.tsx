import { useNavigate } from 'react-router';
import { Square, CheckSquare2, ArrowUpRight, Pin } from 'lucide-react';
import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { ageLabel, whenLabel, isOverdue } from '@/lib/time';
import { TypeIcon } from './TypeBits';

function host(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ItemRow({ item }: { item: Item }) {
  const navigate = useNavigate();
  const toggleDone = useStore((s) => s.toggleDone);
  const touch = useStore((s) => s.touch);
  const checkable = item.type === 'task' || item.type === 'reminder';
  const overdue = !!item.due && !item.done && isOverdue(item.due);

  const open = () => {
    touch(item.id);
    navigate(`/item/${item.id}`);
  };

  const meta: string[] = [];
  if (item.due && !item.done) meta.push(whenLabel(item.due));
  else if (item.type === 'link') meta.push(host(item.url));
  else meta.push(ageLabel(item.updatedAt));

  return (
    <div
      className={`group flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-xl hover:bg-paper-2/70 transition-colors ${
        item.done ? 'opacity-50' : ''
      }`}
    >
      {checkable ? (
        <button
          type="button"
          aria-label={item.done ? 'Mark not done' : 'Mark done'}
          onClick={() => toggleDone(item.id)}
          className="mt-0.5 text-ink-2 hover:text-ink"
        >
          {item.done ? <CheckSquare2 size={18} strokeWidth={1.75} /> : <Square size={18} strokeWidth={1.75} />}
        </button>
      ) : (
        <span className="mt-0.5 text-ink-3">
          <TypeIcon type={item.type} size={18} />
        </span>
      )}

      <button type="button" onClick={open} className="flex-1 min-w-0 text-left">
        <div className={`text-[15px] leading-snug truncate ${item.done ? 'line-through' : ''}`}>
          {item.pinned && <Pin size={12} className="inline -mt-0.5 mr-1 text-accent-ink" />}
          {item.title}
        </div>
        <div className={`text-[12px] mt-0.5 truncate ${overdue ? 'text-accent-ink font-medium' : 'text-ink-3'}`}>
          {meta.join(' · ')}
          {item.body && item.type !== 'link' && <span className="text-ink-3 font-normal"> · {item.body.split('\n')[0]}</span>}
        </div>
      </button>

      {item.type === 'link' && item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => touch(item.id)}
          aria-label="Open link"
          className="mt-0.5 p-1 -m-1 text-ink-3 hover:text-ink"
        >
          <ArrowUpRight size={18} strokeWidth={1.75} />
        </a>
      )}
    </div>
  );
}
