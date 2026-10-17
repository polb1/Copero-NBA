import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { applySettings, lastSlotId, loadCareer, store, useCareer } from './store/store';
import { Home } from './screens/Home';
import { Start } from './screens/simple/Start';
import { Play } from './screens/simple/Play';

// The main flow (home, identity, career screen) loads up front; detailed screens load on demand.
const lazyNamed = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const NewCareer = lazyNamed(() => import('./screens/NewCareer'), 'NewCareer');
const Draft = lazyNamed(() => import('./screens/Draft'), 'Draft');
const Signing = lazyNamed(() => import('./screens/Signing'), 'Signing');
const Dashboard = lazyNamed(() => import('./screens/Dashboard'), 'Dashboard');
const Profile = lazyNamed(() => import('./screens/Profile'), 'Profile');
const Training = lazyNamed(() => import('./screens/Training'), 'Training');
const Schedule = lazyNamed(() => import('./screens/Schedule'), 'Schedule');
const Stats = lazyNamed(() => import('./screens/Stats'), 'Stats');
const Locker = lazyNamed(() => import('./screens/Locker'), 'Locker');
const Contracts = lazyNamed(() => import('./screens/Contracts'), 'Contracts');
const Trades = lazyNamed(() => import('./screens/Trades'), 'Trades');
const Standings = lazyNamed(() => import('./screens/Standings'), 'Standings');
const News = lazyNamed(() => import('./screens/News'), 'News');
const Awards = lazyNamed(() => import('./screens/Awards'), 'Awards');
const History = lazyNamed(() => import('./screens/History'), 'History');
const Retirement = lazyNamed(() => import('./screens/Retirement'), 'Retirement');
const Achievements = lazyNamed(() => import('./screens/Achievements'), 'Achievements');
const Daily = lazyNamed(() => import('./screens/Daily'), 'Daily');
const Saves = lazyNamed(() => import('./screens/Saves'), 'Saves');
const Settings = lazyNamed(() => import('./screens/Settings'), 'Settings');
const Gallery = lazyNamed(() => import('./screens/Gallery'), 'Gallery');

function NeedCareer({ children }: { children: ReactNode }) {
  const c = useCareer();
  if (!c) return <Navigate to="/" replace />;
  return <>{children}</>;
}

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
  const wrap = (el: ReactNode) => <NeedCareer><Layout>{el}</Layout></NeedCareer>;
  return (
    <ErrorBoundary>
      <HashRouter>
        <ScrollTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewCareer />} />
            <Route path="/start" element={<Start />} />
            <Route path="/play" element={<Play />} />
            {import.meta.env.DEV && <Route path="/gallery" element={<Gallery />} />}
            <Route path="/daily" element={<Layout><Daily /></Layout>} />
            <Route path="/saves" element={<Layout><Saves /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/achievements" element={<Layout><Achievements /></Layout>} />
            <Route path="/draft" element={wrap(<Draft />)} />
            <Route path="/signing" element={wrap(<Signing />)} />
            <Route path="/career" element={wrap(<Dashboard />)} />
            <Route path="/profile" element={wrap(<Profile />)} />
            <Route path="/training" element={wrap(<Training />)} />
            <Route path="/schedule" element={wrap(<Schedule />)} />
            <Route path="/stats" element={wrap(<Stats />)} />
            <Route path="/locker" element={wrap(<Locker />)} />
            <Route path="/contracts" element={wrap(<Contracts />)} />
            <Route path="/trades" element={wrap(<Trades />)} />
            <Route path="/standings" element={wrap(<Standings />)} />
            <Route path="/news" element={wrap(<News />)} />
            <Route path="/awards" element={wrap(<Awards />)} />
            <Route path="/history" element={wrap(<History />)} />
            <Route path="/retirement" element={wrap(<Retirement />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
