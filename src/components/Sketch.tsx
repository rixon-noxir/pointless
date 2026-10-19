import { useEffect, useRef, useState } from 'react';
import { Undo2, Eraser } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Point, Stroke } from '@/lib/types';

/**
 * A plain drawing surface. Strokes are stored normalised to the canvas width so they
 * survive resizes and phone/desktop switches.
 */
export default function Sketch({ height = 280 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useStore((s) => s.scratch.strokes);
  const addStroke = useStore((s) => s.addStroke);
  const undoStroke = useStore((s) => s.undoStroke);
  const clearStrokes = useStore((s) => s.clearStrokes);
  const current = useRef<Point[] | null>(null);
  const [drawing, setDrawing] = useState(false);

  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1c1b1a';

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke, w: number) => {
    if (s.points.length === 0) return;
    ctx.beginPath();
    ctx.lineWidth = s.width;
    ctx.moveTo(s.points[0].x * w, s.points[0].y * w);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * w, s.points[i].y * w);
    if (s.points.length === 1) ctx.lineTo(s.points[0].x * w + 0.1, s.points[0].y * w);
    ctx.stroke();
  };

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = ink();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) drawStroke(ctx, s, w);
  };

  useEffect(() => {
    redraw();
    const c = canvasRef.current;
    if (!c) return;
    const ro = new ResizeObserver(redraw);
    ro.observe(c);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', redraw);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', redraw);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.width };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = [pointFrom(e)];
    setDrawing(true);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = current.current;
    if (!pts) return;
    const p = pointFrom(e);
    const last = pts[pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.002) return;
    pts.push(p);
    const c = e.currentTarget;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.clientWidth;
    ctx.strokeStyle = ink();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(last.x * w, last.y * w);
    ctx.lineTo(p.x * w, p.y * w);
    ctx.stroke();
  };

  const onUp = () => {
    const pts = current.current;
    current.current = null;
    setDrawing(false);
    if (pts && pts.length > 0) addStroke({ points: pts, width: 2 });
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => current.current && onUp()}
        style={{ height, touchAction: 'none' }}
        className={`w-full rounded-2xl bg-paper-2/70 border border-line ${drawing ? 'cursor-crosshair' : 'cursor-crosshair'}`}
        aria-label="Sketch area"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={undoStroke}
          disabled={strokes.length === 0}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] text-ink-2 hover:text-ink disabled:opacity-40"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          type="button"
          onClick={clearStrokes}
          disabled={strokes.length === 0}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] text-ink-2 hover:text-ink disabled:opacity-40"
        >
          <Eraser size={14} /> Clear
        </button>
        <span className="ml-auto text-[12px] text-ink-3">{strokes.length === 0 ? 'Draw with a finger, pen or mouse.' : ''}</span>
      </div>
    </div>
  );
}
