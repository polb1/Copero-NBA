# Auditoría Lighthouse de Anillero.com: informe inicial

**Fecha:** 20/11/2026
**Estado:** solo diagnóstico. Desde que empezó esta auditoría no he cambiado código.
**Resultados brutos:** `docs/lighthouse/2026-11-20-inicial/`, con 100 JSON de Lighthouse 12.6.0 (una pasada por URL y dispositivo).

> **Aviso:** antes de la auditoría subí el commit 22ce51e, que corrige los errores rojos, mete los datos de la portada en el HTML y aligera el JS principal. Estas mediciones ya lo incluyen. En la portada parece que el TBT en móvil ha empeorado: 944 ms ahora frente a 390 ms antes. Lo trato en P0-3.

---

## 1. Resumen ejecutivo

| | Móvil | Escritorio |
|---|---:|---:|
| URLs medidas | 50 | 50 |
| Con las 4 categorías ≥ 90 | **24 (48 %)** | **31 (62 %)** |
| Rendimiento < 90 | 16 | 9 |
| Accesibilidad < 90 | 10 | 10 |
| Buenas prácticas < 90 | 0 | 0 |
| SEO < 90 | 2 (`/start` y `/careers`, que llevan `noindex` a propósito) | 2 |

**Conclusión:** las páginas estáticas que salen del build van bien. Jugadores, equipos, jugadores históricos y landings sacan entre 94 y 100 en rendimiento.

Los problemas se concentran en dos grupos:

1. **Páginas que pinta React (SPA):** la portada, `/noticias`, `/resultados`, `/calendario`, `/estadisticas`, `/en`, `/ca`, `/start`, `/careers` y `/auth/login`.
   - En móvil sacan entre 21 y 68 de rendimiento.
   - El LCP va de 5,4 a 9,2 s.
   - En casi todas, el 93 % del LCP es *render delay*: la página no muestra el contenido hasta que termina el JS.
2. **Accesibilidad por contraste:** el gris `text-dim` del hub y las iniciales `.ini` de los jugadores históricos no llegan al contraste mínimo. Por eso los jugadores históricos se quedan en 89 y `/jugadores` en 81.

**Datos reales de usuarios (CrUX/INP):** no hay. La API de CrUX responde 403 y PageSpeed Insights ha agotado su cuota sin devolver datos de campo, lo normal en un dominio nuevo con poco tráfico.
- Este informe usa solo datos de laboratorio, y **el TBT no equivale al INP**.
- Cuando haya tráfico, el informe «Core Web Vitals» de Search Console dará el INP real.

---

## 2. Investigación del proyecto (fase 1)

- **Stack:**
  - React 18 y Vite multipágina, con Tailwind en el hub y CSS propio en el juego.
  - Un Worker de Cloudflare con Hono, Drizzle, D1 y Better Auth para `/api` y `/c`.
  - Cloudflare Workers Static Assets sirve todo lo demás.
- **Build** (`package.json`): primero `vite build` y luego 13 generadores (`scripts/gen-*.mjs` y `.py`). Producen unas 9.085 páginas HTML estáticas: jugadores, equipos, ligas, jugadores históricos, landings y legales.
- **Despliegue:** Workers Builds publica solo al hacer push a `main` (anillero.com) y a `pre` (pre.anillero.com, con `noindex`). Tarda unos 3–4 minutos.
- **Git:**
  - `main` está al día con `origin`. Hay además las ramas `pre`, `dario` y `feat/site-url`.
  - Hay dos archivos de datos modificados por el build: `public/data/hall-of-fame.json` y `player-slugs.json`.
  - Sin seguimiento: los `auditoria-*.xlsx/.md` y `videos-demo/`.
- **Terceros:**
  - Google AdSense (`adsbygoogle.js`) en las 14 plantillas de Vite. En la portada pesa 221 KB y ocupa unos 700 ms del hilo principal en móvil.
  - Cloudflare Web Analytics en todas las páginas.
  - Google Fonts: Barlow Condensed, Inter, Source Serif 4 y Material Symbols.
