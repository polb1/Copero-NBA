import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Game screens are private per-player states, not content for search results.
const PRIVATE_ROUTE = /^\/(start|play|careers)(\/|$)/;

export const robotsFor = (pathname: string, fallback: string) => (PRIVATE_ROUTE.test(pathname) ? 'noindex, follow' : fallback);

export function RouteSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) return;
    meta.dataset.base ??= meta.content;
    meta.content = robotsFor(pathname, meta.dataset.base);
  }, [pathname]);
  return null;
}
