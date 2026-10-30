import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { applySettings, consolidateSaves, lastSlotId, loadCareer, store, useCareer } from './store/store';
import { Start } from './screens/simple/Start';
import { Play } from './screens/simple/Play';
import { Careers } from './screens/simple/Careers';
import { HubLayout } from './actualidad/components/HubLayout';
import { Home as HubHome } from './actualidad/pages/Home';
import { Noticias, Clasificaciones, Resultados, Calendario, Estadisticas } from './actualidad/pages/Pages';
import './actualidad/tailwind.css';

// Dev-only scene gallery loads on demand.
const lazyNamed = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const Gallery = lazyNamed(() => import('./screens/Gallery'), 'Gallery');

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** The app is just the game: straight into the current career, or into creating one. */
function Root() {
  const c = useCareer();
  return <Navigate to={c ? '/play' : '/start'} replace />;
}

function Loading() {
  return <div className="busy" role="status" aria-live="polite" style={{ background: 'transparent' }}><div className="ball" /></div>;
}

/** Loads the saved career before the first render, so the splash goes straight to the game (no blank frame). */
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  applySettings(store.get().settings);
  consolidateSaves();
  const id = lastSlotId();
  if (id) {
    const c = loadCareer(id);
    if (c) store.setCareer(c, false);
  }
}

export function App() {
  boot();
  return (
    <ErrorBoundary>
      <HashRouter>
        <ScrollTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Root />} />
            <Route path="/start" element={<Start />} />
            <Route path="/play" element={<Play />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/actualidad" element={<HubLayout><HubHome /></HubLayout>} />
            <Route path="/noticias" element={<HubLayout><Noticias /></HubLayout>} />
            <Route path="/clasificaciones" element={<HubLayout><Clasificaciones /></HubLayout>} />
            <Route path="/resultados" element={<HubLayout><Resultados /></HubLayout>} />
            <Route path="/calendario" element={<HubLayout><Calendario /></HubLayout>} />
            <Route path="/estadisticas" element={<HubLayout><Estadisticas /></HubLayout>} />
            {import.meta.env.DEV && <Route path="/gallery" element={<Gallery />} />}
            {/* Old links (detailed view, daily, saves, settings…) land on the game. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
