# Arquitectura · Anillero Control Center

*Your project. Your team. Your progress.*

Backoffice privado para que el equipo gestione tareas, incidencias, hitos, decisiones, notas, comentarios y actividad. Vive en el mismo repo y en el mismo Worker que anillero.com: no hay un servicio aparte.

## Propuesta técnica (decidida)

| Pieza | Elección | Por qué |
|---|---|---|
| Ruta | `/control-center` (una sola URL; las vistas van en el hash: `#/kanban`) | El Worker solo tiene que proteger una ruta y no hace falta tocar el router público. |
| Frontend | Entrada de Vite aparte (`control-center.html` → `src/control-center/main.tsx`), React 18 sin dependencias nuevas | No entra en el bundle del juego ni del hub; la app pública no sabe que existe. |
| API | Hono, montada en `createApp()` (`src/control-center/api.ts`) bajo `/api/cc/*` | Reutiliza el middleware de sesión que ya existe en `src/api.ts`. |
| Auth | Sesión de Better Auth + email verificado + lista blanca `CC_ALLOWED_EMAILS` | Auth real en servidor, sin cuentas nuevas ni secretos en el código. |
| Datos | D1 (binding `DB`), tablas `cc_*` con columna `env` | Persistencia real con migraciones; separación de entornos aunque compartan base de datos. |
| SEO | `noindex` en meta y cabecera, fuera del sitemap, sin analítica, sin enlaces | El panel no debe existir para Google. |

## Flujo de una petición

```
Navegador ──GET /control-center──▶ Worker (run_worker_first)
                                     │ getSession (Better Auth, cookie)
                                     ├─ sin sesión ............ 302 /auth/login
                                     ├─ no está en la lista ... 404 (no revela que existe)
                                     └─ miembro ............... ASSETS /control-center.html
                                                                + X-Robots-Tag: noindex, nofollow, noarchive
                                                                + Cache-Control: private, no-store

Navegador ──/api/cc/*──▶ middleware /api/* (sesión) ─▶ middleware /api/cc/* (401 / 403)
                          ─▶ ensureCategories(env) ─▶ handler ─▶ D1 (WHERE env = ?)
```

## Archivos

| Archivo | Qué hace |
|---|---|
| `control-center.html` | Shell HTML con `noindex`. Vite lo compila a `dist/control-center.html`. |
| `src/control-center/main.tsx`, `App.tsx`, `cc.css` | La interfaz (todas las vistas). |
| `src/control-center/api.ts` | Página protegida y API REST. |
| `src/control-center/logic.ts` | Reglas puras: entorno, permisos, validación, progreso de hitos. |
| `src/control-center/seed.ts` | Importación inicial desde las auditorías. |
| `migrations/0003_auth.sql` | Tablas de Better Auth que faltaban en `migrations/` (idempotente). |
| `migrations/0004_control_center.sql` | Tablas `cc_*`. |
| `src/__tests__/control-center.test.ts` | Pruebas T01–T06. |
| `scripts/control-center.e2e.mjs` | Pruebas T07–T20 contra `wrangler dev`. |

Cambios fuera de la carpeta: `src/api.ts` (una línea para montar la API), `src/types.ts` (dos variables), `wrangler.jsonc` (`run_worker_first`), `vite.config.ts` (entrada nueva y sin beacon para el panel), `scripts/gen-analytics.mjs` (sin beacon para el panel), `.gitignore` (`.dev.vars`), `package.json` (`test:cc`, `db:migrate:local`).

## Límites conocidos

- La API devuelve todas las filas del entorno y el cliente filtra (marcado `shortcut:` en `api.ts`). Pensado para cientos o pocos miles de tareas.
- Sin tiempo real: los datos se recargan al abrir el panel, al guardar y al volver a la pestaña.
- El service worker público (`public/sw.js`) puede guardar en caché el *shell* de `/control-center` para uso sin conexión. El shell no contiene datos: todo llega por `/api/cc/*`, que el service worker no cachea.
