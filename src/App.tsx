import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { AchievementWatcher } from './ui/AchievementToast';
import { applySettings, consolidateSaves, lastSlotId, loadCareer, store, useCareer } from './store/store';
import { Start } from './screens/simple/Start';
import { Play } from './screens/simple/Play';
import { Careers } from './screens/simple/Careers';
import { HubLayout } from './actualidad/components/HubLayout';
import { RouteSeo } from './seo';
import { Home as HubHome } from './actualidad/pages/Home';
import { Noticias, Resultados, Calendario, Estadisticas } from './actualidad/pages/Pages';
import { LeaguePage } from './actualidad/pages/League';
import { Match } from './actualidad/pages/Match';
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

/** Language landings (/en/, /ca/) go straight into the game: the current career, or creating one. */
function GameEntry() {
  const c = useCareer();
  return <Navigate to={c ? '/play' : '/start'} replace />;
}

/** /play only makes sense with a career: without one, start creating it. */
function PlayEntry() {
  const c = useCareer();
  return c ? <Play /> : <Navigate to="/start" replace />;
}

/** Only reached by in-app navigation: direct visits to unknown URLs get the static 404 page. */
function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <h1>Esta página no existe</h1>
        <Link to="/">Ir a la portada</Link>
      </div>
    </main>
  );
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
      <BrowserRouter>
        <ScrollTop />
        <RouteSeo />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HubLayout><HubHome /></HubLayout>} />
            <Route path="/en" element={<GameEntry />} />
            <Route path="/ca" element={<GameEntry />} />
            <Route path="/start" element={<Start />} />
            <Route path="/play" element={<PlayEntry />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/actualidad" element={<Navigate to="/" replace />} />
            <Route path="/noticias" element={<HubLayout><Noticias /></HubLayout>} />
            <Route path="/clasificaciones" element={<Navigate to="/" replace />} />
            <Route path="/liga/:league" element={<HubLayout><LeaguePage /></HubLayout>} />
            <Route path="/partido/:id" element={<HubLayout><Match /></HubLayout>} />
            <Route path="/resultados" element={<HubLayout><Resultados /></HubLayout>} />
            <Route path="/calendario" element={<HubLayout><Calendario /></HubLayout>} />
            <Route path="/estadisticas" element={<HubLayout><Estadisticas /></HubLayout>} />
            {import.meta.env.DEV && <Route path="/gallery" element={<Gallery />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
            <AchievementWatcher />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
