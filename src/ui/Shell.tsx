import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useCareer, useStore } from '../store/store';
import { Icon } from './icons';

/** Light frame for secondary pages (achievements, saves, settings, daily challenge). */
export function Shell({ children }: { children: ReactNode }) {
  const c = useCareer();
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="shell">
      <header className="shell-top">
        <Link to="/" className="brand" aria-label="Inicio">
          <div className="brand-mark"><Icon name="ball" size={18} /></div>
          <div className="brand-name">NBA <span>Legacy</span></div>
        </Link>
        <nav className="shell-nav" aria-label="Secciones">
          {c && <NavLink to="/play" className="shell-link play"><Icon name="play" /> <span>Volver al juego</span></NavLink>}
          <NavLink to="/daily" className="shell-link"><Icon name="sun" /> <span>Diario</span></NavLink>
          <NavLink to="/achievements" className="shell-link"><Icon name="medal" /> <span>Logros</span></NavLink>
          <NavLink to="/saves" className="shell-link"><Icon name="save" /> <span>Partidas</span></NavLink>
          <NavLink to="/settings" className="shell-link"><Icon name="gear" /> <span>Ajustes</span></NavLink>
        </nav>
      </header>
      <main className="shell-main">{children}</main>
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </div>
  );
}
