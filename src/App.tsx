import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './ui/Shell';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { applySettings, lastSlotId, loadCareer, store } from './store/store';
import { Home } from './screens/Home';
import { Start } from './screens/simple/Start';
import { Play } from './screens/simple/Play';

// The core loop (home, identity, career) loads up front; secondary pages load on demand.
const lazyNamed = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const NewCareer = lazyNamed(() => import('./screens/NewCareer'), 'NewCareer');
const Achievements = lazyNamed(() => import('./screens/Achievements'), 'Achievements');
const Daily = lazyNamed(() => import('./screens/Daily'), 'Daily');
const Saves = lazyNamed(() => import('./screens/Saves'), 'Saves');
const Settings = lazyNamed(() => import('./screens/Settings'), 'Settings');
const Gallery = lazyNamed(() => import('./screens/Gallery'), 'Gallery');

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Loading() {
  return <div className="busy" role="status" aria-live="polite" style={{ background: 'transparent' }}><div className="ball" /></div>;
}

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    applySettings(store.get().settings);
    const id = lastSlotId();
    if (id) {
      const c = loadCareer(id);
      if (c) store.setCareer(c, false);
    }
    setReady(true);
  }, []);
  if (!ready) return null;
  const shell = (el: ReactNode) => <Shell>{el}</Shell>;
  return (
    <ErrorBoundary>
      <HashRouter>
        <ScrollTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/start" element={<Start />} />
            <Route path="/play" element={<Play />} />
            <Route path="/new" element={<NewCareer />} />
            <Route path="/daily" element={shell(<Daily />)} />
            <Route path="/saves" element={shell(<Saves />)} />
            <Route path="/settings" element={shell(<Settings />)} />
            <Route path="/achievements" element={shell(<Achievements />)} />
            {import.meta.env.DEV && <Route path="/gallery" element={<Gallery />} />}
            {/* Old detailed-view links (bookmarks, saves) land on the game screen. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
