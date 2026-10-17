import { useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { applySettings, lastSlotId, loadCareer, store, useCareer } from './store/store';
import { Home } from './screens/Home';
import { NewCareer } from './screens/NewCareer';
import { Draft } from './screens/Draft';
import { Signing } from './screens/Signing';
import { Dashboard } from './screens/Dashboard';
import { Profile } from './screens/Profile';
import { Training } from './screens/Training';
import { Schedule } from './screens/Schedule';
import { Stats } from './screens/Stats';
import { Locker } from './screens/Locker';
import { Contracts } from './screens/Contracts';
import { Trades } from './screens/Trades';
import { Standings } from './screens/Standings';
import { News } from './screens/News';
import { Awards } from './screens/Awards';
import { History } from './screens/History';
import { Retirement } from './screens/Retirement';
import { Achievements } from './screens/Achievements';
import { Daily } from './screens/Daily';
import { Saves } from './screens/Saves';
import { Settings } from './screens/Settings';

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
    <HashRouter>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewCareer />} />
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
    </HashRouter>
  );
}
