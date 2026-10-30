import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/actualidad', label: 'Partidos de Hoy' },
  { to: '/noticias', label: 'Noticias' },
  { to: '/clasificaciones', label: 'Clasificaciones' },
  { to: '/resultados', label: 'Resultados' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/estadisticas', label: 'Estadísticas' },
];

const SIDEBAR = [
  {
    title: 'DESTACADO',
    items: [
      { label: 'NBA Este', tag: 'USA', to: '/clasificaciones?liga=NBA' },
      { label: 'NBA Oeste', tag: 'USA', to: '/clasificaciones?liga=NBA' },
      { label: 'EuroLeague', tag: 'EUR', to: '/clasificaciones?liga=EU' },
      { label: 'B.League', tag: 'JPN', to: '/clasificaciones?liga=B.League' },
      { label: 'Liga ACB', tag: 'ESP', to: '/clasificaciones?liga=Liga%20ACB' },
    ],
  },
  {
    title: 'INTERNACIONAL',
    items: [
      { label: 'EuroLeague', tag: '18 EQ', to: '/clasificaciones?liga=EU' },
      { label: 'EuroCup', tag: '20 EQ', to: '/clasificaciones' },
      { label: 'BCL', tag: 'FIBA', to: '/clasificaciones' },
    ],
  },
  {
    title: 'AMÉRICA',
    items: [
      { label: 'NBA', tag: '30 EQ', to: '/clasificaciones?liga=NBA' },
      { label: 'G-League', tag: 'USA', to: '/clasificaciones' },
      { label: 'BCLA', tag: 'AMER', to: '/clasificaciones' },
    ],
  },
  {
    title: 'LIGAS NACIONALES',
    items: [
      { label: 'ACB España', tag: '18 EQ', to: '/clasificaciones?liga=Liga%20ACB' },
      { label: 'Lega Basket Italia', tag: '16 EQ', to: '/clasificaciones?liga=Lega%20Basket%20Serie%20A' },
      { label: 'BBL Alemania', tag: '18 EQ', to: '/clasificaciones?liga=Basketball%20Bundesliga' },
    ],
  },
];

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`font-display text-label-table-header font-semibold uppercase tracking-wider transition-colors py-space-sm border-b-2 ${
        active
          ? 'text-primary border-primary-container'
          : 'text-on-surface-variant border-transparent hover:text-on-surface'
      }`}
    >
      {label}
    </Link>
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

      {/* Sidebar */}
      <aside className="hidden xl:block fixed left-0 top-16 bottom-0 w-64 bg-court-surface z-40 overflow-y-auto">
        <div className="py-space-md px-space-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between px-space-sm py-space-xs rounded bg-court-surface-elevated">
            <span className="font-display text-label-table-header uppercase text-secondary tracking-widest">
              TORNEOS ACTIVOS
            </span>
            <span className="font-mono text-data-mono text-live-red flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-live-red animate-pulse" />EN VIVO
            </span>
          </div>
          <nav className="flex flex-col gap-space-lg">
            {SIDEBAR.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-space-sm py-space-xs text-text-muted">
                  <span className="font-display text-label-table-header uppercase tracking-wider">
                    {group.title}
                  </span>
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={group.title + item.label}
                      to={item.to}
                      className="flex items-center justify-between px-space-sm py-1.5 rounded text-on-surface-variant hover:bg-court-surface-elevated hover:text-on-surface transition-colors text-body-sm"
                    >
                      <span className="font-body text-body-sm">{item.label}</span>
                      <span className="font-display text-label-table-header text-text-muted">{item.tag}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

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
