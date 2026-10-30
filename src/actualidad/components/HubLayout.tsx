import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { leaguePath, LEAGUE_COUNTRY } from '../leagues';
import { useHubData } from '../data';

const NAV = [
  { to: '/actualidad', label: 'Partidos de Hoy' },
  { to: '/noticias', label: 'Noticias' },
  { to: '/resultados', label: 'Resultados' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/estadisticas', label: 'Estadísticas' },
];

const FEATURED = ['NBA', 'EuroLeague', 'B.League', 'Liga ACB'];

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`font-display text-label-table-header font-semibold uppercase tracking-wider transition-colors py-space-sm border-b-2 ${
        active ? 'text-primary border-primary-container' : 'text-on-surface-variant border-transparent hover:text-on-surface'
      }`}
    >
      {label}
    </Link>
  );
}

function Sidebar() {
  const { standings, leagues, loading } = useHubData();
  const { league: currentSlug } = useParams<{ league: string }>();
  const [q, setQ] = useState('');

  const all = useMemo(() => {
    const names = [...new Set([...Object.keys(standings), ...Object.keys(leagues)])];
    return names.sort((a, b) => a.localeCompare(b));
  }, [standings, leagues]);

  const featured = FEATURED
    .map((f) => all.find((n) => n.toLowerCase() === f.toLowerCase()))
    .filter((n): n is string => Boolean(n));
  const rest = all
    .filter((n) => !featured.includes(n))
    .filter((n) => !q || n.toLowerCase().includes(q.toLowerCase()));

  const item = (name: string) => {
    const active = leaguePath(name) === `/liga/${currentSlug || ''}`;
    return (
      <Link
        key={name}
        to={leaguePath(name)}
        className={`flex items-center justify-between gap-2 px-space-sm py-1.5 rounded transition-colors text-body-sm border-l-2 ${
          active
            ? 'bg-primary-container/20 text-primary border-primary-container'
            : 'text-on-surface-variant border-transparent hover:bg-court-surface-elevated hover:text-on-surface'
        }`}
      >
        <span className="truncate">{name}</span>
        <span className="font-display text-label-table-header text-text-muted shrink-0">
          {LEAGUE_COUNTRY[name] || 'INT'}
        </span>
      </Link>
    );
  };

  return (
    <aside className="hidden xl:block fixed left-0 top-16 bottom-0 w-64 bg-court-surface z-40 overflow-y-auto">
      <div className="py-space-md px-space-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between px-space-sm py-space-xs rounded bg-court-surface-elevated">
          <span className="font-display text-label-table-header uppercase text-secondary tracking-widest">
            COMPETICIONES
          </span>
          <span className="font-mono text-data-mono text-live-red flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-live-red animate-pulse" />EN VIVO
          </span>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar liga…"
          className="w-full bg-court-surface-elevated border border-court-border rounded px-space-sm py-1.5 text-body-sm text-text-primary outline-none focus:border-primary-container"
        />

        <nav className="flex flex-col gap-space-lg">
          <div className="flex flex-col gap-0.5">
            <div className="px-space-sm py-space-xs text-text-muted font-display text-label-table-header uppercase tracking-wider">
              Destacado
            </div>
            {featured.map(item)}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-space-sm py-space-xs text-text-muted">
              <span className="font-display text-label-table-header uppercase tracking-wider">
                Todas las ligas
              </span>
              <span className="font-display text-label-table-header">{loading ? '…' : all.length}</span>
            </div>
            {rest.map(item)}
            {!loading && rest.length === 0 && (
              <span className="px-space-sm text-body-sm text-text-dim">Sin coincidencias</span>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
}

export function HubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-court-surface-row text-on-surface font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-court-surface/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.3)]">
        <div className="w-full h-full px-space-lg flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-lg">
            <Link to="/actualidad" className="flex items-center gap-space-sm group">
              <div className="w-9 h-9 rounded bg-primary-container flex items-center justify-center text-on-primary-container group-hover:bg-secondary transition-colors">
                <span className="material-symbols-outlined text-[22px]">sports_basketball</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-headline-md font-bold tracking-wider uppercase text-text-primary leading-none">
                  COPERO NBA
                </span>
                <span className="font-display text-label-table-header text-secondary tracking-widest uppercase">
                  ANILLERO LIVE HUB
                </span>
              </div>
            </Link>
            <nav className="hidden xl:flex items-center gap-space-lg ml-space-md">
              {NAV.map((n) => <NavLink key={n.to} {...n} />)}
            </nav>
          </div>
          <div className="flex items-center gap-space-md">
            <Link
              to="/"
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded bg-primary-container text-on-primary font-display text-headline-md font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(255,107,26,0.35)] hover:bg-secondary hover:text-on-secondary transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">casino</span>
              <span className="hidden sm:inline">Jugar al Simulador</span>
            </Link>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <Sidebar />

      {/* Contenido */}
      <div className="xl:pl-64">
        <main className="relative pt-16 min-h-[calc(100vh-80px)] w-full px-space-lg py-space-lg bg-court-surface-row">
          {children}
        </main>
        <footer className="w-full bg-court-surface py-space-lg px-space-lg border-t border-court-border">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-space-md text-body-sm text-text-muted">
            <div className="flex items-center gap-space-sm">
              <span className="font-display text-headline-md font-bold uppercase text-text-primary">COPERO NBA</span>
              <span className="text-text-dim">·</span>
              <span>Simulador de Temporada Regular, Play-In y Playoffs de Baloncesto</span>
            </div>
            <div className="flex items-center gap-space-md">
              <span>Términos y Condiciones</span>
              <span>Privacidad</span>
              <span>Reglas del Juego</span>
              <span className="text-text-dim">© 2026 Copero NBA</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
