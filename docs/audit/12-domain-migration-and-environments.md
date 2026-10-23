# 12 · Dominios, entornos y migración (anillero.com / pre.anillero.com)

Esta auditoría **no ha cambiado ningún dominio, DNS ni configuración remota.** El único cambio en Cloudflare fue anterior y lo pidió el usuario: el despliegue del 22-10-2026 que dejó anillero.com en `df99907`, y el rollback de nba.polb.dev.

## 1. Estado actual de los dominios (23-10-2026)

| Host | Cuenta / Worker | Rama configurada | Versión servida | HTTP | HTTPS forzado | Robots | Canonical |
|---|---|---|---|---|---|---|---|
| **anillero.com** (producción) | Anillero-Project / `copero-x-nba` | `main` | **`df99907`** (subida manual; **no** es `main` = `ea2557d`) | 200 | No | `index, follow` | `https://nba.polb.dev/` ❌ |
| **pre.anillero.com** (preproducción) | Anillero-Project / `copero-nba-pre` | `pre` | `f3925bf` (= `pre`) ✅ | 200 | No | `index, follow` ❌ | `https://nba.polb.dev/` ❌ |
| www.anillero.com | — | — | Sin DNS | — | — | — | — |
| nba.polb.dev (antiguo) | Personal / `copero-x-nba` | `main` | `df99907` (versión fijada por rollback) | 200 | No | `index, follow` | sí mismo |
| pre-nba.polb.dev | Personal / `copero-nba-pre` | `pre` | `f3925bf` | 200 | No | `index, follow` | `nba.polb.dev` |
| copero-x-nba.anillero-project.workers.dev | Anillero-Project | `main` | `df99907` | 200 | — | `index, follow` | `nba.polb.dev` |
| copero-nba-pre.anillero-project.workers.dev | Anillero-Project | `pre` | `f3925bf` | 200 | — | `index, follow` | `nba.polb.dev` |

**¿Funcionan los dos dominios?**
- **Sí:** cargan sin errores, el juego arranca, y el 404 y los recursos son correctos.
- **No están configurados de forma segura ni coherente:**
  - producción se declara copia de otro dominio;
  - preproducción es pública e indexable;
  - producción no corresponde a ninguna rama, porque se subió a mano.

## 2. Referencias a `nba.polb.dev`

Búsqueda en todos los archivos propios de `origin/pre`. Los mismos archivos existen en `main`.

| Archivo:línea | Qué es | Clase | Recomendación |
|---|---|---|---|
| `scripts/gen-pages.mjs:5` (`SITE`) | Base de todas las URLs absolutas de `/en/` y `/ca/` | **Crítica + SEO** | Sustituir por `process.env.SITE_URL`, con `https://anillero.com` por defecto |
| `index.html:15` | `<link rel="canonical">` | **SEO** | Generar desde `SITE_URL` (que `gen-pages` reescriba también `index.html`, o usar una plantilla `index.template.html`) |
| `index.html:16-19` | `hreflang` es, en, ca y x-default | SEO | Ídem |
| `index.html:23` | JSON-LD `url` e `image` | SEO | Ídem |
| `index.html:35-36` | `og:url`, `og:image` | SEO | Ídem |
| `en/index.html`, `ca/index.html` (generados, ignorados por Git) | Mismas etiquetas | SEO | Se arreglan solos al cambiar `SITE_URL` |
| `public/sitemap.xml:4-26` | 3 `<loc>` + 12 alternates | SEO | Generar en el build; eliminar el archivo fijo |
| `public/robots.txt:4` | `Sitemap:` | SEO | Generar en el build; en pre, `Disallow: /` (complementario a Access y noindex) |
| Configuración de Cloudflare (cuenta personal) | Workers con nba.polb.dev y pre-nba.polb.dev | **Configuración** | Sustituir por reglas de redirección 301 → anillero.com y apagar los builds |
| Search Console (propiedad nba.polb.dev) | Propiedad verificada | Externa | Mantener para la «Herramienta de cambio de dirección» |
| Documento de producto en Google Drive (20-10-2026) | Menciona `nba.polb.dev` | Documentación externa | Actualizar a mano |
| Historial de Git (commits) | Mensajes y diffs antiguos | **Histórica** | Conservar; **no reescribir el historial** |
| README, `docs/*.md` | No contienen el dominio | — | Añadir la URL de producción al README |

**No hay** referencias en código de ejecución (`src/`), callbacks OAuth, APIs ni variables de entorno: el proyecto no los usa.

## 3. Diferencias entre producción y preproducción

| Aspecto | anillero.com | pre.anillero.com |
|---|---|---|
| Código | `df99907` (20-10) | `f3925bf` (23-10): +22 commits. Finanzas, hipotecas, bancarrota y all-in; plantillas reales; minijuegos por posición; combine y entrevistas; medallas; UX móvil. |
| JS principal | 179 KB transferidos en la carga | 253 KB transferidos (+41 %) |
| LCP de laboratorio | ~2,96 s | ~3,26 s |
| Guardado inicial | 547 KB | 615 KB |
| Variables de entorno | Ninguna | Ninguna (**no hay forma de distinguir el entorno en el build**) |
| SEO | Indexable, canonical a nba.polb.dev | Igual (**no debería**) |
| Analítica | Ninguna | Ninguna |
| Datos de prueba expuestos | No se detectaron | No se detectaron. El código es el mismo repo público, así que pre no expone nada que no esté ya en GitHub. |
| Compatibilidad de partidas | `SAVE_VERSION = 1` | `SAVE_VERSION = 1`, pero con campos nuevos (finanzas…). **Riesgo:** al desplegar `pre` en producción, las partidas antiguas se cargan sin esos campos. No se ha verificado si el código tolera su ausencia. **Probarlo antes de promocionar.** |