- **Servidor:**
  - Bien: el TTFB es de unos 0,1 s, la compresión Brotli está activa y HTTPS funciona.
  - Mal: `http://` no redirige a `https://` (se activa en el panel de Cloudflare).
- **Caché:** `/assets/*` lleva hash en el nombre pero se sirve con `Cache-Control: max-age=0`. No existe `public/_headers`.
- **Imágenes:** `public/crests` ocupa 4 MB y `public/stock` 2,7 MB, todo en PNG/JPG, sin WebP ni AVIF. La más pesada es `stock/nba-curry.jpg`, con 332 KB.
- **Dependencias** (`npm audit --omit=dev`): 12 avisos.
  - El único que afecta a producción es **react-router-dom** (gravedad alta, *open redirect*).
  - El resto son herramientas de build y desarrollo: vite, vitest, drizzle-kit, postcss y esbuild.

## 3. Inventario de páginas (fase 1)

| Grupo | Rutas | Cuántas | Cómo se generan | Indexable |
|---|---|---:|---|---|
| Portada | `/` | 1 | Vite y `gen-portal-home.mjs`; React la reemplaza | Sí |
| Hub SPA | `/noticias`, `/resultados`, `/calendario`, `/estadisticas` | 4 | HTML pregenerado; React lo reemplaza | Sí |
| Ligas | `/liga/{nba, liga-acb, euroleague, greek-basket-league, basketbol-super-ligi, b-league}` | 6 | `gen-league-pages.mjs` | Sí |
| Equipos | `/equipo/*` | 112 | `gen-team-pages.mjs` | Sí |
| Jugadores | `/jugador/*` | 290 en el sitemap, unas 6.650 en total | `gen-player-pages.py` | Solo las del sitemap |
| Jugadores históricos | `/hall-of-fame` y `/hall-of-fame/{1940s…2020s}` | 10 | `gen-hall-of-fame.mjs` | Sí |
| Índice de jugadores | `/jugadores` | 1 | `gen-players-index.mjs` | Sí |
| Landings del juego | `/en`, `/ca`, `/simulador-baloncesto` | 3 | `gen-pages.mjs` y React | Sí |
| Contenido evergreen | `/mejores-simuladores-baloncesto`, `/en/best-basketball-simulators`, `/manager-de-baloncesto`, `/en/basketball-manager`, `/juegos-de-baloncesto-online`, `/en/basketball-games-online`, `/anillos/campeones`, `/anillos/franquicias` | 8 | `gen-intent-pages` y `gen-evergreen-pages` | Sí |
| Legales | `/legal/{aviso-legal, cookies, fuentes, privacidad}` | 4 | `gen-legal-pages.mjs` | Sí |
| Juego | `/start`, `/play`, `/careers` | 3 | SPA (`GameShell`) | No (privadas) |
| Partidos | `/partido/:id` | dinámicas | SPA | No |
| Cuenta | `/auth/{login, register, callback, forgot-password, reset-password}`, `/verify-email`, `/perfil` | 7 | SPA con carga diferida | No |
| API | `/api/*`, `/c/:id` | — | Worker (Hono) | No |
| Página 404 | cualquier otra ruta | — | `public/404.html`, con estado 404 | No |

**Qué he medido con Lighthouse:**
- las 22 páginas únicas;
- todas las ligas (6) y todas las páginas de jugadores históricos (10);
- una muestra al azar de 5 jugadores y 5 equipos, porque comparten plantilla;
- `/start`, `/careers` y `/auth/login`.

**Rastreo:**
- Las 439 URLs del sitemap dan 200.
- Los 6.303 enlaces internos funcionan.
- No hay canonical que apunte a otra URL ni ninguna página del sitemap con `noindex`.

## 4. Resultados de Lighthouse por página (fase 2)

