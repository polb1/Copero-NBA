# 04 · SEO técnico e indexación

**Fecha de las comprobaciones:** 23-10-2026, con `curl` y Playwright. Todo lo que se dice del HTML servido está verificado en las respuestas reales. Las conclusiones sobre Google son **inferencias**: no hay acceso a Search Console de anillero.com.

## 1. Cómo funciona el sitio para un rastreador

- **Sitio estático multipágina para SEO + SPA para el juego.** Existen 3 URLs reales e indexables: `/`, `/en/` y `/ca/`.
- Cada una lleva en el HTML inicial, sin necesidad de JavaScript:
  - `<title>` y meta description propios;
  - un H1;
  - 3 H2 en `<details>`;
  - 8 preguntas frecuentes;
  - JSON-LD (`VideoGame` + `Offer` gratuito + `FAQPage`);
  - unas 1.060 palabras visibles para el bot.
- El juego vive en fragmentos (`#/start`, `#/play`, `#/careers`). Google **no indexa fragmentos**, y es lo correcto: son estados privados de la partida y no deben indexarse.
- **No hace falta SSR.** El contenido indexable ya está en el HTML estático. El problema no es la SPA, sino los dominios y la cantidad de contenido.
- Un script en `<head>` redirige `/` a `/en/` o `/ca/` si hay una cookie `lang`. Googlebot no lleva cookies, así que no le afecta.

## 2. Hallazgos

| # | Hallazgo | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| S1 | **El canonical de producción apunta a otro dominio** | `https://anillero.com/` → `<link rel="canonical" href="https://nba.polb.dev/">`. También en `/en/`, `/ca/`, hreflang, `og:url`, `og:image` y JSON-LD `url`. Origen: `scripts/gen-pages.mjs:5` e `index.html:15-36`. | **Crítica** | Generar todas las URLs absolutas a partir de una variable `SITE_URL` por entorno (ver 12) |
| S2 | **Sitemap y robots.txt con el dominio antiguo** | `anillero.com/robots.txt` → `Sitemap: https://nba.polb.dev/sitemap.xml`. Las 3 `<loc>` de `public/sitemap.xml` usan `nba.polb.dev`. | **Crítica** | Generar `sitemap.xml` y `robots.txt` en el build |
| S3 | **6 hosts con el mismo contenido, todos indexables** | 200 + `index, follow` en anillero.com, nba.polb.dev, pre.anillero.com, pre-nba.polb.dev, copero-x-nba.anillero-project.workers.dev y copero-nba-pre.anillero-project.workers.dev | **Alta** | 301 de los secundarios a anillero.com; `noindex` y/o acceso protegido en pre |
| S4 | **HTTP no redirige a HTTPS** | `http://anillero.com/` → 200 sin redirección. Igual en el resto de hosts. | Media | Cloudflare → SSL/TLS → «Always Use HTTPS» y HSTS |
| S5 | `www.anillero.com` no resuelve | `curl` devuelve 000 (sin DNS) | Baja-media | Registro DNS de www con redirección 301 al dominio raíz |
| S6 | Imagen de Open Graph inadecuada | `og:image` es `icon-512.png` (cuadrada) con `twitter:card = summary_large_image`, que espera 1200×630 | Media | Crear `og-1200x630.png` con marca y mensaje, uno por idioma si es posible |
| S7 | Contenido escaso para competir | Solo 3 URLs (una por idioma), ~1.060 palabras, sin guías. Los competidores tienen de 7 a 15 páginas de guía (ver 06). | Alta (para el tráfico) | Hub de guías útiles (ver 06 §A) |
| S8 | Marca y palabra clave | Title: «Simulador de Carrera NBA Gratis · Crea tu Jugador \| NBA Legacy». La marca del dominio (Anillero) no aparece en ningún sitio. | Media | Decidir la marca (ver 00 §5) |
| S9 | `lastmod` ausente en el sitemap | Solo `changefreq` y `priority`, que Google ignora | Baja | Añadir `<lastmod>` con la fecha del build |
| S10 | Sin páginas legales ni de contacto | No hay `/privacidad`, `/aviso-legal` ni `/contacto` | Media (confianza y E-E-A-T) | Crear páginas estáticas ligeras |
| S11 | Cabeceras de seguridad ausentes | Sin HSTS, CSP, X-Content-Type-Options ni Referrer-Policy | Baja para SEO, media para seguridad | Archivo `_headers` (Workers static assets lo admite) o reglas de Cloudflare |
| S12 | Favicon en `data:` SVG | Correcto para navegadores; Google prefiere un archivo `/favicon.ico` o PNG de al menos 48 px | Baja | Añadir `<link rel="icon" href="/icons/icon-192.png">` |

