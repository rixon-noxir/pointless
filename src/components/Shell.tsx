import { NavLink, Outlet } from 'react-router';
import { Sun, CalendarDays, LayoutList, NotebookPen, CircleUser } from 'lucide-react';
import { useStore } from '@/lib/store';

const nav = [
  { to: '/', label: 'Today', icon: Sun, end: true },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/all', label: 'Everything', icon: LayoutList },
  { to: '/space', label: 'Notes', icon: NotebookPen },
  { to: '/you', label: 'You', icon: CircleUser },
];

export default function Shell() {
  const spaceName = useStore((s) => s.profile.spaceName);

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop rail: no logo, no brand. Just the person's own space name. */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col px-4 py-8 sticky top-0 h-dvh">
        <div className="px-3 mb-8 text-sm font-medium text-ink-2 truncate">{spaceName || 'Your space'}</div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 h-10 px-3 rounded-xl text-[15px] transition-colors ${
                  isActive ? 'bg-paper-2 text-ink font-medium' : 'text-ink-2 hover:text-ink hover:bg-paper-2/60'
                }`
              }
            >
              <n.icon size={17} strokeWidth={1.75} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-6 md:pt-10">
          <Outlet />
        </div>
      </main>

      {/* Phone tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/90 backdrop-blur border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] ${isActive ? 'text-ink font-medium' : 'text-ink-3'}`
              }
            >
              {({ isActive }) => (
                <>
                  <n.icon size={21} strokeWidth={isActive ? 2 : 1.6} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
