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
/** The hour the person most often captures things, once there is enough to go on. */
export function peakHour(usage: Usage): number | null {
  const total = usage.hours.reduce((a, b) => a + b, 0);
  if (total < 12) return null;
  let peak = 0;
  for (let h = 1; h < 24; h++) if (usage.hours[h] > usage.hours[peak]) peak = h;
  if (usage.hours[peak] / total < 0.2) return null;
  return peak;
}

export function routineHint(usage: Usage): string | null {
  const peak = peakHour(usage);
  if (peak === null) return null;
  return `You tend to drop things here around ${fmtHour(peak)}.`;
}

export function matches(item: Item, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${item.title}\n${item.body}\n${item.url ?? ''}\n${item.tags.join(' ')}`.toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/** Normalised title, for spotting the same chore done again and again. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface RepeatSuggestion {
  key: string;
  title: string;
  days: number;
  exampleId: string;
}

/**
 * Finds a chore the person has finished at least twice and offers a rhythm for it.
 * The rhythm counts from completion, not from a fixed date, so a late finish just shifts it.
 */
export function repeatSuggestion(items: Item[], dismissed: string[]): RepeatSuggestion | null {
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    if (!i.done || !i.doneAt) continue;
    if (i.type !== 'task' && i.type !== 'reminder') continue;
    const k = titleKey(i.title);
    if (!k || dismissed.includes(k)) continue;
    const g = groups.get(k) ?? [];
    g.push(i);
    groups.set(k, g);
  }
  let best: RepeatSuggestion | null = null;
  for (const [key, g] of groups) {
    if (g.length < 2) continue;
    if (items.some((i) => titleKey(i.title) === key && i.repeatDays)) continue;
    const times = g.map((i) => new Date(i.doneAt!).getTime()).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let n = 1; n < times.length; n++) gaps.push((times[n] - times[n - 1]) / (24 * 3600 * 1000));
    const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (median < 0.75) continue; // done twice in a day is a redo, not a rhythm
    let days = Math.round(median);
    if (days >= 6 && days <= 8) days = 7;
    else if (days >= 13 && days <= 15) days = 14;
    else if (days >= 27 && days <= 33) days = 30;
    const latest = g.reduce((a, b) => (a.doneAt! > b.doneAt! ? a : b));
    const cand = { key, title: latest.title, days, exampleId: latest.id };
    if (!best || g.length > (groups.get(best.key)?.length ?? 0)) best = cand;
  }
  return best;
}

/**
 * Picks one thing to do right now. Due things first, then pinned, then the oldest open task.
 * `skip` holds ids the person already said "not this one" to.
 */
export function pickOne(items: Item[], skip: string[] = [], now = new Date()): Item | null {
  const open = items.filter(
    (i) => !i.done && !i.tucked && (i.type === 'task' || i.type === 'reminder') && !skip.includes(i.id),
  );
  if (open.length === 0) return null;
  const t = now.getTime();
  const score = (i: Item) => {
    let s = 0;
    if (i.due) {
      const d = new Date(i.due).getTime();
      if (d <= t) s += 100;
      else if (d - t < 24 * 3600 * 1000) s += 60;
      else if (d - t < 3 * 24 * 3600 * 1000) s += 20;
    }
    if (i.pinned) s += 30;
    s += Math.min(10, daysSince(i.createdAt, now) / 3);
    return s;
  };
  return open.sort((a, b) => score(b) - score(a))[0];
}

/** How many things "pick one" could choose from. */
export function pickableCount(items: Item[]): number {
  return items.filter((i) => !i.done && !i.tucked && (i.type === 'task' || i.type === 'reminder')).length;
}
