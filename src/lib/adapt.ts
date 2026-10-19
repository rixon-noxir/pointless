import type { Item, ItemType, Usage } from './types';
import { daysSince } from './time';

/** Days an item can sit untouched before it is tucked away. */
export const TUCK_AFTER_DAYS = 21;
/** Days a finished task stays visible before it is tucked. */
export const DONE_TUCK_AFTER_DAYS = 3;

/** Things the person keeps coming back to. Opens decay over time so the list stays current. */
export function reachFor(items: Item[], now = new Date(), limit = 5): Item[] {
  return items
    .filter((i) => !i.done && !i.tucked && i.openCount >= 2)
    .map((i) => {
      const age = daysSince(i.lastOpenedAt, now);
      const decay = Math.exp(-age / 14);
      return { i, score: i.openCount * decay };
    })
    .filter((x) => x.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.i);
}

/** Returns the ids that should be tucked now. Pinned and upcoming things never tuck. */
export function staleIds(items: Item[], now = new Date()): string[] {
  const out: string[] = [];
  for (const i of items) {
    if (i.tucked || i.pinned) continue;
    if (i.due && new Date(i.due).getTime() > now.getTime()) continue;
    const touched = Math.min(daysSince(i.updatedAt, now), daysSince(i.lastOpenedAt, now));
    if (i.done && touched > DONE_TUCK_AFTER_DAYS) out.push(i.id);
    else if (!i.done && touched > TUCK_AFTER_DAYS) out.push(i.id);
  }
  return out;
}

const DEFAULT_ORDER: ItemType[] = ['task', 'note', 'link', 'reminder'];

/** Types in the order the person actually uses them. */
export function orderedTypes(usage: Usage): ItemType[] {
  return [...DEFAULT_ORDER].sort((a, b) => (usage.types[b] ?? 0) - (usage.types[a] ?? 0));
}

function fmtHour(h: number): string {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${ap}`;
}

/** A gentle observation about when the person tends to capture things. Only once there is enough to go on. */
export function routineHint(usage: Usage): string | null {
  const total = usage.hours.reduce((a, b) => a + b, 0);
  if (total < 12) return null;
  let peak = 0;
  for (let h = 1; h < 24; h++) if (usage.hours[h] > usage.hours[peak]) peak = h;
  if (usage.hours[peak] / total < 0.2) return null;
  return `You tend to drop things here around ${fmtHour(peak)}.`;
}

export function matches(item: Item, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${item.title}\n${item.body}\n${item.url ?? ''}\n${item.tags.join(' ')}`.toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}
