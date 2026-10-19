import { useMemo, useRef, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { parseCapture } from '@/lib/parse';
import { orderedTypes } from '@/lib/adapt';
import type { ItemType } from '@/lib/types';
import { whenLabel } from '@/lib/time';
import { Chip, TypeIcon } from './TypeBits';
import { TYPE_META } from '@/lib/typeMeta';
import { askForNotifications } from '@/lib/notify';

/**
 * The one box. Type anything; the app guesses whether it is a task, note, link or reminder.
 * No decision has to be made before writing. The guess can be changed with a tap.
 */
export default function Capture({ autoFocus = false, onSaved }: { autoFocus?: boolean; onSaved?: () => void }) {
  const [text, setText] = useState('');
  const [override, setOverride] = useState<ItemType | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const addItem = useStore((s) => s.addItem);
  const usage = useStore((s) => s.usage);

  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);
  const type: ItemType = override ?? parsed?.type ?? 'note';
  const types = useMemo(() => orderedTypes(usage), [usage]);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  const submit = () => {
    if (!parsed) return;
    addItem({ type, title: parsed.title, body: parsed.body, url: parsed.url, due: parsed.due });
    if (type === 'reminder' && parsed.due) askForNotifications();
    setJustSaved(`${TYPE_META[type].label} saved`);
    setText('');
    setOverride(null);
    requestAnimationFrame(grow);
    window.setTimeout(() => setJustSaved(null), 1600);
    onSaved?.();
  };

  return (
    <div className="rounded-2xl bg-paper-2/70 border border-line focus-within:border-ink-3 transition-colors">
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        value={text}
        rows={1}
        placeholder="What's on your mind?"
        aria-label="Drop something here"
        onChange={(e) => {
          setText(e.target.value);
          setOverride(null);
          grow();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="block w-full bg-transparent px-4 pt-4 pb-2 text-[17px] leading-relaxed placeholder:text-ink-3 outline-none min-h-[56px]"
      />

      <div className="flex items-center gap-2 px-3 pb-3 flex-wrap min-h-[44px]">
        {parsed ? (
          <>
            {types.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setOverride(t)} title={`Save as ${TYPE_META[t].label.toLowerCase()}`}>
                <TypeIcon type={t} size={14} />
                {TYPE_META[t].label}
              </Chip>
            ))}
            {parsed.due && (type === 'reminder' || type === 'task') && (
              <span className="text-[12px] text-ink-2 ml-1">{whenLabel(parsed.due)}</span>
            )}
            <button
              type="button"
              onClick={submit}
              className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-ink text-paper text-[13px] font-medium"
            >
              Save <CornerDownLeft size={13} />
            </button>
          </>
        ) : (
          <span className="text-[12px] text-ink-3 px-1 fade-in">
            {justSaved ?? 'A task, a thought, a link, or "remind me friday 3pm". It sorts itself.'}
          </span>
        )}
      </div>
    </div>
  );
}
