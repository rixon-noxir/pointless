import type { ItemType } from '@/lib/types';
import { TYPE_META } from '@/lib/typeMeta';

export function TypeIcon({ type, size = 16 }: { type: ItemType; size?: number }) {
  const Icon = TYPE_META[type].icon;
  return <Icon size={size} strokeWidth={1.75} className="shrink-0" />;
}

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}

/** A small rounded toggle. Used for type pickers and filters everywhere, so there is one shape to learn. */
export function Chip({ active, onClick, children, title }: ChipProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] border transition-colors ${
        active
          ? 'bg-accent-soft border-transparent text-ink font-medium'
          : 'border-line text-ink-2 hover:text-ink hover:border-ink-3'
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, aside, first }: { children: React.ReactNode; aside?: React.ReactNode; first?: boolean }) {
  return (
    <div className={`rule flex items-baseline justify-between pb-2 mb-3 ${first ? '' : 'mt-8'}`}>
      <h2 className="text-[13px] font-medium uppercase tracking-wider text-ink-3">{children}</h2>
      {aside && <div className="text-[12px] text-ink-3">{aside}</div>}
    </div>
  );
}