**Aspectos correctos:**
- `lang` es correcto en cada página.
- Un solo H1, con jerarquía H1 → H2 coherente.
- Las 200 imágenes de la portada tienen `alt` y `loading="lazy"`.
- El 404 es un 404 real.
- El hreflang es recíproco: está mal de dominio, pero bien de estructura.
- `robots` permite el rastreo.
- El JSON-LD es válido sintácticamente (revisado a ojo, no con la Rich Results Test).

## 3. Indexación

- **Búsquedas `site:anillero.com` y `site:nba.polb.dev`:** el buscador que usa esta herramienta no devolvió ninguna página de ninguno de los dos dominios. Esto **no equivale** a los datos de Google, porque la herramienta no garantiza que admita el operador `site:`. Es un indicio, no una prueba.
- **Dato anterior de Search Console:** según la conversación del 20-10-2026, en la propiedad `nba.polb.dev` la portada figuraba como «Rastreada: actualmente sin indexar». Se pidió indexar `/en/` y `/ca/` y se reenvió el sitemap (3 páginas detectadas).
- **Inferencia:** Google probablemente aún no indexa ninguna versión. Si llega a indexar anillero.com, el canonical le dirá que la versión preferida es nba.polb.dev.

**Lista de comprobaciones para el propietario en Search Console**

Hay que añadir la propiedad **de dominio** `anillero.com` (verificación DNS en Cloudflare) y revisar:
1. Páginas indexadas y no indexadas (motivo de cada exclusión).
2. «Página alternativa con etiqueta canónica adecuada» o «Google eligió otra canónica»: esperable mientras exista S1.
3. Sitemap enviado y procesado.
4. Impresiones, clics, CTR, posición media y consultas, de los últimos 28 días y desde el inicio.
5. Acciones manuales y problemas de seguridad.
6. En la propiedad `nba.polb.dev`, una vez hechas las 301: usar la «Herramienta de cambio de dirección».

## 4. Palabras clave (hipótesis, sin datos de volumen)

No se han consultado herramientas de volumen (Ahrefs, Semrush, Keyword Planner). **Todas las estimaciones son cualitativas** y se basan en lo que aparece en el buscador.

| Grupo | Intención | Competencia observada | Potencial para Anillero |
|---|---|---|---|
| «NBA career simulator», «basketball career simulator» | Jugar ya | **Alta.** Al menos 6 juegos dedicados con guías: HoopDreams, DRAFTBOUND, mynbacareer.com, basketballcareersimulator.com, airball.gg, Build a Baller. | Bajo a corto plazo; medio con contenido y enlaces |
| «NBA draft simulator» | Jugar, o simular un draft real | Alta; mezcla con *mock drafts* reales | Bajo |
| «Basketball GM / manager simulator» | Gestión de equipo | Basketball GM domina | Bajo: no es el mismo juego |
| «simulador de carrera NBA», «juego crear jugador baloncesto», «simulador baloncesto gratis» | Jugar | **Baja-media.** Los resultados en español son pobres: emuladores de apps Android y páginas de baja calidad. Solo mynbacareer.com tiene interruptor ES. | **El más alto.** Mercado ES/LatAm con pocas alternativas web. |
| Catalán («simulador de bàsquet») | Jugar | Prácticamente nula | Nicho pequeño pero fácil de ganar |
| «MyCareer alternative», «2K MyCareer free» | Comparar | Media; los competidores tienen páginas comparativas | Medio, con una comparativa honesta |

**Estructura SEO propuesta (sin páginas artificiales):**
- `/` (ES), `/en/`, `/ca/`: landing actual, ya existe.
- `/guias/` (ES) y `/en/guides/`: hub con 5-8 guías reales (ver 06 §A).
- `/legal/privacidad`, `/legal/aviso`: confianza.
- Nada indexable bajo `#/`.
