# 09 · Resultados de las pruebas

**Fecha:** 23-10-2026.

**Código:** `origin/pre` (`f3925bf`) en una copia de trabajo temporal (`git worktree`). Se reutilizó `node_modules` del repo local, porque `package.json` y `package-lock.json` son idénticos. **No se instaló ni actualizó ninguna dependencia del proyecto.**

## Ejecutadas y superadas

| Prueba | Comando | Resultado |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | ✅ 0 errores |
| Tests unitarios y de integración del motor | `npx vitest run` | ✅ **41 archivos, 239 tests superados** (71,6 s) |
| Build de producción | `npm run build` | ✅ en 4,7 s. Aviso: chunk > 500 kB (`main-B601qlMJ.js`, 768 kB / 230 kB gzip) |
| Build de `origin/main` (`ea2557d`) y de `df99907` | `npm run build` | ✅ Generan `main-Bq8dwl0q.js` y `main-DkKkEaNh.js`, que coinciden con lo que servían anillero.com y nba.polb.dev en cada momento. Confirma qué commit hay en cada dominio. |
| Respuestas HTTP | `curl` a `/`, `/en/`, `/ca/`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js` y una ruta inexistente en 4 hosts | ✅ 200 / 200 / … / 404 correcto |
| Carga en móvil (laboratorio, 3×) | `node scratchpad/wk/audit-perf.mjs` (Chromium, Pixel 5, 4G lenta y CPU ×4) | ✅ 0 errores de consola y 0 peticiones fallidas en ambos entornos |
| Flujo portada → primera decisión | Mismo script | ✅ 2 acciones; ~0,2 s hasta la primera decisión |
| Responsive | `scrollWidth − innerWidth` a 393 px | ✅ 0 px |
| Accesibilidad básica | Imágenes sin `alt`, botones sin nombre, inputs sin etiqueta | ✅ 0 / 0 / 0 |
| Tamaño del guardado | `localStorage` tras empezar una carrera | Medido: 547 KB en producción y 615 KB en pre, en una sola clave |

## Ejecutadas con hallazgos

| Prueba | Resultado |
|---|---|
| `npm audit` | ❌ **8 vulnerabilidades:** 2 críticas (vitest/tinypool, solo en desarrollo), 4 altas (vite, react-router) y 2 moderadas. Detalle en [03](03-github-security.md). |
| `npm outdated` | Todas las dependencias tienen versiones mayores nuevas |
| CLS | ❌ 0,138 sin limitación y 2,0 con limitación. Fuente: `.country-grid`. |
| LCP | ⚠️ 2,8-3,3 s en laboratorio (umbral 2,5 s) |
| Búsqueda `site:` | Sin resultados. El buscador de la herramienta no garantiza que admita `site:`, así que el resultado no es concluyente. |

## No se pudieron ejecutar

| Prueba | Motivo | Pendiente |
|---|---|---|
| Linter | El proyecto **no tiene ESLint** ni script `lint` | Añadir ESLint con `typescript-eslint`, opcional |
| Tests end-to-end en el repo | No existen en el repo. Los scripts de Playwright viven fuera, en el scratchpad de la sesión. | Valorar mover un *smoke test* a `e2e/` |
| PageSpeed Insights / Lighthouse oficial | Respuesta: «Quota exceeded … Queries per day» | Ejecutarlo desde pagespeed.web.dev o con Lighthouse CLI |
| Datos de campo (CrUX) | El dominio es nuevo y no hay datos | Cloudflare Web Analytics |
| Search Console, analítica y logs | Sin acceso a anillero.com | Ver [04](04-technical-seo.md) §3 |
| Configuración de seguridad de GitHub (Dependabot, secret scanning, colaboradores) | Sin `gh` ni token | Revisar en Settings → Code security |
| Comprobación de enlaces | Solo hay un enlace interno (`#/careers`) y ninguno externo en el HTML | — |
| Persistencia de carrera completa y migración | No se recorrió una carrera completa en esta auditoría (sí en sesiones anteriores, sobre versiones previas) | Test de *round-trip* guardar → cargar |
| Navegación con teclado y lectores de pantalla | Requiere pruebas manuales | — |
| Funcionamiento sin conexión | No probado | Playwright con `context.setOffline(true)` |

## Solo revisado estáticamente
- Bug de `exportCareer` (`/s+/g`) y comportamiento de `migrate()`.
- Ausencia de interfaz para el reto diario.
- Ausencia de analítica, licencia y páginas legales.
- Cabeceras de seguridad, comprobadas con `curl -I`.
