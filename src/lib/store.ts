import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, ItemType, Profile, Scratch, Stroke, Usage } from './types';
import { staleIds } from './adapt';

export interface NewItem {
  type: ItemType;
  title: string;
  body?: string;
  url?: string;
  due?: string;
}

export interface Snapshot {
  version: 1;
  exportedAt: string;
  profile: Profile;
  items: Item[];
  scratch: Scratch;
  usage: Usage;
}

interface State {
  profile: Profile;
  items: Item[];
  scratch: Scratch;
  usage: Usage;
  /** Reminder ids already announced, so they only fire once. */
  notified: string[];
  /** Local date (YYYY-MM-DD) of the last daily nudge. */
  lastNudgedOn: string | null;
  /** Repeat suggestions the person said no to, by normalised title. */
  dismissedRepeats: string[];

  setProfile: (patch: Partial<Profile>) => void;
  addItem: (n: NewItem) => Item;
  updateItem: (id: string, patch: Partial<Omit<Item, 'id' | 'createdAt'>>) => void;
  deleteItem: (id: string) => void;
  toggleDone: (id: string) => void;
  togglePin: (id: string) => void;
  touch: (id: string) => void;
  untuck: (id: string) => void;
  clearDone: () => void;
  tuckStale: () => number;
  markNotified: (id: string) => void;
  setLastNudgedOn: (d: string) => void;
  setRepeat: (id: string, days: number | undefined) => void;
  dismissRepeat: (key: string) => void;

  setScratchText: (text: string) => void;
  addStroke: (s: Stroke) => void;
  undoStroke: () => void;
  clearStrokes: () => void;

  exportSnapshot: () => Snapshot;
  importSnapshot: (s: Snapshot) => void;
  resetAll: () => void;
}

const emptyUsage = (): Usage => ({
  types: { task: 0, note: 0, link: 0, reminder: 0 },
  hours: Array.from({ length: 24 }, () => 0),
});

const defaultProfile = (): Profile => ({
  name: '',
  spaceName: '',
  accent: '#e8a0bf',
  theme: 'system',
  onboarded: false,
  nudgeTime: null,
});

const nowIso = () => new Date().toISOString();

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile(),
      items: [],
      scratch: { text: '', strokes: [] },
      usage: emptyUsage(),
      notified: [],
      lastNudgedOn: null,
      dismissedRepeats: [],

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      addItem: (n) => {
        const t = nowIso();
        const item: Item = {
          id: newId(),
          type: n.type,
          title: n.title.trim() || 'Untitled',
          body: n.body ?? '',
          url: n.url,
          due: n.due,
          done: false,
          pinned: false,
          tags: [],
          createdAt: t,
          updatedAt: t,
          openCount: 0,
          tucked: false,
        };
        set((s) => {
          const hours = [...s.usage.hours];
          hours[new Date().getHours()] += 1;
          return {
            items: [item, ...s.items],
            usage: { types: { ...s.usage.types, [n.type]: (s.usage.types[n.type] ?? 0) + 1 }, hours },
          };
        });
        return item;
      },

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: nowIso(), tucked: false } : i)),
        })),

      deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      toggleDone: (id) =>
        set((s) => {
          const t = nowIso();
          const target = s.items.find((i) => i.id === id);
          if (!target) return {};
          const nowDone = !target.done;
          const items = s.items.map((i) =>
            i.id === id ? { ...i, done: nowDone, doneAt: nowDone ? t : i.doneAt, updatedAt: t } : i,
          );
          // Flexible rhythm: finishing a repeating item queues the next one, due N days from now.
          if (nowDone && target.repeatDays && target.repeatDays > 0) {
            const due = new Date();
            due.setDate(due.getDate() + target.repeatDays);
            if (target.due) {
              const prev = new Date(target.due);
              due.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
            } else {
              due.setHours(9, 0, 0, 0);
            }
            items.unshift({
              ...target,
              id: newId(),
              done: false,
              doneAt: undefined,
              due: due.toISOString(),
              createdAt: t,
              updatedAt: t,
              lastOpenedAt: undefined,
              openCount: 0,
              tucked: false,
            });
          }
          return { items };
        }),

      togglePin: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, pinned: !i.pinned, tucked: false, updatedAt: nowIso() } : i)),
        })),

      touch: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, openCount: i.openCount + 1, lastOpenedAt: nowIso(), tucked: false } : i,
          ),
        })),

      untuck: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, tucked: false, updatedAt: nowIso() } : i)),
        })),

      clearDone: () => set((s) => ({ items: s.items.filter((i) => !i.done) })),

      tuckStale: () => {
        const ids = new Set(staleIds(get().items));
        if (ids.size === 0) return 0;
        set((s) => ({ items: s.items.map((i) => (ids.has(i.id) ? { ...i, tucked: true } : i)) }));
        return ids.size;
      },

      markNotified: (id) => set((s) => ({ notified: s.notified.includes(id) ? s.notified : [...s.notified, id] })),
      setLastNudgedOn: (d) => set({ lastNudgedOn: d }),
      setRepeat: (id, days) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, repeatDays: days, updatedAt: nowIso() } : i)) })),
      dismissRepeat: (key) =>
        set((s) => ({ dismissedRepeats: s.dismissedRepeats.includes(key) ? s.dismissedRepeats : [...s.dismissedRepeats, key] })),

      setScratchText: (text) => set((s) => ({ scratch: { ...s.scratch, text } })),
      addStroke: (stroke) => set((s) => ({ scratch: { ...s.scratch, strokes: [...s.scratch.strokes, stroke] } })),
      undoStroke: () => set((s) => ({ scratch: { ...s.scratch, strokes: s.scratch.strokes.slice(0, -1) } })),
      clearStrokes: () => set((s) => ({ scratch: { ...s.scratch, strokes: [] } })),

      exportSnapshot: () => {
        const s = get();
        return { version: 1, exportedAt: nowIso(), profile: s.profile, items: s.items, scratch: s.scratch, usage: s.usage };
      },

      importSnapshot: (snap) =>
        set({
          profile: { ...defaultProfile(), ...snap.profile, onboarded: true },
          items: Array.isArray(snap.items) ? snap.items : [],
          scratch: snap.scratch ?? { text: '', strokes: [] },
          usage: snap.usage ?? emptyUsage(),
          notified: [],
          lastNudgedOn: null,
          dismissedRepeats: [],
        }),

      resetAll: () =>
        set({
          profile: defaultProfile(),
          items: [],
          scratch: { text: '', strokes: [] },
          usage: emptyUsage(),
          notified: [],
          lastNudgedOn: null,
          dismissedRepeats: [],
        }),
    }),
    {
      name: 'pointless',
      version: 1,
      // Fill in fields added after a person first saved their data.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, profile: { ...current.profile, ...(p.profile ?? {}) } };
      },
    },
  ),
);

/** Apply the saved theme and accent to the document. */
export function applyAppearance(profile: Profile) {
  const root = document.documentElement;
  const dark =
    profile.theme === 'dark' || (profile.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.style.setProperty('--accent', profile.accent);
}
