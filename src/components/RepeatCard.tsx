import { Repeat } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { RepeatSuggestion } from '@/lib/adapt';

/** "You have done this three times. Want it to come back on its own?" One tap either way. */
export default function RepeatCard({ s }: { s: RepeatSuggestion }) {
  const setRepeat = useStore((s) => s.setRepeat);
  const dismissRepeat = useStore((s) => s.dismissRepeat);
  const addItem = useStore((s) => s.addItem);
  const items = useStore((s) => s.items);

  const accept = () => {
    const example = items.find((i) => i.id === s.exampleId);
    const due = new Date();
    due.setDate(due.getDate() + s.days);
    due.setHours(9, 0, 0, 0);
    const fresh = addItem({ type: example?.type ?? 'task', title: s.title, body: example?.body, due: due.toISOString() });
    setRepeat(fresh.id, s.days);
    dismissRepeat(s.key);
  };

  const every = s.days === 1 ? 'every day' : s.days === 7 ? 'every week' : s.days === 14 ? 'every two weeks' : s.days === 30 ? 'about monthly' : `every ${s.days} days`;

  return (
    <div className="fade-in mt-6 rounded-2xl border border-dashed border-line px-4 py-3 flex items-start gap-3">
      <Repeat size={16} className="mt-1 text-ink-3 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] leading-snug">
          You keep finishing <span className="font-medium">{s.title}</span>. Want it to come back {every}, counted from when you finish it?
        </p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={accept} className="h-8 px-3 rounded-full bg-ink text-paper text-[13px] font-medium">
            Yes, bring it back
          </button>
          <button type="button" onClick={() => dismissRepeat(s.key)} className="h-8 px-3 rounded-full text-[13px] text-ink-2 hover:text-ink">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
