export type ItemType = 'task' | 'note' | 'link' | 'reminder';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  body: string;
  url?: string;
  /** ISO timestamp. Reminders always have one; tasks may. */
  due?: string;
  done: boolean;
  /** When it was last marked done. */
  doneAt?: string;
  /** Flexible rhythm: a fresh copy is due this many days after it is finished. */
  repeatDays?: number;
  /** Notes: the folder it was filed into. */
  folder?: string;
  /** Notes: true once the person chose the folder by hand, so auto-sorting leaves it alone. */
  folderByHand?: boolean;
  /** Notes: a short title written by the sorter, used in lists. */
  autoTitle?: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  openCount: number;
  /** Auto-quieted: untouched for a while, moved out of the main list. Never deleted. */
  tucked: boolean;
}

export interface Point { x: number; y: number }
export interface Stroke { points: Point[]; width: number }

export interface Scratch {
  text: string;
  strokes: Stroke[];
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Profile {
  name: string;
  spaceName: string;
  accent: string;
  theme: ThemePref;
  onboarded: boolean;
  /** One notification a day, at this local time. null = off. */
  nudgeTime: string | null;
  /** Send note text to the AI sorter (opt-in; the note leaves the device). */
  smartSort: boolean;
}

export interface Usage {
  /** How many items of each type the person has made. Orders the UI. */
  types: Record<ItemType, number>;
  /** Hour-of-day histogram of captures. Finds the person's routine. */
  hours: number[];
}

export const ACCENTS: { name: string; hex: string }[] = [
  { name: 'Pink', hex: '#e8a0bf' },
  { name: 'Sage', hex: '#9fbf9a' },
  { name: 'Sky', hex: '#9cbfe0' },
  { name: 'Clay', hex: '#e0a98a' },
  { name: 'Lavender', hex: '#b9a9e0' },
  { name: 'Sun', hex: '#e6c66a' },
];
