import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import Sketch from '@/components/Sketch';
import { SectionTitle } from '@/components/TypeBits';

/** Open space. One blank page to think on, and a surface to draw on. Nothing to file. */
export default function Space() {
  const text = useStore((s) => s.scratch.text);
  const setText = useStore((s) => s.setScratchText);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [big, setBig] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [text]);

  return (
    <div className="fade-in">
      <SectionTitle first aside={text ? `${text.trim().split(/\s+/).filter(Boolean).length} words` : undefined}>Think out loud</SectionTitle>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Anything. It stays here until you change it."
        aria-label="Scratch text"
        className="w-full bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink-3 min-h-40"
      />

      <SectionTitle
        aside={
          <button type="button" onClick={() => setBig((v) => !v)} className="inline-flex items-center gap-1 hover:text-ink">
            {big ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {big ? 'smaller' : 'bigger'}
          </button>
        }
      >
        Sketch
      </SectionTitle>
      <Sketch height={big ? 560 : 280} />
    </div>
  );
}
