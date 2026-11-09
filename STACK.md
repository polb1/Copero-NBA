# NBA COPERO — Stack Tecnológico Completo

> Documento generado automáticamente a partir de la inspección del repositorio (`~/codigo/Copero-NBA`). Fecha: 2026-11-09.

---

## 1. Frontend (Web App)

| Capa | Tecnología | Versión | Detalles |
|------|------------|---------|----------|
| **Framework** | React | 18.3.1 | ESM, JSX runtime automático |
| **Build** | Vite | 5.4.9 | Multi-página (`/`, `/en/`, `/ca/`, guías); plugin `site()` inyecta URL, robots, sitemap, llms.txt, _headers |
| **Router** | React Router DOM | 6.26.2 | SPA con rutas estáticas + dinámicas (`/liga/:slug`, `/equipo/:slug`) |
| **Estilos** | Tailwind CSS | 3.4.14 | `corePlugins.preflight: false` (reset propio); colores CSS vars (tema claro/oscuro); fuentes: Source Serif 4 / Inter |
| **PostCSS** | autoprefixer + tailwindcss | 10.4.20 / 3.4.14 | Config minimalista (`postcss.config.cjs`) |
| **Tipado** | TypeScript | 5.6.3 | `strict: true`, `ES2022`, `moduleResolution: Bundler`, `noUnusedLocals` |
| **Testing** | Vitest | 2.1.3 | `globals: true`, `environment: 'node'` (tests unitarios en `src/**/__tests__/`) |
| **Minify** | Terser | 5.36.0 | `legalComments: 'none'`, compresión producción |
| **i18n** | Propio | — | `src/i18n/` (es/en/ca) + `countries.ts`, tipos en `types.ts` |

### Estructura clave `src/`

```
src/
├── App.tsx, main.tsx, GameShell.tsx          # Shell principal
├── screens/simple/                           # Pantallas juego (Start, Play, Careers)
├── ui/minigames/                             # 6 minijuegos (DragShot, Choice, Target, Power, Reaction)
├── ui/art/                                   # Assets SVG (trophy, awards, scenes)
├── actualidad/                               # Hub noticias/resultados/calendario/estadísticas
├── lib/api.ts                                # Cliente API (/api/*, /c/*)
├── seo.ts, simple.css, styles.css            # Utilidades globales
```

---

## 2. Backend (API + Workers)

| Componente | Tecnología | Detalles |
|------------|------------|----------|
| **Runtime** | Cloudflare Workers | `wrangler.jsonc` → `worker/index.ts` |
| **Base de datos** | Cloudflare D1 (SQLite) | 6 tablas: `players`, `careers`, `daily_results`, `daily_streaks`, `shares` + índices |
| **Assets estáticos** | Workers Assets Binding | Sirve `dist/` (build Vite); `run_worker_first: ["/api/*", "/c/*"]` |
| **API endpoints** | REST JSON | `/api/health`, `/api/daily/*`, `/api/stats`, `/api/career*` |
| **Páginas públicas carrera** | `/c/:id` | HTML + Open Graph generado en worker (XSS-safe) |
| **Observabilidad** | Workers Observability | Habilitado en `wrangler.jsonc` |
| **Dev local** | `wrangler dev --local --port 8788` | Proxy Vite → `localhost:8788` para `/api` y `/c/` |

### Esquema D1 (`migrations/0001_init.sql`)

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  nickname TEXT,
  country TEXT
);

CREATE TABLE careers (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  seed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  legacy_score INTEGER NOT NULL DEFAULT 0,
  titles INTEGER NOT NULL DEFAULT 0,
  tier TEXT,
  payload TEXT
);
CREATE INDEX idx_careers_player ON careers(player_id);
CREATE INDEX idx_careers_score ON careers(legacy_score DESC);

CREATE TABLE daily_results (
  day TEXT NOT NULL,
  player_id TEXT NOT NULL,
  goal_id TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  progress_a INTEGER NOT NULL DEFAULT 0,
  progress_b INTEGER NOT NULL DEFAULT 0,
  legacy_score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (day, player_id)
);
CREATE INDEX idx_daily_day ON daily_results(day, legacy_score DESC);

