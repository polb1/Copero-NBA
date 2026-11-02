import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Game screens are private per-player states, not content for search results.
const PRIVATE_ROUTE = /^\/(start|play|careers)(\/|$)/;

const HUB_TITLES: Record<string, string> = {
  '/noticias': 'Noticias de baloncesto: NBA, EuroLeague y Liga ACB | NBA Legacy',
  '/resultados': 'Resultados de baloncesto en directo | NBA Legacy',
  '/calendario': 'Calendario de partidos de baloncesto | NBA Legacy',
  '/estadisticas': 'Estadísticas de baloncesto: líderes NBA y Europa | NBA Legacy',
};

export const titleFor = (pathname: string, fallback: string) => HUB_TITLES[pathname] ?? (pathname.startsWith('/liga/') ? 'Clasificación y resultados de la liga | NBA Legacy' : fallback);

export const robotsFor = (pathname: string, fallback: string) => (PRIVATE_ROUTE.test(pathname) ? 'noindex, follow' : fallback);

export function RouteSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.body.dataset.baseTitle ??= document.title;
    document.title = titleFor(pathname, document.body.dataset.baseTitle);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical && pathname in HUB_TITLES) canonical.href = `${location.origin}${pathname}/`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) return;
    meta.dataset.base ??= meta.content;
    meta.content = robotsFor(pathname, meta.dataset.base);
  }, [pathname]);
  return null;
}
