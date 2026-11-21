import { createApp } from './api';
import type { Env } from './types';

const app = createApp();

// Rutas que solo existen en la SPA (sin HTML pregenerado): se sirven con index.html.
// El resto de URLs desconocidas caen en 404.html con estado 404 (not_found_handling: 404-page).
const SPA_ONLY = /^\/(auth\/|verify-email$|perfil$|partido\/.+)/;

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const { pathname, hostname } = new URL(request.url);
    // panel.anillero.com: su portada es el Control Center. En el resto de hosts, "/" es la portada pública.
    if (pathname === '/') return hostname.startsWith('panel.') ? Response.redirect(new URL('/control-center', request.url).toString(), 302) : env.ASSETS.fetch(request);
    if (SPA_ONLY.test(pathname)) return env.ASSETS.fetch(new URL('/', request.url));
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
