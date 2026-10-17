import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { store, useCareer, useStore } from '../store/store';
import { Icon } from './icons';
import { EventModal } from './EventModal';
import { PHASE_LABEL, MODE_LABEL } from './common';
import { userOf } from '../engine/career';
import { fullName } from '../engine/players';
import { fmtDate, seasonLabel } from '../engine/schedule';
import { inSeason } from '../engine/flow';
import * as api from '../engine/api';
import type { Career } from '../engine/types';

const NAV: { group: string; items: { to: string; label: string; icon: string }[] }[] = [
  { group: 'Carrera', items: [
    { to: '/career', label: 'Panel principal', icon: 'dash' },
    { to: '/profile', label: 'Perfil del jugador', icon: 'user' },
    { to: '/training', label: 'Desarrollo', icon: 'dumbbell' },
    { to: '/schedule', label: 'Calendario', icon: 'calendar' },
    { to: '/stats', label: 'Estadísticas', icon: 'chart' },
  ] },
  { group: 'Club', items: [
    { to: '/locker', label: 'Vestuario', icon: 'people' },
    { to: '/contracts', label: 'Contratos y agencia', icon: 'contract' },
    { to: '/trades', label: 'Traspasos y ofertas', icon: 'swap' },
    { to: '/standings', label: 'Clasificación', icon: 'table' },
  ] },
  { group: 'Legado', items: [
    { to: '/news', label: 'Noticias', icon: 'news' },
    { to: '/awards', label: 'Premios y récords', icon: 'trophy' },
    { to: '/history', label: 'Historial', icon: 'history' },
    { to: '/achievements', label: 'Logros', icon: 'medal' },
  ] },
  { group: 'Juego', items: [
    { to: '/daily', label: 'Desafío diario', icon: 'sun' },
    { to: '/saves', label: 'Partidas', icon: 'save' },
    { to: '/settings', label: 'Ajustes', icon: 'gear' },
  ] },
];

export function nextAction(c: Career): { label: string; to?: string; run?: () => void; icon: string } | null {
  switch (c.phase) {
    case 'predraft':
      return c.predraft?.step === 'season' ? null : { label: 'Continuar el proceso del draft', to: '/draft', icon: 'arrow' };
    case 'signing':
      return { label: 'Elegir equipo y contrato', to: '/signing', icon: 'contract' };
    case 'preseason':
      return { label: 'Comenzar la temporada', run: () => store.act(api.startRegularSeason), icon: 'play' };
    case 'season-end':
      return { label: 'Pasar a la temporada baja', run: () => store.actAsync('Procesando la temporada baja…', api.beginOffseason), icon: 'forward' };
    case 'offseason':
      return api.needsContract(c) ? { label: 'Resolver tu contrato', to: '/contracts', icon: 'contract' } : { label: 'Empezar la pretemporada', run: () => store.act(api.startPreseason), icon: 'play' };
    case 'retired':
      return { label: 'Ver resumen final', to: '/retirement', icon: 'trophy' };
    default:
      return null;
  }
}

export function AdvanceBar({ compact }: { compact?: boolean }) {
  const c = useCareer();
  const busy = useStore((s) => s.busy);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!c || !inSeason(c) || c.pendingEvent || busy) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') store.act((x) => api.advance(x, 'game'));
      if (k === 'w') store.actAsync('Simulando la semana…', (x) => api.advance(x, 'week'));
      if (k === 'e') store.actAsync('Simulando hasta el próximo acontecimiento…', (x) => api.advance(x, 'event'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c, busy]);
  if (!c) return null;
  if (!inSeason(c)) {
    const na = nextAction(c);
    if (!na) return null;
    return <NextActionButton na={na} />;
  }
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      <button className="btn primary" onClick={() => store.act((x) => api.advance(x, 'game'))} title="Siguiente partido (N)">
        <Icon name="play" /> {compact ? 'Partido' : 'Siguiente partido'}
      </button>
      <button className="btn" onClick={() => store.actAsync('Simulando la semana…', (x) => api.advance(x, 'week'))} title="Avanzar una semana (W)">
        <Icon name="forward" /> Semana
      </button>
      <button className="btn hide-sm" onClick={() => store.actAsync('Simulando hasta el próximo acontecimiento…', (x) => api.advance(x, 'event'))} title="Hasta el próximo acontecimiento (E)">
        <Icon name="bolt" /> Hasta evento
      </button>
      <button className="btn ghost hide-sm" onClick={() => store.actAsync('Simulando el resto de la temporada…', (x) => api.advance(x, 'season'))} title="Simular hasta el final de la fase (se detiene en cada decisión)">
        <Icon name="skip" /> Fin de fase
      </button>
    </div>
  );
}

