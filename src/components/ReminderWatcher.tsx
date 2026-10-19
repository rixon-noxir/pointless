import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '@/lib/store';
import { isOverdue } from '@/lib/time';

interface Due {
  id: string;
  title: string;
}

/** Checks every half minute for reminders that have come due and announces each once. */
export default function ReminderWatcher() {
  const [banner, setBanner] = useState<Due[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => {
      const { items, notified, markNotified } = useStore.getState();
      const fresh = items.filter((i) => i.due && !i.done && !notified.includes(i.id) && isOverdue(i.due));
      if (fresh.length === 0) return;
      for (const i of fresh) {
        markNotified(i.id);
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(i.title, { body: i.body || undefined, tag: i.id });
          } catch {
            /* some browsers only allow notifications from a service worker */
          }
        }
      }
      setBanner((b) => [...b, ...fresh.map((i) => ({ id: i.id, title: i.title }))]);
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
              navigate(`/item/${d.id}`);
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
