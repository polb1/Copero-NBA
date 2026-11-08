import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { leaguePath, LEAGUE_COUNTRY } from '../leagues';
import { MAIN_LEAGUES } from '../data';
import { useHubData } from '../data';

const THEME_KEY = 'anillero-theme';
const isDark = () =>
  document.documentElement.dataset.theme === 'dark' ||
  (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

/** Claro / oscuro. Se guarda en localStorage; index.html lo aplica antes de pintar para que no parpadee. */
function ThemeToggle() {
  const [dark, setDark] = useState(isDark);
  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* sin almacenamiento: solo esta visita */ }
    setDark(!dark);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={dark ? 'Tema claro' : 'Tema oscuro'}
      className="w-9 h-9 rounded-full border border-court-border bg-court-surface-elevated text-primary flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
    >
      <span className="material-symbols-outlined text-[20px]">{dark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  );
}

const NAV = [
  { to: '/', label: 'Partidos de Hoy' },
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

function Sidebar({ open }: { open: boolean }) {
  const { standings, leagues, loading } = useHubData();
  const { league: currentSlug } = useParams<{ league: string }>();
  const [q, setQ] = useState('');

  // Solo las ligas principales: el resto se retira del menú (punto 5 del feedback).
  const all = useMemo(() => {
    const names = [...new Set([...Object.keys(standings), ...Object.keys(leagues)])];
    const main = names.filter((n) => MAIN_LEAGUES.includes(n));
    return (main.length ? main : names).sort((a, b) => a.localeCompare(b));
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
        className={`flex items-center justify-between gap-2 px-space-sm py-2.5 xl:py-1.5 rounded transition-colors text-body-sm border-l-2 ${
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
    <aside id="hub-menu" className={`${open ? "block" : "hidden"} xl:block fixed left-0 right-0 xl:right-auto top-16 bottom-0 xl:w-64 bg-court-surface z-40 overflow-y-auto overscroll-contain`}>
      <div className="py-space-md px-space-sm flex flex-col gap-space-md">
        {/* en móvil el menú de cabecera no cabe: va aquí arriba */}
        <nav className="xl:hidden flex flex-col">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="px-space-sm py-3 text-body-lg text-text-primary border-b border-court-border">{n.label}</Link>
          ))}
          <a href="/jugadores" className="px-space-sm py-3 text-body-lg text-text-primary border-b border-court-border">Jugadores</a>
          <a href="/hall-of-fame" className="px-space-sm py-3 text-body-lg text-text-primary border-b border-court-border">Hall of Fame</a>
          <a href="/start" className="px-space-sm py-3 text-body-lg text-secondary border-b border-court-border">Reto del día</a>
        </nav>
        <div className="flex items-center justify-between px-space-sm py-space-xs rounded bg-court-surface-elevated">
          <span className="font-display text-label-table-header uppercase text-secondary tracking-widest">
            COMPETICIONES
          </span>
          <span className="font-mono text-data-mono text-live-red flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-tertiary" />{all.length} LIGAS
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
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);
  return (
    <div className="hub min-h-screen bg-court-surface-row text-on-surface font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-court-surface/95 backdrop-blur-md border-b border-court-border">
        <div className="w-full h-full px-space-lg flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-lg">
            <Link to="/" className="flex items-center gap-space-sm group">
              <div className="w-9 h-9 rounded bg-primary-container flex items-center justify-center text-on-primary-container group-hover:bg-secondary transition-colors">
                <span className="material-symbols-outlined text-[22px]">sports_basketball</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-headline-md font-bold tracking-wider uppercase text-text-primary leading-none">
                  ANILLERO
                </span>
                <span className="hidden sm:inline font-display text-label-table-header text-secondary tracking-widest uppercase">
                  ACTUALIDAD DE BALONCESTO
                </span>
              </div>
            </Link>
            <nav className="hidden xl:flex items-center gap-space-lg ml-space-md">
              {NAV.map((n) => <NavLink key={n.to} {...n} />)}
              {/* página estática generada en build: enlace normal, no de router */}
              <a href="/jugadores" className="font-display text-label-nav uppercase tracking-wider text-on-surface-variant hover:text-text-primary transition-colors">Jugadores</a>
              <a href="/hall-of-fame" className="font-display text-label-nav uppercase tracking-wider text-on-surface-variant hover:text-text-primary transition-colors">Hall of Fame</a>
              <a href="/start" className="font-display text-label-nav uppercase tracking-wider text-secondary hover:text-primary transition-colors">Reto del día</a>
            </nav>
          </div>
          <div className="flex items-center gap-space-sm sm:gap-space-md">
            <Link
              to="/play"
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded bg-primary-container text-on-primary font-display text-body-lg font-semibold hover:bg-secondary hover:text-on-secondary transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">casino</span>
              <span className="hidden sm:inline xl:hidden 2xl:inline">Jugar al Simulador</span>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="hub-menu"
              aria-label={menu ? "Cerrar menú" : "Abrir menú"}
              className="xl:hidden w-9 h-9 rounded-full border border-court-border bg-court-surface-elevated text-text-primary flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">{menu ? "close" : "menu"}</span>
            </button>
          </div>
        </div>
      </header>

      <Sidebar open={menu} />

      {/* Contenido */}
      <div className="xl:pl-64">
        <main className="relative pt-16 min-h-[calc(100vh-80px)] w-full px-space-lg py-space-lg bg-court-surface-row">
          {children}
        </main>
        <footer className="w-full bg-court-surface py-space-lg px-space-lg border-t border-court-border">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-space-md text-body-sm text-text-muted">
            <div className="flex items-center gap-space-sm">
              <span className="font-display text-headline-md font-bold uppercase text-text-primary">ANILLERO</span>
              <span className="text-text-dim">·</span>
              <span>Simulador de Temporada Regular, Play-In y Playoffs de Baloncesto</span>
            </div>
            <p className="m-0 basis-full text-text-dim">
              Datos no oficiales: resultados y clasificaciones de fuentes públicas (ESPN, EuroLeague, B.League y servicios de terceros) y noticias enlazadas desde los medios que las publican. Pueden contener errores o retrasos. Proyecto independiente, sin afiliación con la NBA ni con ninguna liga o club.
            </p>
            <div className="flex items-center gap-space-md">
              <a href="/anillos/campeones" className="hover:text-primary">Campeones NBA</a>
              <a href="/anillos/franquicias" className="hover:text-primary">Anillos por equipo</a>
              <a href="/legal/aviso-legal" className="hover:text-primary">Aviso legal</a>
              <a href="/legal/privacidad" className="hover:text-primary">Privacidad</a>
              <a href="/legal/cookies" className="hover:text-primary">Cookies</a>
              <a href="/legal/fuentes" className="hover:text-primary">Fuentes</a>
              <span className="text-text-dim">© 2026 Copero NBA</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