function NextActionButton({ na }: { na: NonNullable<ReturnType<typeof nextAction>> }) {
  const nav = useNavigate();
  return (
    <button className="btn primary" onClick={() => (na.run ? na.run() : na.to && nav(na.to))}>
      <Icon name={na.icon} /> {na.label}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const c = useCareer();
  const busy = useStore((s) => s.busy);
  const toasts = useStore((s) => s.toasts);
  const saveError = useStore((s) => s.saveError);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  if (!c) return <>{children}</>;
  const u = userOf(c);
  const date = c.league.day > 0 && (c.phase === 'regular' || c.phase === 'postseason' || c.phase === 'predraft') ? fmtDate(c.league.season, c.league.day) : seasonLabel(c.league.season);
  return (
    <div className="app">
      <a href="#main" className="sr-only">Saltar al contenido</a>
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Navegación principal">
        <NavLink to="/" className="brand" aria-label="Inicio">
          <div className="brand-mark"><Icon name="ball" size={20} /></div>
          <div className="brand-name">NBA <span>Legacy</span></div>
        </NavLink>
        <NavLink to="/play" className="nav-link"><Icon name="play" /> Vista simple</NavLink>
        {c.phase === 'predraft' && (
          <NavLink to="/draft" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon name="target" /> Proceso del draft <span className="dot" /></NavLink>
        )}
        {c.phase === 'signing' && (
          <NavLink to="/signing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon name="contract" /> Primer contrato <span className="dot" /></NavLink>
        )}
        {c.phase === 'retired' && (
          <NavLink to="/retirement" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon name="trophy" /> Resumen final <span className="dot" /></NavLink>
        )}
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-group">{g.group}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon name={it.icon} /> {it.label}
                {it.to === '/contracts' && c.phase === 'offseason' && c.offers.length > 0 && <span className="dot" />}
              </NavLink>
            ))}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="card flat" style={{ padding: 12, marginTop: 12 }}>
          <div className="tiny dim">{MODE_LABEL[c.mode]}</div>
          <div className="small" style={{ fontWeight: 600 }}>{fullName(u)}</div>
          <div className="tiny muted">{PHASE_LABEL[c.phase]}</div>
        </div>
      </aside>
      {open && <div className="overlay" style={{ zIndex: 65, background: 'rgba(0,0,0,.5)' }} onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="btn ghost sm" style={{ display: 'none' }} aria-label="Menú" onClick={() => setOpen(true)} id="menu-btn"><Icon name="menu" /></button>
          <div className="crumb">
            <small>{PHASE_LABEL[c.phase]} · {date}</small>
            <strong>{fullName(u)}</strong>
          </div>
          <div className="spacer" />
          <div className="hide-sm"><AdvanceBar /></div>
        </header>
        {saveError && <div className="card flat" style={{ margin: '12px 28px 0', borderColor: 'var(--bad)' }}><span className="bad small">No se pudo guardar en este navegador (almacenamiento lleno o bloqueado). Exporta la partida desde «Partidas».</span></div>}
        <main id="main" className="content">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación rápida">
        <NavLink to="/career" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="dash" />Panel</NavLink>
        <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="calendar" />Calendario</NavLink>
        <MobileAdvance />
        <NavLink to="/news" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="news" />Noticias</NavLink>
        <button onClick={() => setOpen(true)}><Icon name="menu" />Menú</button>
      </nav>
      <EventModal />
      {busy && <div className="busy" role="status" aria-live="polite"><div className="stack" style={{ alignItems: 'center', gap: 18 }}><div className="ball" /><span className="muted">{busy}</span></div></div>}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </div>
  );
}

function MobileAdvance() {
  const c = useCareer();
  const nav = useNavigate();
  if (!c) return null;
  if (inSeason(c)) return <button onClick={() => store.act((x) => api.advance(x, 'game'))} style={{ color: 'var(--accent)' }}><Icon name="play" />Jugar</button>;
  const na = nextAction(c);
  return <button onClick={() => (na?.run ? na.run() : na?.to && nav(na.to))} style={{ color: 'var(--accent)' }} disabled={!na}><Icon name={na?.icon ?? 'play'} />Seguir</button>;
}
