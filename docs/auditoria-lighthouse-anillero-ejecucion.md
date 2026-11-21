# Ejecución del plan Lighthouse — Anillero (2026-11-21)

Medición: Lighthouse 12.6.0 en local con `wrangler dev --local`, que se comporta como producción (Brotli, HTML prerenderizado, `_headers`). Son 3 pasadas por página y dispositivo y se toma la mediana.
- Base: commit 22ce51e, en el worktree `../anillero-base`. Resultados en `docs/lighthouse/2026-11-21-base/`.
- Nuevo: cambios de los bloques 0 a 4 sin commitear. Resultados en `docs/lighthouse/2026-11-21-bloques-0-1/`.
- El informe inicial queda intacto en `docs/lighthouse/2026-11-20-inicial/`.
- Comparar: `python docs/lighthouse/mediana.py docs/lighthouse/2026-11-21-base docs/lighthouse/2026-11-21-bloques-0-1`

Se descartaron dos bases que no eran válidas:
- La de `vite preview` sirve la SPA en las rutas estáticas y no comprime.
- Una copia de `dist` tenía assets rotos.

## Cambios
- **Bloque 0:**
  - `public/_headers`: caché inmutable para `/assets/*`; caché de un día para crests/flags/stock/icons; cabeceras HSTS, nosniff, Referrer-Policy y `frame-ancestors`.
  - `public/favicon.ico`: se quita el error 404 de la consola.
- **Bloque 1:**
  - Generadores estáticos (liga, anillos, legal, equipo): sin el CSS de la app y sin Material Symbols, que bloqueaban el pintado; fuentes con `display=optional`.
  - Subrayado de los enlaces dentro de párrafos.
  - Contraste: `--c-text-dim` y `.ini` del Hall of Fame.
  - Área táctil de `summary` en /jugadores.
  - `alt=""` en TeamBadge (es decorativo).
  - `h1` sr-only en la portada.
- **Bloque 3:** el fallback de Suspense pasa a `minHeight:100vh`.
- **Bloque 4:**
  - Títulos y canonical propios para auth, perfil y partido (`src/seo.ts`, con tests).
  - react-router-dom 6.30.6.
- Tests: 271 en verde. Build: OK.

## Resultados (mediana, base → nuevo)
| Página | Móvil P | Escritorio P | Accesibilidad |
|---|---|---|---|
| legal/aviso-legal | 89→99 | 81→100 (CLS 0.43→0) | 92→100 |
| legal/privacidad | 92→99 | 87→98 | 92→100 |
| liga/nba | 92→98 | 100 | 93→100 |
| liga/greek | 91→99 | 99 | 91→100 |
| anillos/campeones | 92→99 | 99→100 | 91→100 |
| hall-of-fame/1940s | 99→98 | 100 | 89→100 |
| jugadores | 94→95 | 100 | 81→100 (escritorio 90) |
| home | 58→60 (LCP 8.1→6.5 s) | 88 | 94→100 |
| noticias / resultados / calendario / estadísticas | ≈ igual (58–64) | ≈ igual | 94–95→100 |
| equipo, jugador, evergreen | 98–100 sin cambios | 100 | 100 |
| /en, /ca, /start, /careers | 0 (sin cambio) | 54–73 | — |

## Lo que no se ha resuelto
- **El CLS de /en, /ca, /start y /careers no ha mejorado:** sigue entre 1.0 y 2.0, así que el arreglo del bloque 3 no ha sido suficiente. Además, en móvil Lighthouse da «LCP nan» (NO_LCP) y puntúa 0. Hay que estudiar la traza de nuevo antes de tocar nada más. La lógica del simulador no se ha tocado.
- **TBT de la portada en móvil:** 369→639 ms. Hay mucha variación entre pasadas y no se puede atribuir a un cambio concreto. Queda pendiente medir `window.__HUB__` (P0-3).
- **La advertencia de JS heredado (R7):** viene del beacon de Cloudflare, no de nuestro build.
- **Comprobaciones aún sin hacer:** los 439 URLs del sitemap en local, el diff visual de las páginas SPA y las pruebas funcionales del simulador.

## Pendiente de tu autorización (no aplicado)
- **P0-1 hydrateRoot:**
  - El HTML estático de la portada tiene un diseño distinto al de React.
  - Generarían diferencias al hidratar el tema (localStorage/matchMedia), `new Date()` en `Home.tsx` y `Pages.tsx`, y la sesión que se pide en un efecto.
  - Requiere un `renderToString` en el build con los datos. Riesgo alto y ganancia alta en LCP.
- **P1-1 AdSense:** son anuncios automáticos en `index.html` y `404.html`. Propuesta: cargar el script tras `load` o tras la primera interacción. Puede reducir algo los ingresos.
- **P1-8 CSP:** una política completa con Turnstile y AdSense. Ahora mismo solo está `frame-ancestors`.
- **react-router v7:** sigue un aviso de `npm audit`, que solo se corrige con esta versión mayor.
- **P2-4 y P2-5:** estrategia de datos estructurados y contenido de las fichas.
- **Cloudflare:** activar «Always Use HTTPS» (lo haces tú).

## Corrección del CLS del simulador (2026-11-21-cls)
Causa: `.busy` (el indicador de carga del Suspense) es `position:fixed`, así que el `minHeight` que se le puso no reservaba sitio en la página. Solución: un envoltorio con `minHeight:100vh` (`src/App.tsx`).

| Ruta | CLS | Móvil P | Escritorio P |
|---|---|---|---|
| /en | 2.00→0 | 0→46 | 73→81 |
| /ca | 1.00→0 | 0→45 | 57→77 |
| /start | 1.00→0 | 0→42 | 55→81 |
| /careers | 2.00→0 | 0→66 | 0→89 |

En móvil queda el TBT alto (1–1,8 s), que es la carga del motor del juego. No se ha tocado la lógica del simulador.

## Search Console: Dataset
Search Console avisaba de que faltaban `creator` y `license` en las dos páginas de anillos. Se añaden en `scripts/gen-evergreen-pages.mjs`: autor «Wikipedia contributors» y licencia CC BY-SA 4.0.