CREATE TABLE daily_streaks (
  player_id TEXT PRIMARY KEY,
  streak INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  last_day TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_streaks_best ON daily_streaks(best DESC);

CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  career_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_shares_career ON shares(career_id);
```

---

## 3. Data Ingestion & Generation (Python + Node)

### Scripts Python

| Script | Propósito |
|--------|-----------|
| `ingest.py` | Pipeline diario: 9 ligas (NBA, ACB, EuroLeague, BSL, GBL, LEGA, BBL, VTB, CBA). Fuentes: ESPN (legacy), API-Basketball (plan free 100 req/día), esake.gr (GBL). Cache TTL, backoff, presupuesto diario. |
| `update-actualidad.py` | Actualiza `public/data/{standings,results,fixtures}.json` desde ESPN API (NBA, EuroLeague). Reintentos, backoff, gzip, nunca deja web vacía. |

### Scripts Node (ESM) — `scripts/`

| Script | Propósito |
|--------|-----------|
| `gen-pages.mjs` | Pre-build: genera `/en/`, `/ca/`, guías desde `index.html` plantilla. |
| `site.mjs` | Config sitio (prod/pre), render HTML, rutas, SEO, sitemap, redirects, headers, llms.txt. |
| `gen-*.mjs` / `gen-*.py` | Generación estática masiva: páginas de ligas, equipos, jugadores, hall-of-fame, portales (CrazyGames, Poki, itch), sitemap, robots, llms.txt, legal, analytics. |

### Datos estáticos (`public/data/`)

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `players.json` | 2.9 MB | Base de datos completa de jugadores |
| `hall-of-fame.json` | 990 KB | Salón de la fama |
| `player-slugs.json` | 501 KB | Slugs para URLs de jugadores |
| `standings.json` | 15 KB | Clasificaciones |
| `fixtures.json` | 13 KB | Calendario |
| `results.json` | 11 KB | Resultados |
| `leagues.json` | 1 KB | Lista de ligas |
| `teams.json` | 11 KB | Equipos |
| `actualidad.json` | 18 KB | Datos hub actualidad |
| `gbl-rosters.json` | 17 KB | Rosters GBL |
| `nba-champions.json` | 9 KB | Campeones NBA histórico |

### Datos fuente (`src/data/`)

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `realRosters2026.json` | 696 KB | Rosters reales 2026 (todas ligas) |
| `nbaRoster2026.json` | 430 KB | Roster NBA 2026 |
| `euroRosters2026.json` | 87 KB | Rosters EuroLeague 2026 |
| `wikiRosters2026.json` | 233 KB | Rosters desde Wikipedia |
| `espnRosters2026.json` | 134 KB | Rosters ESPN |
| `euroApiRaw2026.json` | 4.2 MB | Datos crudos EuroLeague API |
| `espnMap.json` | 3 KB | Mapeo IDs ESPN |
| `clubLogos.ts` | 8 KB | Logos clubes |
| `crestMap.json` | — | Escudos (incluye 7 nuevos: Chiba Jets, etc.) |
| `realCoaches.ts` | 10 KB | Entrenadores reales |
| `nbaCoaches2026.json` | 9 KB | Entrenadores NBA 2026 |

---

## 4. Minijuegos (Drag & Shoot + 5 más)

| Archivo | Descripción |
|---------|-------------|
| `src/ui/minigames/dragShot.ts` | **Física 2.5D realista**: proyectil con gravedad, aro/tablero sólidos (colisión AABB), sin guía visual. Exporta `simulateShot`, `ShotResult`. |
| `src/ui/minigames/DragShotGame.tsx` | Wrapper React: input drag/touch, zona de tiro, feedback visual, integración con `ShotMeter`. |
| `src/ui/minigames/ChoiceGame.tsx` | Minijuego de elección (agente, club, etc.) |
| `src/ui/minigames/TargetGame.tsx` | Minijuego de puntería/timing |
| `src/ui/minigames/PowerGame.tsx` | Minijuego de potencia |
| `src/ui/minigames/ReactionGame.tsx` | Minijuego de reacción |
| `src/ui/__tests__/dragShot.test.ts` | 14 tests unitarios (física, colisiones, edge cases) — **14/14 passing** |

---

## 5. Despliegue & Portales

| Target | Comando | Salida |
|--------|---------|--------|
| **Producción (anillero.com)** | `npm run deploy` | `wrangler deploy` → Cloudflare Workers + Assets |
| **Pre-producción (pre.anillero.com)** | Push a rama ≠ `main` | Deploy automático (CI), `noindex, nofollow` via `_headers` |
| **CrazyGames** | `npm run portal:crazygames` | `dist-crazygames/` + manifest |
| **Poki** | `npm run portal:poki` | `dist-poki/` |
| **itch.io** | `npm run portal:itch` | `dist-itch/` + zip |
| **Build local** | `npm run build` | `dist/` (ejecuta todos los generadores + `vite build`) |

### Scripts de build (package.json)

```json
{
  "dev": "node scripts/gen-pages.mjs && vite",
  "build": "node scripts/gen-pages.mjs && tsc -b && vite build && node scripts/gen-portal-home.mjs && python3 scripts/gen-roster-player-pages.py && python3 scripts/gen-player-pages.py && node scripts/gen-league-pages.mjs && node scripts/gen-team-pages.mjs && node scripts/gen-intent-pages.mjs && node scripts/gen-hall-of-fame.mjs && node scripts/gen-players-index.mjs && node scripts/gen-evergreen-pages.mjs && node scripts/gen-legal-pages.mjs && node scripts/gen-analytics.mjs && node scripts/gen-sitemap.mjs",
  "preview": "vite preview",
  "test": "vitest run",
  "typecheck": "tsc -b --noEmit",
  "worker:dev": "wrangler dev --local --port 8788",
  "db:init": "wrangler d1 execute anillero --local --file=migrations/0001_init.sql",
  "db:init:remote": "wrangler d1 execute anillero --remote --file=migrations/0001_init.sql",
  "deploy": "wrangler deploy",
  "portal:crazygames": "node scripts/gen-portal-crazygames.mjs",
  "portal:poki": "node scripts/gen-portal-poki.mjs",
  "portal:itch": "node scripts/gen-portal-itch.mjs",
  "portal:all": "npm run portal:crazygames && npm run portal:poki && npm run portal:itch"
}
```

---

## 6. Herramientas de Calidad / CI

| Herramienta | Uso |
|-------------|-----|
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run test` | `vitest run` |
| `npm run lint` | *(no configurado explícitamente; TS strict actúa como linter)* |
| `scripts/site.test.mjs` | Tests de utilidades SEO/sitemap |
| `ingest.py discover` | Auditoría de fuentes de datos |

---

## 7. Dependencias Clave (package.json)

```json
{
  "name": "nba-legacy",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "6.26.2"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20261106.1",
    "@types/react": "18.3.11",
    "@types/react-dom": "18.3.1",
    "@vitejs/plugin-react": "4.3.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "terser": "^5.36.0",
    "typescript": "5.6.3",
    "vite": "5.4.9",
    "vitest": "2.1.3"
  }
}
```

---

## 8. Arquitectura de Datos (Flujo)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Fuentes externas│────▶│  Scripts ingesta │────▶│  public/data/   │
│  (ESPN, API-Bsk, │     │  (Python/Node)   │     │  (JSON estáticos)│
│   esake.gr)      │     │  + cache/backoff │     └────────┬────────┘
└─────────────────┘     └──────────────────┘              │
                                                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cloudflare D1  │◀────│  Worker API      │◀────│  Vite Build     │
│  (careers,      │     │  (/api/*, /c/*)  │     │  (dist/)        │
│   daily, streaks)│     └──────────────────┘     └────────┬────────┘
└─────────────────┘                                        │
                                                           ▼
                                              ┌─────────────────────┐
                                              │  Cloudflare Workers │
                                              │  Assets + API       │
                                              │  (anillero.com)     │
                                              └─────────────────────┘
```

---

## 9. Particularidades del Proyecto

- **Multi-idioma nativo**: 3 idiomas (ES/EN/CA) con rutas dedicadas y `hreflang` en sitemap.
- **SEO-first**: Cada ruta tiene su `index.html` físico (Cloudflare 404 si no), canonical, OG, llms.txt, IndexNow.
- **Producción vs Pre**: Detección por `WORKERS_CI_BRANCH` (`main` = prod); pre lleva `noindex` + `_headers` + beacon analytics solo en prod.
- **Datos 100% reales**: Rosters NBA/EuroLeague/B.League 2026-27 verificados; entrenadores reales; crests SVG propios (`src/actualidad/crestMap.json` + 7 nuevos: Chiba Jets, etc.).
- **PWA-ready**: Funciona offline (assets en Workers), instalable.
- **Sin build step en worker**: El worker sirve `dist/` directamente via Assets binding.
- **Física realista drag-shot**: Proyectil con gravedad, colisiones aro/tablero (AABB), sin guía visual — 14 tests unitarios pasando.
- **Portales de juegos**: Builds dedicados para CrazyGames, Poki, itch.io con scripts de generación propios.

---

## 10. Configuraciones Clave

### `vite.config.ts` — Puntos destacables
- Plugin `site()` propio: inyecta URL real, genera `_redirects`, `robots.txt`, `sitemap.xml`, `llms.txt`, `_headers` (noindex en pre)
- Multi-entry: `main`, `en`, `ca`, `guideEs`, `guideEn`
- Proxy dev: `/api` y `/c/` → `http://localhost:8788` (wrangler dev)
- Minify: Terser sin comentarios

### `tailwind.config.js` — Puntos destacables
- `darkMode: 'class'`, `preflight: false`
- Colores via CSS variables (`rgb(var(--c-...) / <alpha-value>)`)
- Tipografía: `display: Source Serif 4`, `body: Inter`, `mono: Inter`
- Escala de spacing personalizada (`gutter`, `margin`, `space-*`)
- Border radius: `DEFAULT: 0.25rem`, `lg: 0.5rem`, `xl: 0.75rem`, `full: 9999px`

### `wrangler.jsonc` — Puntos destacables
- `main: "worker/index.ts"`, `compatibility_date: "2026-10-01"`
- Assets binding: `directory: "./dist"`, `binding: "ASSETS"`
- `run_worker_first: ["/api/*", "/c/*"]`
- D1 database: `anillero` (binding `DB`, migrations en `migrations/`)
- Observability enabled

---

*Fin del documento — Stack completo NBA Copero / Anillero*