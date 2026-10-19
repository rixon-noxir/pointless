import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '@/lib/store';
import { parseCapture, detectIntent, type Intent } from '@/lib/parse';
import { orderedTypes } from '@/lib/adapt';
import type { ItemType } from '@/lib/types';
import { whenLabel } from '@/lib/time';
import { Chip, TypeIcon } from './TypeBits';
import { TYPE_META } from '@/lib/typeMeta';
import { askForNotifications } from '@/lib/notify';

/** Shown one letter at a time to new people, so the trick is obvious without a tutorial. */
const DEMOS = [
  'pay rent friday 3pm',
  'buy milk',
  'an idea I do not want to lose',
  'remind me to call mom tomorrow 9am',
  'that article someone sent me https://…',
];

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function useTypewriter(on: boolean): string {
  const [text, setText] = useState(() => (reducedMotion() ? DEMOS[0] : ''));
  useEffect(() => {
    if (!on || reducedMotion()) return;
    let demo = 0;
    let pos = 0;
    let timer = 0;
    const step = () => {
      const full = DEMOS[demo];
      if (pos <= full.length) {
        setText(full.slice(0, pos));
        pos += 1;
        timer = window.setTimeout(step, 45);
      } else {
        timer = window.setTimeout(() => {
          demo = (demo + 1) % DEMOS.length;
          pos = 0;
          step();
        }, 1800);
      }
    };
    step();
    return () => window.clearTimeout(timer);
  }, [on]);
  return text;
}

interface Props {
  autoFocus?: boolean;
  /** Pre-filled text, e.g. from the phone share sheet. */
  initial?: string;
  onSaved?: () => void;
}

/**
 * The one box. Type anything; the app guesses whether it is a task, note, link or reminder.
 * No decision has to be made before writing. The guess can be changed with a tap.
 */
export default function Capture({ autoFocus = false, initial, onSaved }: Props) {
  const [text, setText] = useState(initial ?? '');
  const [override, setOverride] = useState<ItemType | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const addItem = useStore((s) => s.addItem);
  const usage = useStore((s) => s.usage);
  const count = useStore((s) => s.items.length);
  const navigate = useNavigate();

  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);
  const intent = useMemo(() => (override ? null : detectIntent(text)), [text, override]);
  const type: ItemType = override ?? parsed?.type ?? 'note';
  const types = useMemo(() => orderedTypes(usage), [usage]);
  const demo = useTypewriter(count < 3 && !text);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  // Shared-in text arrives as initial state (the parent remounts us with a new key); just size the box.
  useEffect(() => {
    if (initial) requestAnimationFrame(grow);
  }, [initial]);

  const INTENT_UI: Record<Intent, { label: string; to: string }> = {
    plan: { label: /tomorrow/i.test(text) ? 'Plan tomorrow' : /week/i.test(text) ? 'Plan my week' : 'Plan my day', to: /tomorrow/i.test(text) ? '/plan?d=tomorrow' : '/plan' },
    pick: { label: 'Pick one for me', to: '/now' },
    think: { label: 'Open Space to think it out', to: '/space' },
  };

  const goIntent = () => {
    if (!intent) return;
    const target = INTENT_UI[intent].to;
    setText('');
    requestAnimationFrame(grow);
    navigate(target);
  };

  const submit = () => {
    if (intent) {
      goIntent();
      return;
    }
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
        {parsed && intent ? (
          <>
            <button
              type="button"
              onClick={goIntent}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-ink text-paper text-[13px] font-medium"
            >
              {INTENT_UI[intent].label} <ArrowRight size={13} />
            </button>
            <button type="button" onClick={() => setOverride(parsed.type)} className="h-8 px-3 rounded-full text-[13px] text-ink-2 hover:text-ink">
              or save it as a {TYPE_META[parsed.type].label.toLowerCase()}
            </button>
          </>
        ) : parsed ? (
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
            {justSaved ?? (count < 3 ? (
              <>
                Try: <span className="text-ink-2">"{demo}"</span>
              </>
            ) : 'A task, a thought, a link, or "remind me friday 3pm". It sorts itself.')}
          </span>
        )}
      </div>
    </div>
  );
}
