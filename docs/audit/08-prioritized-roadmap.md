# 08 · Backlog priorizado y plan de 30 días

**Fórmula:** Prioridad = Impacto × Confianza / Esfuerzo, con escalas de 1 a 5.

**Limitaciones:**
- Las puntuaciones son juicios del auditor, sin datos de tráfico.
- No tiene en cuenta las dependencias: algo con prioridad alta puede requerir otro paso antes.
- Una prioridad alta **no garantiza** visitas. Cada acción es una hipótesis que se valida con su KPI.

## 1. Backlog

| ID | Acción | Problema que resuelve | Canal | I | C | E | Coste | Dependencias | KPI | Plazo | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | `SITE_URL` por entorno en `gen-pages.mjs`; canonical, hreflang, OG, sitemap y robots → `https://anillero.com` | Canonical a otro dominio | SEO técnico | 5 | 5 | 1 | Gratis | Decidir el dominio | Canónica elegida por Google = anillero.com (GSC) | Inmediato | **25,0** |
| G2 | Cloudflare Web Analytics en anillero.com | Cero medición | Analítica | 4 | 5 | 1 | Gratis | — | Datos disponibles | Inmediato | **20,0** |
| G3 | Search Console de dominio `anillero.com` y envío del sitemap | No hay datos orgánicos | SEO | 4 | 5 | 1 | Gratis | G1 | Páginas indexadas | Inmediato | **20,0** |
| G4 | 301 de nba.polb.dev, pre-nba.polb.dev y `*.workers.dev` → anillero.com; desactivar las URLs `workers.dev` | 6 hosts duplicados | SEO técnico | 5 | 4 | 1 | Gratis | G1 | 1 solo host indexable | Inmediato | **20,0** |
| G5 | Proteger pre.anillero.com (Cloudflare Access) y `X-Robots-Tag: noindex` | Pre compite con producción | SEO / seguridad | 4 | 5 | 1 | Gratis (Access ≤ 50 usuarios) | — | Pre fuera de Google | Inmediato | **20,0** |
| G6 | «Always Use HTTPS» + HSTS; `www` → raíz | HTTP 200 y www sin DNS | SEO técnico | 2 | 5 | 1 | Gratis | — | 301 verificadas | Inmediato | **10,0** |
| G7 | URL y CTA en la tarjeta PNG | Las tarjetas compartidas no traen visitas | Viralidad | 4 | 3 | 1 | Gratis | — | Visitas con `utm_source=card` | Corto | **12,0** |
| G8 | CI en GitHub Actions + `main` protegida | Publicar sin tests | Fiabilidad | 3 | 5 | 1 | Gratis | — | 0 despliegues rotos | Corto | **15,0** |
| G9 | Eventos de embudo con Umami | Activación desconocida | Analítica | 4 | 4 | 2 | Gratis | G2 | Embudo completo | Corto | **8,0** |
| G10 | Recuperar el reto diario/semanal en la UI (`dailyKey`) | Sin motivo para volver | Retención | 4 | 3 | 3 | Gratis | G9 para medirlo | `career_resume` semanal | Corto | **4,0** |
| G11 | Reto con semilla compartible (`#/start?seed=`) | Sin invitación entre amigos | Viralidad | 4 | 3 | 2 | Gratis | — | Visitas desde enlaces de reto | Corto | **6,0** |
| G12 | Propuesta de valor en la cabecera («Gratis · sin registro · plantillas reales 2026-27») | Valor poco claro | Conversión | 3 | 4 | 1 | Gratis | G9 para medirlo | % `career_start` | Inmediato | **12,0** |
| G13 | Arreglar el CLS de `.country-grid` y dividir el bundle (plantillas y motor en `import()`) | CLS ≥ 0,14 y LCP de ~3 s | Rendimiento | 3 | 4 | 2 | Gratis | — | CLS < 0,1 y LCP < 2,5 s (CWV de campo) | Corto | **6,0** |
| G14 | Imagen OG de 1200×630 por idioma | Vista previa pobre al compartir el enlace | Social | 3 | 4 | 1 | Gratis | G1 | CTR en redes | Corto | **12,0** |
| G15 | Hub de guías ES (draft, posiciones, Europa o NCAA) | Contenido escaso | SEO contenidos | 4 | 3 | 3 | Gratis (tiempo) | G1, G3 | Impresiones de las guías | Medio | **4,0** |
| G16 | Página «Estadísticas de 10.000 carreras» con datos del motor | Falta de enlaces y contenido original | SEO / enlaces | 4 | 2 | 3 | Gratis | G15 | Dominios que enlazan | Medio | **2,7** |
| G17 | Páginas de privacidad y aviso legal | Confianza y obligación al medir | Legal | 3 | 4 | 1 | Gratis | G2 | — | Corto | **12,0** |
| G18 | Decisión de marca (NBA Legacy → Anillero) y revisión legal del uso de «NBA» y los logos | Riesgo de marca, confusión | Producto / legal | 4 | 3 | 2 | Bajo-medio (asesoría) | — | — | Corto | **6,0** |
| G19 | Migración real de partidas (`migrate()`) e importación del JSON | Pérdida silenciosa de partidas | Producto | 3 | 4 | 2 | Gratis | — | 0 informes de partidas perdidas | Corto | **6,0** |
| G20 | Arreglar `/s+/g` en `exportCareer` | Nombre de archivo incorrecto | Calidad | 1 | 5 | 1 | Gratis | — | — | Inmediato | **5,0** |
| G21 | Parches de seguridad (react-router 6.30, vite, vitest) | 8 vulnerabilidades | Seguridad | 2 | 4 | 2 | Gratis | G8 | `npm audit` limpio en producción | Corto | **4,0** |
| G22 | Fichas en itch.io, AlternativeTo y Product Hunt | Cero enlaces externos | Enlaces | 3 | 3 | 1 | Gratis | G1, G7 | Referidos | Corto | **9,0** |
| G23 | Vídeos cortos semanales (TikTok y Shorts) | Sin distribución | Social | 4 | 2 | 3 | Gratis (tiempo) | G7, G11 | Visitas con `utm_source` | Medio | **2,7** |
| G24 | Repo de GitHub: descripción, homepage, topics y LICENSE | Señal y enlace gratuitos | Enlaces | 1 | 4 | 1 | Gratis | — | — | Inmediato | **4,0** |
| G25 | Ranking global con backend | Competición | Retención | 3 | 2 | 5 | Medio | Cuentas, backend | — | — | 1,2 |
| G26 | Más idiomas (PT, FR, IT) | Alcance | SEO | 2 | 2 | 4 | Gratis | Rehacer i18n con claves | — | — | 1,0 |

