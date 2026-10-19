import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Shell from '@/components/Shell';
import ReminderWatcher from '@/components/ReminderWatcher';
import Today from '@/pages/Today';
import Welcome from '@/pages/Welcome';
import { useStore, applyAppearance } from '@/lib/store';

// Auto-retry on chunk load failure (happens after a deploy when old chunks are gone)
function lazyRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    importFn().catch(() => {
      const hasReloaded = sessionStorage.getItem('chunk-reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
      }
      sessionStorage.removeItem('chunk-reload');
      return importFn();
    }),
  );
}

const Everything = lazyRetry(() => import('@/pages/Everything'));
const Space = lazyRetry(() => import('@/pages/Space'));
const ItemPage = lazyRetry(() => import('@/pages/ItemPage'));
const You = lazyRetry(() => import('@/pages/You'));
const About = lazyRetry(() => import('@/pages/About'));

function PageLoader() {
  return (
    <div className="pt-2">
      <div className="h-7 w-40 bg-paper-2 rounded-lg animate-pulse mb-4" />
      <div className="h-14 w-full bg-paper-2 rounded-2xl animate-pulse" />
    </div>
  );
}

export default function App() {
  const onboarded = useStore((s) => s.profile.onboarded);
  const profile = useStore((s) => s.profile);
  const tuckStale = useStore((s) => s.tuckStale);

  useEffect(() => {
    applyAppearance(profile);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(useStore.getState().profile);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [profile]);

  useEffect(() => {
    tuckStale();
    const onVisible = () => document.visibilityState === 'visible' && tuckStale();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tuckStale]);

  if (!onboarded) return <Welcome />;

  return (
    <BrowserRouter>
      <ReminderWatcher />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="all" element={<Everything />} />
            <Route path="space" element={<Space />} />
            <Route path="item/:id" element={<ItemPage />} />
            <Route path="you" element={<You />} />
            <Route path="about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