## 4. Riesgos de SEO e indexación

1. Google consolida anillero.com en nba.polb.dev, o no indexa ninguno, por las señales contradictorias.
2. pre.anillero.com y pre-nba.polb.dev pueden indexarse y mostrar en Google una versión inestable.
3. Los `*.workers.dev` son duplicados adicionales.
4. HTTP y HTTPS sirven ambos un 200: más duplicados.
5. El cambio de dominio, sin 301 ni «Cambio de dirección», pierde las señales acumuladas por nba.polb.dev. Probablemente son pocas.

## 5. Configuración canónica recomendada

- Canónico único: **`https://anillero.com/`**, sin www y con barra final en `/en/` y `/ca/`.
- Todas las URLs absolutas (canonical, hreflang, `og:url`, `og:image`, JSON-LD y sitemap) se generan desde `SITE_URL`.
- Hosts secundarios → **301 conservando la ruta** a `https://anillero.com$path`.
  - Se puede hacer con **Redirect Rules** de Cloudflare en la zona `polb.dev`.
  - O sustituyendo el Worker de nba.polb.dev por un Worker de 5 líneas que redirija.

## 6. robots.txt y sitemap

| Entorno | robots.txt | Sitemap | Cabeceras | Acceso |
|---|---|---|---|---|
| Producción | `Allow: /` + `Sitemap: https://anillero.com/sitemap.xml` | 3 URLs con `lastmod` (más guías en el futuro) | — | Público |
| Preproducción | `Disallow: /` (no basta por sí solo) | No servir | `X-Robots-Tag: noindex, nofollow` | **Cloudflare Access** (recomendado) |

**Importante:** no basta con `robots.txt` para preproducción. Si pre bloquea el rastreo con `Disallow`, Google **no puede ver** el `noindex`. La protección real es Access, que devuelve un 302 al login a los bots. El `noindex` por cabecera es la segunda capa.

**Cómo diferenciar el build sin duplicar código:**
1. En Cloudflare, Worker `copero-nba-pre` → Settings → Builds → **Build variables**: `SITE_URL=https://pre.anillero.com` y `SITE_ENV=pre`.
2. `gen-pages.mjs` lee esas variables:
   - si `SITE_ENV=pre`, escribe `robots.txt` con `Disallow`, añade `<meta name="robots" content="noindex">` y no genera sitemap;
   - en producción, lo contrario.
3. Para la cabecera: un archivo `public/_headers` (admitido por Workers static assets) generado solo en pre con `X-Robots-Tag: noindex`.

## 7. Variables de entorno y analítica

| Variable | Producción | Preproducción |
|---|---|---|
| `SITE_URL` | `https://anillero.com` | `https://pre.anillero.com` |
| `SITE_ENV` | `production` | `pre` |
| `ANALYTICS_ID` (Umami, Cloudflare WA) | ID de producción | **Vacía** (sin analítica) o un ID separado |

**No compartir** el ID de analítica entre entornos.

## 8. Cambios necesarios en el repositorio

1. `scripts/gen-pages.mjs`:
   - `SITE` desde variable;
   - reescribir también `index.html` (o usar una plantilla);
   - generar `robots.txt`, `sitemap.xml` y `_headers` según el entorno.
2. Eliminar `public/sitemap.xml` y `public/robots.txt` fijos.
3. Inyectar el script de analítica solo si `SITE_ENV=production`.
4. README: URL de producción, flujo `pre → main` y cómo publicar.
5. *(Opcional)* `wrangler.jsonc` con `env.pre` documentado, aunque los dominios se gestionan en el panel.

## 9. Cambios que requieren acceso externo (Cloudflare, Google, GitHub)

| Cambio | Dónde |
|---|---|
| Build variables `SITE_URL` y `SITE_ENV` en cada Worker | Cloudflare → Workers → Settings → Builds |
| Cloudflare Access para pre.anillero.com | Cloudflare Zero Trust |
| Always Use HTTPS, HSTS y DNS de `www` con 301 | Zona anillero.com |
| Redirect Rules nba.polb.dev / pre-nba.polb.dev → anillero.com | Zona polb.dev (cuenta personal) |
| Desactivar `workers.dev` y las URLs de preview si no se usan | Workers → Settings → Domains |
| Volver a alinear producción con `main` (o fijar la versión deliberadamente) | Workers → Deployments |
| Search Console de dominio anillero.com, sitemap y cambio de dirección | Google Search Console |
| Protección de `main` y CI | GitHub |

## 10. Lista de comprobaciones posteriores a la migración

- [ ] `curl -s https://anillero.com/ | grep canonical` → `https://anillero.com/`
- [ ] Ídem en `/en/` y `/ca/`; hreflang, `og:url` y JSON-LD con anillero.com
- [ ] `https://anillero.com/robots.txt` → `Sitemap: https://anillero.com/sitemap.xml`
- [ ] El sitemap solo contiene URLs de anillero.com y cada una devuelve 200
- [ ] `curl -I http://anillero.com/` → 301 a https; `https://www.anillero.com/` → 301 a la raíz
- [ ] `curl -I https://nba.polb.dev/en/` → 301 a `https://anillero.com/en/`
- [ ] `*.workers.dev` → desactivado o con 301
- [ ] `curl -I https://pre.anillero.com/` → 302 a Access y/o `X-Robots-Tag: noindex`
- [ ] Inspección de URL en Search Console: «canónica elegida por Google = anillero.com»
- [ ] La analítica registra visitas solo en producción
- [ ] Partida guardada de la versión anterior carga correctamente tras promocionar `pre` → `main`
- [ ] La versión servida en producción coincide con el último commit de `main` (comparar `assets/main-*.js`)