## 2. Selección

**Las 5 primeras:**
1. G1 + G4: dominio canónico único.
2. G2 + G3: medir.
3. G5: proteger pre.
4. G8: CI y rama protegida.
5. G7 + G12 + G14: mensaje y tarjeta.

**Las 5 para más adelante:**
- G15: guías, una vez indexado.
- G16: estadísticas de carreras.
- G23: vídeos, cuando la tarjeta y la semilla funcionen.
- G10: reto diario, cuando haya medición.
- G21: actualización mayor de dependencias.

**3 que hoy serían perder el tiempo:**
- G25: ranking global con backend.
- G26: más idiomas.
- Publicidad de pago o cualquier campaña: no tiene sentido sin medición y sin un dominio canónico.

## 3. Plan de 30 días (una persona, recursos limitados)

**No se promete ningún número de visitas.** Cada resultado es una hipótesis que se comprueba con su KPI.

### Primeras 24 horas
| Acción | Por qué | Archivos o sitio | Depende de | Tiempo | Resultado esperado | KPI |
|---|---|---|---|---|---|---|
| G1: `SITE_URL` | El canonical apunta a nba.polb.dev | `scripts/gen-pages.mjs`, `index.html`, `public/sitemap.xml`, `public/robots.txt` | Decidir el dominio | 1-2 h | HTML de producción con `anillero.com` | `curl` del canonical |
| G5: proteger pre | Pre es indexable | Cloudflare → Access, o Transform Rule con `X-Robots-Tag` | — | 20 min | Pre devuelve 403 o noindex | `curl -I` |
| G2: Cloudflare Web Analytics | Cero datos | Panel de Cloudflare | — | 10 min | Visitas y CWV reales | Panel |
| G6: HTTPS, HSTS y www | Higiene | Panel de Cloudflare y DNS | — | 15 min | 301 correctas | `curl` |
| G20: bug del export | Trivial | `src/store/store.ts` | — | 5 min | — | Test |

### Primera semana
- **G4:** redirecciones 301 y desactivar `workers.dev`. Hay que hacerlo en la cuenta personal.
- **G3:** Search Console, sitemap y cambio de dirección desde nba.polb.dev.
- **G8:** CI y protección de `main`; publicar en producción solo desde `main` con tag.
- **G12 y G14:** propuesta de valor y OG.
- **G17:** privacidad y aviso legal.
- **G9:** primeros eventos con Umami.

### Semanas 2 y 3
- **G7 y G11:** tarjeta con URL y reto con semilla.
- **G13:** CLS y división del bundle.
- **G19:** migración e importación de partidas.
- **G22 y G24:** directorios y GitHub.
- **G15:** primeras 2 guías en ES (draft y Europa o NCAA).
- Empezar **G23** con 2-3 vídeos de prueba.

### Semana 4
- Revisar la línea base: visitas por canal, activación, `card_share` y GSC (impresiones e indexación).
- Decidir con datos: si la activación es inferior al 40 %, priorizar el onboarding; si las impresiones crecen pero no los clics, priorizar títulos y descripciones; si los `card_share` son bajos, priorizar el reto diario (G10).
- Revisar G18 (marca y legal) antes de cualquier promoción grande.
