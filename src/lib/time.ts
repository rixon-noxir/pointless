const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/** "in 2h", "tomorrow 9:00 AM", "Tue 3:00 PM", "Oct 30", "3 days ago". */
export function whenLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const past = diff < 0;

  if (abs < MIN) return past ? 'just now' : 'now';
  if (abs < HOUR) {
    const m = Math.round(abs / MIN);
    return past ? `${m}m ago` : `in ${m}m`;
  }
  if (isSameDay(d, now)) {
    return past ? `today ${timeFmt.format(d)}` : `today ${timeFmt.format(d)}`;
  }
  const dayDiff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
  if (dayDiff === 1) return `tomorrow ${timeFmt.format(d)}`;
  if (dayDiff === -1) return `yesterday ${timeFmt.format(d)}`;
  if (dayDiff > 1 && dayDiff < 7) return `${weekdayFmt.format(d)} ${timeFmt.format(d)}`;
  if (dayDiff < 0 && dayDiff > -7) return `${-dayDiff} days ago`;
  return dateFmt.format(d);
}

/** Short age for list rows: "2m", "3h", "yesterday", "Oct 2". */
export function ageLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = now.getTime() - d.getTime();
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.round(diff / MIN)}m`;
  if (isSameDay(d, now)) return `${Math.round(diff / HOUR)}h`;
  const dayDiff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY);
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff < 7) return `${dayDiff}d`;
  return dateFmt.format(d);
}

export function isOverdue(iso: string, now = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime();
}

export function isDueToday(iso: string, now = new Date()): boolean {
  return isSameDay(new Date(iso), now);
}

/** For <input type="datetime-local">. */
export function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function daysSince(iso: string | undefined, now = new Date()): number {
  if (!iso) return Infinity;
  return (now.getTime() - new Date(iso).getTime()) / DAY;
}

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function hourLabel(h: number): string {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${ap}`;
}