Las columnas son Rendimiento / Accesibilidad / Buenas prácticas / SEO. En **negrita**, lo que está por debajo de 90. LCP en segundos, TBT en milisegundos y CLS sin unidad.

| Página | Móvil P / A / BP / SEO | LCP · TBT · CLS (móvil) | Escritorio P / A / BP / SEO | LCP · TBT · CLS (escritorio) |
|---|---|---|---|---|
| `/` | **53** / 94 / 100 / 100 | 6.8 s · 944 ms · 0.00 | **75** / 94 / 100 / 100 | 1.9 s · 363 ms · 0.02 |
| `/anillos/campeones` | **89** / 91 / 96 / 100 | 2.9 s · 0 ms · 0.04 | 100 / 91 / 96 / 100 | 0.7 s · 0 ms · 0.00 |
| `/anillos/franquicias` | 90 / 91 / 96 / 100 | 2.9 s · 0 ms · 0.04 | 100 / 91 / 96 / 100 | 0.7 s · 0 ms · 0.00 |
| `/auth/login` | **65** / 91 / 100 / 92 | 7.4 s · 200 ms · 0.04 | 92 / 91 / 100 / 92 | 1.7 s · 2 ms · 0.01 |
| `/ca` | **26** / 99 / 100 / 100 | 8.8 s · 734 ms · 2.00 | **64** / 99 / 100 / 100 | 2.0 s · 67 ms · 1.65 |
| `/calendario` | **68** / 95 / 100 / 100 | 7.4 s · 299 ms · 0.01 | 90 / 95 / 100 / 100 | 2.0 s · 0 ms · 0.00 |
| `/careers` | **21** / 100 / 100 / **66** | 7.4 s · 858 ms · 1.00 | **64** / 95 / 100 / **66** | 1.9 s · 100 ms · 1.44 |
| `/en` | **53** / 99 / 100 / 100 | 8.8 s · 488 ms · 0.00 | **61** / 99 / 100 / 100 | 2.4 s · 16 ms · 1.64 |
| `/en/basketball-games-online` | 100 / 100 / 96 / 100 | 0.9 s · 34 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/en/basketball-manager` | 99 / 100 / 96 / 100 | 1.0 s · 132 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/en/best-basketball-simulators` | 98 / 93 / 100 / 100 | 1.0 s · 158 ms · 0.00 | 99 / 93 / 100 / 100 | 0.9 s · 14 ms · 0.00 |
| `/equipo/besiktas-istanbul` | 99 / 93 / 96 / 100 | 2.1 s · 1 ms · 0.00 | 100 / 93 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/equipo/karditsa` | 99 / 100 / 96 / 100 | 2.0 s · 23 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/equipo/mykonos` | **82** / 100 / 96 / 100 | 2.1 s · 671 ms · 0.00 | 99 / 100 / 96 / 100 | 0.6 s · 86 ms · 0.00 |
| `/equipo/olympiacos` | 99 / 100 / 96 / 100 | 2.0 s · 106 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/equipo/utsunomiya-brex` | 100 / 93 / 96 / 100 | 1.9 s · 49 ms · 0.00 | 100 / 93 / 96 / 100 | 0.5 s · 0 ms · 0.00 |
| `/estadisticas` | **66** / 94 / 100 / 100 | 5.4 s · 240 ms · 0.01 | **88** / 94 / 100 / 100 | 2.2 s · 5 ms · 0.01 |
| `/hall-of-fame` | 99 / 100 / 96 / 100 | 2.1 s · 50 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/hall-of-fame/1940s` | 94 / **89** / 96 / 100 | 2.1 s · 269 ms · 0.00 | 100 / **89** / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/hall-of-fame/1950s` | 97 / **89** / 96 / 100 | 2.0 s · 166 ms · 0.00 | 100 / **89** / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/hall-of-fame/1960s` | 99 / **89** / 96 / 100 | 2.0 s · 2 ms · 0.00 | 100 / **89** / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/hall-of-fame/1970s` | 94 / **89** / 96 / 100 | 2.2 s · 241 ms · 0.00 | 100 / **89** / 96 / 100 | 0.6 s · 2 ms · 0.00 |
| `/hall-of-fame/1980s` | 97 / **89** / 96 / 100 | 2.2 s · 143 ms · 0.00 | 100 / **89** / 96 / 100 | 0.7 s · 3 ms · 0.00 |
| `/hall-of-fame/1990s` | 96 / **89** / 96 / 100 | 2.2 s · 194 ms · 0.00 | 100 / **89** / 96 / 100 | 0.7 s · 43 ms · 0.00 |
| `/hall-of-fame/2000s` | 96 / **89** / 96 / 100 | 2.2 s · 178 ms · 0.00 | 100 / **89** / 96 / 100 | 0.7 s · 5 ms · 0.00 |
| `/hall-of-fame/2010s` | 98 / **89** / 96 / 100 | 2.1 s · 119 ms · 0.00 | 100 / **89** / 96 / 100 | 0.7 s · 0 ms · 0.00 |
| `/hall-of-fame/2020s` | 97 / **89** / 96 / 100 | 2.1 s · 178 ms · 0.00 | 100 / **89** / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/juegos-de-baloncesto-online` | 94 / 100 / 96 / 100 | 2.1 s · 252 ms · 0.00 | 100 / 100 / 96 / 100 | 0.3 s · 0 ms · 0.00 |
| `/jugador/bam-adebayo` | 100 / 100 / 96 / 100 | 1.7 s · 24 ms · 0.00 | 100 / 100 / 96 / 100 | 0.3 s · 0 ms · 0.00 |
| `/jugador/brandon-miller` | 100 / 100 / 96 / 100 | 1.9 s · 20 ms · 0.00 | 100 / 100 / 96 / 100 | 0.5 s · 0 ms · 0.00 |
| `/jugador/dell-curry` | 100 / 100 / 96 / 100 | 1.7 s · 20 ms · 0.00 | 100 / 100 / 96 / 100 | 0.3 s · 0 ms · 0.00 |
| `/jugador/ken-johnson-2730` | 100 / 100 / 96 / 100 | 1.7 s · 27 ms · 0.00 | 100 / 100 / 96 / 100 | 0.3 s · 0 ms · 0.00 |
| `/jugador/marques-johnson` | 100 / 100 / 96 / 100 | 1.9 s · 22 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/jugadores` | 96 / **81** / 96 / 100 | 2.3 s · 148 ms · 0.00 | 100 / **81** / 96 / 100 | 0.8 s · 0 ms · 0.00 |
| `/legal/aviso-legal` | **87** / 92 / 96 / 100 | 2.9 s · 0 ms · 0.11 | **81** / 92 / 96 / 100 | 0.6 s · 0 ms · 0.38 |
| `/legal/cookies` | 90 / 100 / 96 / 100 | 2.9 s · 0 ms · 0.03 | 98 / 100 / 96 / 100 | 0.9 s · 0 ms · 0.00 |
| `/legal/fuentes` | 90 / 92 / 96 / 100 | 2.9 s · 0 ms · 0.03 | 97 / 92 / 96 / 100 | 1.0 s · 0 ms · 0.01 |
| `/legal/privacidad` | 90 / 92 / 96 / 100 | 2.9 s · 0 ms · 0.00 | **86** / 92 / 96 / 100 | 0.9 s · 0 ms · 0.25 |
| `/liga/b-league` | 90 / 93 / 96 / 100 | 2.9 s · 0 ms · 0.02 | 98 / 93 / 96 / 100 | 0.9 s · 0 ms · 0.00 |
| `/liga/basketbol-super-ligi` | 98 / 91 / 96 / 100 | 1.8 s · 0 ms · 0.02 | 97 / 91 / 96 / 100 | 1.0 s · 0 ms · 0.02 |
| `/liga/euroleague` | **89** / 93 / 96 / 100 | 2.9 s · 0 ms · 0.05 | 98 / 93 / 96 / 100 | 0.9 s · 0 ms · 0.00 |
| `/liga/greek-basket-league` | **88** / 91 / 96 / 100 | 3.1 s · 0 ms · 0.02 | 98 / 91 / 96 / 100 | 0.9 s · 0 ms · 0.00 |
| `/liga/liga-acb` | 90 / 93 / 96 / 100 | 2.9 s · 0 ms · 0.03 | 98 / 93 / 96 / 100 | 0.9 s · 0 ms · 0.01 |
| `/liga/nba` | 90 / 93 / 96 / 100 | 2.9 s · 0 ms · 0.00 | 100 / 93 / 96 / 100 | 0.7 s · 0 ms · 0.02 |
| `/manager-de-baloncesto` | 99 / 100 / 96 / 100 | 1.9 s · 106 ms · 0.00 | 100 / 100 / 96 / 100 | 0.7 s · 0 ms · 0.00 |
| `/mejores-simuladores-baloncesto` | **68** / 93 / 100 / 100 | 4.1 s · 611 ms · 0.00 | 97 / 93 / 100 / 100 | 1.1 s · 24 ms · 0.00 |
| `/noticias` | **62** / 95 / 100 / 100 | 9.2 s · 206 ms · 0.00 | **81** / 95 / 100 / 100 | 2.4 s · 178 ms · 0.01 |
| `/resultados` | **65** / 95 / 100 / 100 | 5.6 s · 174 ms · 0.10 | 95 / 95 / 100 / 100 | 1.0 s · 0 ms · 0.10 |
| `/simulador-baloncesto` | 99 / 100 / 96 / 100 | 1.9 s · 123 ms · 0.00 | 100 / 100 / 96 / 100 | 0.6 s · 0 ms · 0.00 |
| `/start` | **46** / 99 / 100 / **69** | 8.1 s · 855 ms · 0.00 | **63** / 99 / 100 / **69** | 2.1 s · 10 ms · 1.64 |

**Sobre las mediciones:**
- Es una sola pasada por URL. Las páginas en el límite (88–90) pueden variar ±3 puntos entre pasadas. Antes de cerrar cada bloque mediré 3 veces y usaré la mediana.
- `/start` y `/careers` sacan 66–69 en SEO porque llevan `noindex` a propósito: son pantallas privadas del juego, no un fallo.

## 5. Diagnóstico técnico (fase 3)

### A. Rendimiento

| Id | Páginas | Causa real | Dónde |
|---|---|---|---|
| R1 | `/`, `/noticias`, `/resultados`, `/calendario`, `/estadisticas`, `/en`, `/ca`, `/start`, `/careers`, `/auth/login` | El LCP es un elemento que pinta React (en la portada, el H2 del partido destacado). Aparece solo cuando se han descargado y ejecutado unos 250 KB de JS y React ha montado. El HTML que se sirve antes tiene **otro diseño**, así que no cuenta como LCP. En la portada, el render delay es el 93 % del LCP: 6,4 s de 6,8 s. | `src/main.tsx` (`createRoot`, sin hidratación); `scripts/gen-portal-home.mjs` (el HTML estático tiene otro diseño); `src/actualidad/pages/*.tsx` |
| R2 | Portada en móvil | TBT de 944 ms y 1,65 s de JS sin atribuir; el propio HTML de la portada aparece con 1,4 s de arranque. Sospecho del bloque `window.__HUB__` que añadí en 22ce51e (datos que se procesan en el hilo principal), sumado a AdSense. Para confirmarlo hay que medir con y sin el bloque. | `scripts/gen-portal-home.mjs` (bloque `__HUB__`); `index.html` (AdSense) |
| R3 | Todas las plantillas de Vite | AdSense pesa 221 KB y tarda unos 410 ms en ejecutarse en la portada en móvil. Es el tercero que más cuesta. | `index.html`, `public/404.html` |
| R4 | `/en`, `/ca`, `/start`, `/careers` en escritorio | **CLS de 1,4 a 2,0**: la landing estática del `<body>` desaparece cuando React monta el juego y todo se desplaza. | `src/main.tsx` y el HTML de `gen-pages.mjs` |
| R5 | Ligas, legales y `/anillos/*` en móvil | LCP = FCP ≈ 2,9 s: la página no se pinta hasta que llegan el CSS principal (105 KB, unos 22 KB sin usar) y la hoja de Material Symbols de Google Fonts. | `dist/assets/main-*.css` y el enlace a Material Symbols en las plantillas |
| R6 | Todas | `/assets/*` lleva hash pero se sirve con `max-age=0`, así que cada visita vuelve a validar el JS y el CSS. | Falta `public/_headers` |
| R7 | Todas | Unos 10 KB por página de *polyfills* para navegadores antiguos (legacy-javascript). | Objetivo de build de Vite (`build.target`) |
| R8 | `/calendario` y equipos | Imágenes sin optimizar: en `/calendario` se pueden ahorrar 137 KB. Son escudos PNG grandes mostrados en miniatura. | `public/crests/*` |
| R9 | `/equipo/mykonos` en móvil | TBT de 671 ms en una página estática. Puede ser ruido de una sola pasada o un script de la plantilla; hay que repetir la medición. | `gen-team-pages.mjs` |
| R10 | `/legal/aviso-legal` y `/legal/privacidad` en escritorio | CLS de 0,25–0,38 cuando cambia la fuente de `<p>` y `<h1>`: Source Serif 4 llega tarde. | Plantilla de `gen-legal-pages.mjs`; fuentes sin `preload` ni `size-adjust` |

### B. Accesibilidad

| Id | Páginas | Problema | Dónde |
|---|---|---|---|
| A1 | 10 páginas de jugadores históricos y `/jugadores` | Contraste insuficiente en las iniciales `.ini` (3.635 elementos), que usan `color: var(--a-line3)` sobre la tarjeta. | `scripts/gen-hall-of-fame.mjs:47` y el CSS compartido de `/jugadores` |
| A2 | Hub (portada, calendario, estadísticas, resultados) | Contraste insuficiente del color `text-dim` en etiquetas y estados, como «FINAL» o las cabeceras de tabla. | `tailwind.config.js:44` (`--c-text-dim`) |
| A3 | Ligas, equipos, legales, `/anillos` y `/jugadores` | Los enlaces dentro del texto solo se distinguen por el color. | CSS compartido de los generadores (`a{text-decoration:none}`) |
| A4 | `/`, `/en`, `/ca`, `/start`, `/estadisticas` | El `alt` de los escudos repite el texto que tienen al lado. | `src/actualidad/components/TeamBadge`, `src/ui/ClubLogo` |
| A5 | `/jugadores` | Zonas táctiles demasiado pequeñas o demasiado juntas. | `gen-players-index.mjs` |
| A6 | Portada | Pierde el H1 cuando monta React (el HTML servido sí lo tiene). | `src/actualidad/pages/Home.tsx` |

### C. Buenas prácticas

| Id | Páginas | Problema | Dónde |
|---|---|---|---|
| B1 | 38 de 50 | Error de consola porque `/favicon.ico` da 404: las páginas generadas no declaran icono y el navegador lo pide por defecto. | Falta `public/favicon.ico` |
| B2 | `/auth/*` | La CSP bloquea `connect-src data:`, que Turnstile necesita. | Cabecera CSP de auth (`src/api.ts` o el Worker) |
| B3 | Todo el sitio | Faltan HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `frame-ancestors`. | Falta `public/_headers` |
| B4 | Producción | react-router-dom tiene una vulnerabilidad de gravedad alta (open redirect). | `package.json` |

### D. SEO

| Id | Páginas | Problema | Dónde |
|---|---|---|---|
| S1 | `/auth/login` | El canonical es incorrecto: hereda el de la portada. | `src/seo.ts` |
| S2 | `/auth/*`, `/perfil`, `/partido/*` | El título de la pestaña es el de la portada. | `src/seo.ts` (`titleFor`) |
| S3 | 179 páginas | Títulos de más de 60 caracteres. | Generadores de equipos y jugadores |
| S4 | 20 páginas | Sin datos estructurados (calendario, estadísticas, jugadores históricos). | Generadores |
| S5 | Fichas de jugador | Poco contenido (91 palabras de media). Es la causa probable de «Rastreada: sin indexar». | `gen-player-pages.py` |
| S6 | Todo el sitio | `http` no redirige a `https`, y la barra final redirige con 307 en vez de 301/308. | Panel de Cloudflare |

## 6. Plan priorizado (fase 4)

La columna «¿Autorización?» indica si el cambio la necesita según tus reglas.

### P0 — Crítico

| # | Problema | Solución | Impacto esperado | Riesgo | ¿Autorización? |
|---|---|---|---|---|---|
| P0-1 | R1: LCP de 6–9 s en las páginas SPA | Que el HTML servido tenga **el mismo diseño que React** y que React lo hidrate (`hydrateRoot`) en vez de borrarlo. Así el LCP pasa a ser el HTML inicial, casi igual al FCP. | Rendimiento en móvil de 50–65 a 85–95 en 10 páginas | **Alto**: cambia cómo arranca la app y afecta a la navegación y al juego | **Sí** (arquitectura) |
| P0-2 | R4: CLS de 1,4–2 en `/en`, `/ca`, `/start` y `/careers` | Reservar el espacio de la landing (altura mínima o el mismo contenedor) hasta que monte React, o hidratar la landing. | CLS ≤ 0,1 y entre 25 y 35 puntos más de rendimiento en escritorio | Medio | No, mientras no cambie el diseño |
| P0-3 | R2: TBT de 944 ms en la portada | Medir con y sin `__HUB__`. Si es la causa, pasar los datos como `<script type="application/json">`, que no se ejecuta como código, o volver al fetch con `preload`. | TBT ≤ 300 ms | Bajo | No |
| P0-4 | R6 y B3: sin caché ni cabeceras de seguridad | Crear `public/_headers`: caché `immutable` de un año en `/assets/*`, y HSTS, `nosniff`, `Referrer-Policy` y `frame-ancestors` en todo el sitio. | Visitas repetidas mucho más rápidas y mejor nota en buenas prácticas | Bajo. Un HSTS mal puesto es difícil de deshacer, así que empezaría con un `max-age` corto | No |

### P1 — Importante

| # | Problema | Solución | Riesgo | ¿Autorización? |
|---|---|---|---|---|
| P1-1 | R3: AdSense pesa en todas las páginas | Cargar AdSense más tarde (después del primer pintado o con `requestIdleCallback`), **sin quitarlo**. | Puede afectar a los ingresos y a la visibilidad de los anuncios | **Sí** (monetización) |
| P1-2 | R5: el CSS y las fuentes bloquean el pintado | Material Symbols y Google Fonts sin bloquear (`preload` + `display=swap`), CSS crítico en línea en las páginas generadas y quitar el CSS de Tailwind donde no se usa. | Bajo o medio: los iconos pueden parpadear | No |
| P1-3 | A1, A2 y A3: contraste y enlaces | Aclarar `--c-text-dim` y `.ini` lo justo para el contraste AA (4,5:1) y subrayar los enlaces dentro del texto. | Cambio visual leve | No, porque no es un cambio de diseño significativo |
| P1-4 | B1: favicon 404 | Añadir `public/favicon.ico` a partir del icono actual. | Ninguno | No |
| P1-5 | R10: CLS por fuentes en las legales | `preload` de la fuente y `size-adjust` o una fuente de respaldo ajustada. | Bajo | No |
| P1-6 | A6, S1 y S2: H1, canonical y títulos de las rutas SPA | H1 en `Home.tsx`; título y canonical por ruta en `seo.ts`. | Bajo | No |
| P1-7 | B4: vulnerabilidad de react-router | Actualizar react-router-dom a la versión corregida dentro de la misma versión mayor. | Bajo o medio (routing): hay que probar todas las rutas | No, es un parche menor |
| P1-8 | B2: CSP de auth | Añadir `data:` donde Turnstile lo necesita. | Bajo | **Sí** (toca la autenticación) |

### P2 — Mejora

| # | Problema | Solución | ¿Autorización? |
|---|---|---|---|
| P2-1 | R8: imágenes | Escudos en WebP, al tamaño al que se muestran y con `width`/`height`. | No |
| P2-2 | R7: JS para navegadores antiguos | Subir el `build.target` de Vite a `es2020`. | No |
| P2-3 | A4 y A5: `alt` redundante y zonas táctiles | `alt=""` en los escudos decorativos y más espacio entre enlaces en `/jugadores`. | No |
| P2-4 | S3 y S4: títulos largos y sin datos estructurados | Acortar los títulos de plantilla y añadir `ItemList` o `SportsEvent`. | **Sí** (estrategia SEO) |
| P2-5 | S5: fichas con poco contenido | Añadir trayectoria y estadísticas a las fichas. | **Sí** (contenido) |
| P2-6 | S6: HTTPS y redirecciones 307 | Activar «Always Use HTTPS» y crear una regla 301 para la barra final. | Lo haces tú en el panel de Cloudflare |

## 7. Cómo voy a trabajar (fase 5 en adelante)

Trabajaré **por bloques de páginas**. En cada bloque:

1. Aplico los cambios seguros.
2. Compilo y paso los tests.
3. Pruebo en el navegador, en móvil y escritorio, las rutas del bloque y el simulador, mirando la consola.
4. Mido el bloque tres veces y me quedo con la mediana.
5. Comparo antes y después.
6. Hago un commit por bloque.

Si un bloque empeora algo, lo deshago antes de pasar al siguiente.

| Bloque | Páginas | Cambios previstos sin autorización | Necesita autorización |
|---|---|---|---|
| 0. Común a todo el sitio | Todas | P0-4 (`_headers`), P1-4 (favicon), P2-2 (`build.target`) | — |
| 1. Páginas estáticas | Ligas, legales, `/anillos`, jugadores históricos, `/jugadores`, equipos y jugadores | P1-2, P1-3, P1-5, P2-1, P2-3 | — |
| 2. Portada y hub | `/`, `/noticias`, `/resultados`, `/calendario`, `/estadisticas` | P0-3, P1-6, P1-3 (`text-dim`) | P0-1 (hidratación), P1-1 (AdSense) |
| 3. Juego | `/en`, `/ca`, `/start`, `/careers`, `/play` | P0-2 (CLS) | P0-1 |
| 4. Cuenta | `/auth/*`, `/perfil` | P1-6 (títulos y canonical), P1-7 | P1-8 (CSP) |

### Decisiones que necesito de ti antes de los bloques 2 a 4

1. **P0-1, hidratar el HTML inicial.** Es la única vía realista para llegar a 90 en móvil en las 10 páginas SPA.
   - Riesgo: cambia cómo arranca la app, así que habría que probar a fondo la navegación y el simulador.
   - Si no se hace: esas páginas se quedan entre 50 y 70 en móvil.
2. **P1-1, cargar AdSense más tarde.** Ahorra entre 0,4 y 0,7 s del hilo principal en móvil.
   - Riesgo: podría bajar las impresiones o los ingresos.
   - Si no se hace: la portada y el hub difícilmente pasarán de 85 en móvil.
3. **P1-8, CSP de auth.** Es un cambio pequeño, pero toca la autenticación.
4. **P2-4 y P2-5.** Son cambios de estrategia SEO y de contenido.
