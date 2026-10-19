import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '@/lib/store';
import { isOverdue, isDueToday } from '@/lib/time';
import { showNote } from '@/lib/notify';

interface Due {
  id: string;
  title: string;
  url: string;
}

function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Checks every half minute for reminders that have come due and announces each once.
 * Also sends the one daily nudge, at the time the person chose, while the app is open.
 */
export default function ReminderWatcher() {
  const [banner, setBanner] = useState<Due[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => {
      const { items, notified, markNotified, profile, lastNudgedOn, setLastNudgedOn } = useStore.getState();
      const now = new Date();

      const fresh = items.filter((i) => i.due && !i.done && !notified.includes(i.id) && isOverdue(i.due, now));
      for (const i of fresh) {
        markNotified(i.id);
        void showNote(i.title, i.body || undefined, `/item/${i.id}`);
      }
      if (fresh.length > 0) setBanner((b) => [...b, ...fresh.map((i) => ({ id: i.id, title: i.title, url: `/item/${i.id}` }))]);

      if (profile.nudgeTime && lastNudgedOn !== localDate(now)) {
        const [h, m] = profile.nudgeTime.split(':').map(Number);
        const at = new Date(now);
        at.setHours(h, m, 0, 0);
        if (now.getTime() >= at.getTime()) {
          setLastNudgedOn(localDate(now));
          const today = items.filter((i) => !i.done && !i.tucked && i.due && (isOverdue(i.due, now) || isDueToday(i.due, now)));
          const open = items.filter((i) => !i.done && !i.tucked && (i.type === 'task' || i.type === 'reminder'));
          const title =
            today.length > 0
              ? `${today.length} ${today.length === 1 ? 'thing' : 'things'} today`
              : open.length > 0
                ? 'Nothing due today'
                : 'Nothing waiting on you';
          const body = today.length > 0 ? today.slice(0, 3).map((i) => i.title).join(' · ') : open.length > 0 ? 'Want one picked for you?' : undefined;
          void showNote(title, body, today.length > 0 ? '/' : '/now');
          setBanner((b) => [...b, { id: `nudge-${localDate(now)}`, title: body ? `${title}: ${body}` : title, url: today.length > 0 ? '/' : '/now' }]);
        }
      }
    };
    check();
    const t = window.setInterval(check, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (banner.length === 0) return null;

  return (
    <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-80 z-50 flex flex-col gap-2">
      {banner.map((d) => (
        <div key={d.id} className="fade-in flex items-center gap-3 rounded-2xl bg-ink text-paper px-4 py-3 shadow-lg">
          <Bell size={16} className="shrink-0" />
          <button
            type="button"
            className="flex-1 min-w-0 text-left text-[14px] truncate"
            onClick={() => {
              setBanner((b) => b.filter((x) => x.id !== d.id));
              navigate(d.url);
            }}
          >
            {d.title}
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBanner((b) => b.filter((x) => x.id !== d.id))}
            className="opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
