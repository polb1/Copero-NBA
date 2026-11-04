import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Game screens are private per-player states, not content for search results.
const PRIVATE_ROUTE = /^\/(start|play|careers)(\/|$)/;

const HUB_TITLES: Record<string, string> = {
  '/noticias': 'Noticias de baloncesto: NBA, EuroLeague y Liga ACB | Anillero · Modo Carrera',
  '/resultados': 'Resultados de baloncesto en directo | Anillero · Modo Carrera',
  '/calendario': 'Calendario de partidos de baloncesto | Anillero · Modo Carrera',
  '/estadisticas': 'Estadísticas de baloncesto: líderes NBA y Europa | Anillero · Modo Carrera',
};

export const titleFor = (pathname: string, fallback: string) => HUB_TITLES[pathname] ?? (pathname.startsWith('/liga/') ? 'Clasificación y resultados de la liga | Anillero · Modo Carrera' : fallback);

export const robotsFor = (pathname: string, fallback: string) => (PRIVATE_ROUTE.test(pathname) ? 'noindex, follow' : fallback);

export function RouteSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.dataset.baseTitle ??= document.title;
    document.title = titleFor(pathname, document.body.dataset.baseTitle);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical && pathname in HUB_TITLES) canonical.href = location.origin + pathname.replace(/\/$/, '');
    const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) return;
    meta.dataset.base ??= meta.content;
    meta.content = robotsFor(pathname, meta.dataset.base);
  }, [pathname]);
  return null;
}
