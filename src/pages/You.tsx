import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Download, Upload, Bell, BellOff, X, Plus } from 'lucide-react';
import { useStore, applyAppearance, type Snapshot } from '@/lib/store';
import { ACCENTS, type ThemePref } from '@/lib/types';
import { Chip, SectionTitle } from '@/components/TypeBits';
import { peakHour } from '@/lib/adapt';
import type { Usage } from '@/lib/types';

/** Default the nudge to the hour the person already tends to show up, else 9 AM. */
function suggestedNudge(usage: Usage): string {
  const h = peakHour(usage) ?? 9;
  return `${String(h).padStart(2, '0')}:00`;
}

const THEMES: { v: ThemePref; label: string }[] = [
  { v: 'system', label: 'Match phone' },
  { v: 'light', label: 'Light' },
  { v: 'dark', label: 'Dark' },
];

export default function You() {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const exportSnapshot = useStore((s) => s.exportSnapshot);
  const importSnapshot = useStore((s) => s.importSnapshot);
  const resetAll = useStore((s) => s.resetAll);
  const items = useStore((s) => s.items);
  const usage = useStore((s) => s.usage);
  const folders = useStore((s) => s.folders);
  const addFolder = useStore((s) => s.addFolder);
  const removeFolder = useStore((s) => s.removeFolder);
  const [newFolder, setNewFolder] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, bump] = useState(0);
  // Only people who have unlocked team notes on this device see the link.
  const [onTeam] = useState(() => {
    try {
      return !!(JSON.parse(localStorage.getItem('pointless-team') ?? '{}') as { code?: string }).code;
    } catch {
      return false;
    }
  });

  const update = (patch: Parameters<typeof setProfile>[0]) => {
    setProfile(patch);
    applyAppearance({ ...profile, ...patch });
  };

  const notifState = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

  const doExport = () => {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pointless-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      const snap = JSON.parse(await file.text()) as Snapshot;
      if (!snap || !Array.isArray(snap.items)) throw new Error('bad file');
      importSnapshot(snap);
      applyAppearance(useStore.getState().profile);
      setMsg(`Brought in ${snap.items.length} things.`);
    } catch {
      setMsg('That file did not look like a Pointless backup.');
    }
    window.setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="fade-in">
      <SectionTitle first>You</SectionTitle>
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-[13px] text-ink-2">What should this call you?</span>
          <input
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
            className="h-11 px-4 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[15px]"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] text-ink-2">Name of this space</span>
          <input
            value={profile.spaceName}
            onChange={(e) => update({ spaceName: e.target.value })}
            className="h-11 px-4 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[15px]"
          />
        </label>
      </div>

      <SectionTitle>Looks</SectionTitle>
      <div className="flex gap-3 flex-wrap items-center">
        {ACCENTS.map((a) => (
          <button
            key={a.hex}
            type="button"
            title={a.name}
            aria-label={a.name}
            aria-pressed={profile.accent === a.hex}
            onClick={() => update({ accent: a.hex })}
            className={`w-9 h-9 rounded-full border-2 transition-transform ${profile.accent === a.hex ? 'border-ink scale-110' : 'border-transparent'}`}
            style={{ background: a.hex }}
          />
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mt-4">
        {THEMES.map((t) => (
          <Chip key={t.v} active={profile.theme === t.v} onClick={() => update({ theme: t.v })}>
            {t.label}
          </Chip>
        ))}
      </div>

      <SectionTitle>Reminders</SectionTitle>
      {notifState === 'granted' && (
        <p className="text-[14px] text-ink-2 inline-flex items-center gap-2"><Bell size={15} /> This browser will nudge you when something is due.</p>
      )}
      {notifState === 'denied' && (
        <p className="text-[14px] text-ink-2 inline-flex items-center gap-2"><BellOff size={15} /> Notifications are blocked in your browser settings. Due things still show on Today.</p>
      )}
      {notifState === 'default' && (
        <button
          type="button"
          onClick={() => Notification.requestPermission().then(() => bump((n) => n + 1))}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-ink text-paper text-[14px] font-medium"
        >
          <Bell size={15} /> Allow nudges
        </button>
      )}
      {notifState === 'unsupported' && <p className="text-[14px] text-ink-2">This browser cannot send notifications. Due things still show on Today.</p>}

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <Chip active={!!profile.nudgeTime} onClick={() => update({ nudgeTime: profile.nudgeTime ? null : suggestedNudge(usage) })}>
          One nudge a day
        </Chip>
        {profile.nudgeTime && (
          <input
            type="time"
            value={profile.nudgeTime}
            onChange={(e) => e.target.value && update({ nudgeTime: e.target.value })}
            aria-label="Nudge time"
            className="h-9 px-3 rounded-xl bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[14px]"
          />
        )}
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        A single "here is today" message at the time you tend to use this. It only fires while the app is open or installed on your home screen.
      </p>

      <SectionTitle>Notes</SectionTitle>
      <div className="flex items-center gap-3 flex-wrap">
        <Chip active={profile.smartSort} onClick={() => update({ smartSort: !profile.smartSort })}>
          Smart sorting with AI
        </Chip>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        Off: notes are sorted on this device by the words in them, and learn from where you move things. On: when you leave a note, its text is also
        sent to an AI to pick the folder and write a title. That is the only time anything leaves your device.
      </p>
      <div className="mt-4 flex gap-2 flex-wrap items-center">
        {folders.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 h-8 pl-3 pr-1.5 rounded-full border border-line text-[13px]">
            {f}
            <button type="button" aria-label={`Remove ${f}`} onClick={() => removeFolder(f)} className="p-1 rounded-full text-ink-3 hover:text-ink hover:bg-paper-2">
              <X size={12} />
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFolder(newFolder);
            setNewFolder('');
          }}
          className="inline-flex items-center gap-1"
        >
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="new folder"
            aria-label="New folder"
            className="h-8 w-32 px-3 rounded-full bg-paper-2/70 border border-line focus:border-ink-3 outline-none text-[13px]"
          />
          <button type="submit" aria-label="Add folder" className="p-1.5 rounded-full text-ink-2 hover:bg-paper-2">
            <Plus size={14} />
          </button>
        </form>
      </div>

      <SectionTitle>Your data</SectionTitle>
      <p className="text-[14px] text-ink-2 mb-3">
        Everything lives on this device. {items.length} {items.length === 1 ? 'thing' : 'things'} so far. Back it up to move it somewhere else.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={doExport} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-line text-[14px] hover:border-ink-3">
          <Download size={15} /> Back up
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-line text-[14px] hover:border-ink-3">
          <Upload size={15} /> Bring in a backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = '';
          }}
        />
      </div>
      {msg && <p className="mt-3 text-[13px] text-ink-2 fade-in">{msg}</p>}

      <div className="mt-12 flex items-center justify-between text-[12px] text-ink-3">
        {confirmReset ? (
          <span className="inline-flex items-center gap-3">
            Erase everything on this device?
            <button type="button" onClick={() => { resetAll(); applyAppearance(useStore.getState().profile); }} className="text-ink underline underline-offset-4">yes, erase</button>
            <button type="button" onClick={() => setConfirmReset(false)} className="hover:text-ink">no</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="hover:text-ink">start over</button>
        )}
        <span className="inline-flex gap-4">
          {onTeam && <Link to="/team" className="hover:text-ink">team notes ↗</Link>}
          <Link to="/about" className="hover:text-ink">about ↗</Link>
        </span>
      </div>
    </div>
  );
}
