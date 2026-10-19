import type { ItemType } from './types';

export interface Parsed {
  type: ItemType;
  title: string;
  body: string;
  url?: string;
  due?: string;
  /** The words that were read as a time, so the UI can show what it understood. */
  whenText?: string;
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+|(?:^|\s)((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|app|dev|co|me|ai|edu|gov|us|uk|ca|tv|info|xyz)(?:\/[^\s]*)?)/i;

const TASK_START =
  /^(\[\s?\]|-\s|\*\s|todo\b|to do\b|buy\b|call\b|text\b|email\b|pay\b|send\b|fix\b|finish\b|book\b|schedule\b|return\b|pick up\b|order\b|cancel\b|renew\b|clean\b|submit\b|follow up\b|ask\b|check\b|get\b|make\b|write\b|print\b|sign\b|mail\b|drop off\b|wash\b|take\b|bring\b|look up\b|read\b|watch\b)/i;

const REMIND_START = /^(remind(?:er)?(?: me)?(?: to| that| about)?|remember(?: to)?|don'?t forget(?: to)?)\s+/i;

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_RE = /\b(?:(next|this)\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:[a-z]*)\b/i;
const REL_RE = /\bin\s+(\d+|an?)\s*(min|mins|minute|minutes|m|hour|hours|h|hr|hrs|day|days|d|week|weeks|w)\b/i;
const WORD_RE = /\b(tomorrow|tmr|tmrw|tonight|today|next week|this weekend|this evening|this afternoon|this morning)\b/i;
const TIME_RE =
  /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b|\bat\s+(\d{1,2})(?::(\d{2}))?\b|\b(noon|midnight)\b/i;

export interface When {
  due: Date;
  matched: string[];
}

/** Reads plain English like "tomorrow 9am", "fri 3pm", "in 2 hours", "tonight". */
export function parseWhen(text: string, now = new Date()): When | null {
  const matched: string[] = [];
  let base: Date | null = null;
  let hour: number | null = null;
  let minute = 0;

  const rel = REL_RE.exec(text);
  if (rel) {
    const n = /^an?$/i.test(rel[1]) ? 1 : parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const d = new Date(now);
    if (/^m/.test(unit)) d.setMinutes(d.getMinutes() + n);
    else if (/^h/.test(unit)) d.setHours(d.getHours() + n);
    else if (/^d/.test(unit)) d.setDate(d.getDate() + n);
    else d.setDate(d.getDate() + n * 7);
    d.setSeconds(0, 0);
    matched.push(rel[0]);
    return { due: d, matched };
  }

  const word = WORD_RE.exec(text);
  if (word) {
    const w = word[1].toLowerCase();
    base = new Date(now);
    if (w === 'tomorrow' || w === 'tmr' || w === 'tmrw') base.setDate(base.getDate() + 1);
    else if (w === 'tonight' || w === 'this evening') hour = 20;
    else if (w === 'this afternoon') hour = 15;
    else if (w === 'this morning') hour = 9;
    else if (w === 'next week') base.setDate(base.getDate() + ((8 - base.getDay()) % 7 || 7));
    else if (w === 'this weekend') {
      base.setDate(base.getDate() + ((6 - base.getDay() + 7) % 7 || 7));
      hour = 10;
    }
    matched.push(word[0]);
  }

  const wd = WEEKDAY_RE.exec(text);
  if (wd && !base) {
    const idx = WEEKDAYS.findIndex((d) => d.startsWith(wd[2].toLowerCase().slice(0, 3)));
    if (idx >= 0) {
      base = new Date(now);
      let delta = (idx - base.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      if (wd[1]?.toLowerCase() === 'next') delta += 7;
      base.setDate(base.getDate() + delta);
      matched.push(wd[0]);
    }
  }

  const t = TIME_RE.exec(text);
  if (t) {
    if (t[6]) {
      hour = t[6].toLowerCase() === 'noon' ? 12 : 0;
    } else {
      let h = parseInt(t[1] ?? t[4], 10);
      minute = parseInt(t[2] ?? t[5] ?? '0', 10);
      const ap = t[3]?.toLowerCase().replace(/\./g, '');
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (!ap && h <= 6) h += 12; // "at 3" means 3 PM
      hour = h;
    }
    if (hour > 23 || minute > 59) return null;
    matched.push(t[0]);
  }

  if (!base && hour === null) return null;

  const due = new Date(base ?? now);
  if (hour === null) hour = 9; // a day with no time: morning
  due.setHours(hour, minute, 0, 0);
  if (!base && due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
  return { due, matched };
}

function tidy(s: string): string {
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '')
    .trim();
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseCapture(raw: string, now = new Date()): Parsed {
  const text = raw.trim();
  const lines = text.split('\n');
  let first = lines[0].trim();
  const rest = lines.slice(1).join('\n').trim();

  // Links
  const urlMatch = URL_RE.exec(text);
  if (urlMatch) {
    const found = (urlMatch[1] ?? urlMatch[0]).trim();
    const url = /^https?:\/\//i.test(found) ? found : `https://${found}`;
    let title = tidy(text.replace(found, ''));
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        title = found;
      }
    }
    return { type: 'link', title: title.split('\n')[0], body: '', url };
  }

  // Reminders (anything with a time in it, or that starts with "remind me")
  const remind = REMIND_START.exec(first);
  const when = parseWhen(first, now);
  if (remind || when) {
    if (remind) first = first.slice(remind[0].length);
    let title = first;
    for (const m of when?.matched ?? []) title = title.replace(m, ' ');
    title = cap(tidy(title) || 'Reminder');
    return {
      type: 'reminder',
      title,
      body: rest,
      due: when?.due.toISOString(),
      whenText: when?.matched.join(' '),
    };
  }

  // Tasks
  if (TASK_START.test(first)) {
    const title = tidy(first.replace(/^(\[\s?\]|-\s|\*\s|todo\b:?|to do\b:?)/i, ''));
    return { type: 'task', title: cap(title), body: rest };
  }

  // Notes
  return { type: 'note', title: first, body: rest };
}

export type Intent = 'plan' | 'pick' | 'think';

const INTENTS: [RegExp, Intent][] = [
  [
    /\b(what (should|do) i (do|work on|start with)|can'?t decide|pick (one|something) for me|where (do|should) i (start|begin)|i (don'?t|dont) know what to do)\b/i,
    'pick',
  ],
  [
    /\b(organi[sz]e|plan|sort( out)?|map( out)?|structure|schedule|figure out|lay out|set up)\b[^\n]*\b(my |the |this )?(day|today|tomorrow|morning|afternoon|evening|week|schedule)\b/i,
    'plan',
  ],
  [
    /\b(organi[sz]e|sort( out)?|clear|untangle|think (through|about)|brain ?dump|get|collect|process)\b[^\n]*\b(my |the )?(thoughts|head|mind|ideas|brain|feelings)\b/i,
    'think',
  ],
];

/**
 * Some captures are not things to store, they are asks: "organize my day", "what should I do".
 * Those get taken somewhere instead of filed.
 */
export function detectIntent(text: string): Intent | null {
  const t = text.trim();
  if (!t || t.length > 120 || t.includes('\n')) return null;
  if (REMIND_START.test(t)) return null;
  for (const [re, intent] of INTENTS) if (re.test(t)) return intent;
  return null;
}
