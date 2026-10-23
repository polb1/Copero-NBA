# 03 · GitHub, historial, dependencias, seguridad y CI/CD

## 1. Estado del repositorio

**Repositorio local:** `C:\Users\polbo\Desktop\Projects\REAL\NBA x Copero`. Está en la rama `main`, en `df99907`, limpio y **5 commits por detrás de `origin/main`**.

| Elemento | Dato | Fuente |
|---|---|---|
| Remoto | github.com/polb1/Copero-NBA, **público** | API pública de GitHub |
| Descripción, homepage, topics | Vacíos | API |
| Licencia | **Ninguna** (`license: null`; no hay `LICENSE`) | API y archivos |
| Estrellas, forks, issues, PRs | 0 / 0 / 0 / 0 (nunca se ha abierto una PR) | API |
| Ramas | `main` (`ea2557d`), `pre` (`f3925bf`), `dario` (`d743925`). **Ninguna protegida.** | API |
| Tags y releases | Ninguno | `git tag` |
| Commits | 66 en `main` y 83 en `pre`, entre el 17-10-2026 y el 23-10-2026 | `git log` |
| Autores | `polb1` (62 en `pre`) y `dario` (21) | `git log` |
| Convención de commits | Mezclada: 50 % frases simples («Folded footer…») y 50 % Conventional Commits (`feat:`, `fix:`) | `git log` |
| Tamaño del pack | 894 KiB, más ~10 MB de binarios en `public/` | `git count-objects` |
| Archivos grandes | `src/data/nbaRoster2026.json` (444 KB), fotos de 150-210 KB y escudos de 130-150 KB | `du` |
| Artefactos que no deberían versionarse | `head-desk.png` y `head-phone.png` en la raíz. `.wrangler/` existe en local y no está en `.gitignore`. | `git ls-files` |
| README | 84 líneas. Sin URL de producción ni licencia. | — |
| CONTRIBUTING / SECURITY | No existen. Para 2 personas, CONTRIBUTING es opcional. | — |
| GitHub Actions | **No hay** `.github/workflows` | Archivos |

**Flujo de trabajo observado:**
- Commits directos a `main` y `pre`, y merges locales `dario → pre`.
- Ningún cambio pasa por una revisión ni por CI antes de llegar a producción.
- El build de Cloudflare (`npm run build`) incluye `tsc -b`, así que un error de tipos bloquea el despliegue. En cambio, **los tests no se ejecutan** antes de desplegar.

No se ha podido verificar por falta de acceso autenticado (no hay `gh` instalado ni token):
- la configuración de seguridad de GitHub (Dependabot, secret scanning);
- los colaboradores y los permisos;
- el tráfico del repositorio.

## 2. Dependencias (`npm audit`, 23-10-2026)

**8 vulnerabilidades: 2 críticas, 4 altas y 2 moderadas.**

| Paquete | Severidad | ¿Afecta a producción? | Comentario |
|---|---|---|---|
| `vitest` 2.1.3, `tinypool`, `@vitest/mocker` | Crítica | **No.** Solo se usan en desarrollo. | Requieren que el servidor de la API de Vitest esté escuchando. Actualizar a vitest ≥ 3.x. |
| `vite` 5.4.9, `esbuild` | Alta / moderada | **No.** Solo afectan al servidor de desarrollo. | Lectura de archivos del dev server desde webs maliciosas. Actualizar a vite 5.4.x más reciente o 6+. |
| `react-router-dom` 6.26.2 (`react-router`, `@remix-run/router`) | Alta | **Teórico.** Open redirect y XSS en redirecciones con rutas no confiables. | La app usa `HashRouter` y solo `<Navigate to="/">`, sin redirecciones construidas con datos del usuario, así que el riesgo real es bajo. Actualizar a la última 6.x es barato. |

**Versiones fijadas sin `^`:** es reproducible, pero no recibe parches.

**Desactualizadas (npm outdated):**
- React 18.3.1 → 19.3
- Vite 5 → 8
- Vitest 2 → 5
- TypeScript 5.6 → 7

Ninguna es urgente salvo los parches de seguridad. **No se ha cambiado ninguna versión durante la auditoría.**

## 3. Secretos y datos sensibles

| Búsqueda | Resultado |
|---|---|
| Claves y tokens (`api_key`, `secret`, `token`, `password`, `ghp_`, `AIza`, `sk-`, claves privadas) en el código y en **todo el historial** (`git log --all -p`) | **0 coincidencias reales.** Solo aparece la constante `SUFFIX_TOKENS`, que no tiene nada que ver. |
| `.env` o variables de entorno | No existen; el proyecto no las necesita |
| Datos personales en el repo | No se han encontrado. Hay un email de autor en los metadatos de los commits (normal en Git). |
| Scripts de instalación sospechosos (`postinstall`…) | Ninguno |

**Credenciales fuera del repo, detectadas durante la auditoría:**
- Wrangler quedó autenticado mediante OAuth en este ordenador el 22-10-2026, para un rollback. Si ya no se necesita, ejecuta `npx wrangler logout`.
- El acceso a Cloudflare abarca **dos cuentas** (Anillero-Project y la personal) con el mismo usuario.

## 4. Riesgos de despliegue (Cloudflare Workers Builds)

1. **Producción no corresponde a `main`.** anillero.com sirve `df99907` (subido a mano con `wrangler deploy` el 22-10-2026), mientras que `main` está en `ea2557d`. El próximo push a `main` lo sustituirá automáticamente.
2. **Los rollbacks fijan la versión.** En la cuenta personal, nba.polb.dev se quedó en `67251ebb` aunque se construyeron tres versiones nuevas. Nadie se enteró hasta revisarlo a mano.
3. **Cuatro Workers en dos cuentas** para el mismo producto. Duplica la configuración, los dominios y los errores posibles.
4. **Sin tests en el pipeline:** los 239 tests no se ejecutan antes de publicar.
5. **Sin ramas protegidas:** cualquiera con acceso de escritura publica en producción con un push.

## 5. Recomendaciones (ordenadas)

| # | Acción | Por qué | Esfuerzo |
|---|---|---|---|
| 1 | Proteger `main` (PR obligatoria y check verde) | Evita publicar sin revisar | 10 min |
| 2 | GitHub Action `ci.yml` con `npm ci && npm run typecheck && npm test && npm run build` en cada PR y push | Los tests existen pero no protegen nada | 30 min |
| 3 | Actualizar parches: `react-router-dom@6.30.x`, `vite@5.4.latest`, `vitest@3.x` (con PR y tests) | Cierra el audit sin migraciones grandes | 1-2 h |
| 4 | Añadir `LICENSE` (o declarar «todos los derechos reservados») y rellenar descripción, homepage y topics en GitHub | Repo público sin licencia = ambigüedad legal; además es un enlace y una señal gratis | 15 min |
| 5 | Unificar la convención de commits (Conventional Commits) y usar tags y releases al publicar en producción | Trazabilidad de qué versión está en anillero.com | — |
| 6 | Activar Dependabot y secret scanning (gratis en repos públicos) | Avisos automáticos | 5 min |
| 7 | Mover las capturas `head-*.png` y añadir `.wrangler/` a `.gitignore` | Limpieza | 5 min |
| 8 | Consolidar en una sola cuenta de Cloudflare y apagar los Workers de la cuenta personal, dejando una redirección | Menos superficie y menos sorpresas | 1 h (acceso externo) |
