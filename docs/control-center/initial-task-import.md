# Importación inicial · Control Center

Datos en `src/control-center/seed.ts`. Se cargan con el botón **Importar desde auditorías** del Dashboard (`POST /api/cc/import`), una vez por entorno. Es idempotente: cada elemento tiene un `source_ref` único por entorno y repetir la importación no duplica nada (prueba T20).

## Fuentes revisadas

- `docs/audit/08-prioritized-roadmap.md` (backlog G1–G26) y `docs/audit/11-quick-wins.md`
- `docs/audit/12-domain-migration-and-environments.md`
- `auditoria-web-2026-11-20.md` (errores E1–E8, incidencias I1–I16, mejoras M1–M13)
- `docs/auditoria-lighthouse-anillero.md` y `docs/auditoria-lighthouse-anillero-ejecucion.md` (pendientes P0-1, P1-1, P1-8, TBT y comprobaciones)
- `docs/lighthouse/` (resultados de las mediciones citadas en la ejecución)
- El código de `main` en el commit 00ff3b4, para comprobar el estado real de algunas tareas (por ejemplo, `src/store/store.ts:126` sigue con `/s+/g` y no existe `.github/workflows`).

## Reglas aplicadas

1. **Nada entra como «Hecho»** y `verified = 0` en todas. Lo que un commit dice haber arreglado entra en **«En revisión»** (G1, G2, G17) o como **incidencia abierta** con la nota «verificar» (E1–E6): solo se cierra cuando alguien compruebe los criterios en producción.
2. **Cada tarea tiene evidencia** (archivo y sección de la auditoría, y a veces el archivo de código) y **criterios de terminado** comprobables (un `curl`, una medición, un test).
3. **Responsable:** todas «Sin asignar». El campo de sugerencia queda vacío porque las auditorías no nombran a nadie; no se ha inventado.
4. **Fechas límite:** ninguna. Las auditorías hablan de plazos relativos («primera semana»), no de fechas.
5. **Prioridad:** P0 para lo que la auditoría pone en «primeras 24 horas» y afecta al dominio o a la seguridad; P1 para la primera semana; P2/P3 para el resto. El **peso** en el hito es el «Impacto» (I) de la auditoría cuando existe.
6. **Tareas e incidencias no se duplican:** las acciones del backlog son tareas; los problemas detectados (E*, I*) son incidencias, que se convierten en tarea con un clic cuando alguien las coja.

Se dejaron fuera, por ser de la propia auditoría «para no hacer ahora» o estar cubiertas por otra tarea: G16, G23, G25, G26 (la auditoría los aplaza), M4, M7 y M13 (van dentro de M3, G14 y G6), y I2–I4, I7–I10, I13 y M8–M11, que los commits 22ce51e y 00ff3b4 dicen haber resuelto. Estos últimos **no están verificados en producción**: la tarea LH-CHECKS cubre esa comprobación, y si alguno falla se añade como incidencia.

## Contenido

### Tareas (30)

| Ref | Tarea | Estado | Prioridad | Categoría | Hito | Peso |
|---|---|---|---|---|---|---|
| G1 | SITE_URL por entorno en el build (canonical, hreflang, OG, sitemap, robots) | review | P0 | SEO | Dominio único y entornos separados | 5 |
| G2 | Cloudflare Web Analytics solo en producción | review | P1 | Marketing | Medición | 4 |
| G3 | Search Console de dominio anillero.com y envío del sitemap | backlog | P1 | SEO | Medición | 4 |
| G4 | 301 de nba.polb.dev, pre-nba.polb.dev y *.workers.dev a anillero.com | backlog | P0 | Seguridad/infra | Dominio único y entornos separados | 5 |
| G5 | Proteger pre.anillero.com con Cloudflare Access y noindex | backlog | P0 | Seguridad/infra | Dominio único y entornos separados | 4 |
| G6 | «Always Use HTTPS», HSTS y www → raíz | backlog | P1 | Seguridad/infra | Dominio único y entornos separados | 2 |
| G7 | URL y CTA en la tarjeta PNG compartida | backlog | P2 | Marketing | Distribución y crecimiento | 4 |
| G8 | CI en GitHub Actions (typecheck, test, build) y main protegida | backlog | P1 | Desarrollo | Calidad y seguridad | 3 |
| G9 | Eventos de embudo (career_start, first_decision, career_retire, card_share) | backlog | P2 | Marketing | Medición | 4 |
| G10 | Recuperar el reto diario/semanal en la UI | backlog | P3 | Desarrollo | Distribución y crecimiento | 4 |
| G11 | Reto con semilla compartible (/start?seed=) | backlog | P2 | Desarrollo | Distribución y crecimiento | 4 |
| G12 | Propuesta de valor en la cabecera | backlog | P2 | Diseño/UX | Distribución y crecimiento | 3 |
| G13 | Dividir el bundle del simulador (plantillas y motor bajo demanda) | backlog | P2 | Rendimiento | Rendimiento y Core Web Vitals | 3 |
| G14 | Imagen OG de 1200×630 por idioma | backlog | P2 | Diseño/UX | Distribución y crecimiento | 3 |
| G15 | Hub de guías en español (draft, posiciones, Europa o NCAA) | backlog | P3 | SEO | Contenido e indexación | 4 |
| G17 | Revisar páginas de privacidad y aviso legal | review | P2 | Administración | Medición | 3 |
| G18 | Decisión de marca y revisión legal del uso de «NBA» y logos | backlog | P2 | Administración | — | 4 |
| G19 | Migración real de partidas (migrate()) e importación del JSON | backlog | P1 | Desarrollo | Calidad y seguridad | 3 |
| G20 | Arreglar la regex /s+/g de exportCareer | todo | P2 | Desarrollo | Calidad y seguridad | 1 |
| G21 | Parches de seguridad de dependencias (npm audit) | backlog | P2 | Seguridad/infra | Calidad y seguridad | 2 |
| G22 | Fichas en itch.io, AlternativeTo y Product Hunt | backlog | P2 | Marketing | Distribución y crecimiento | 3 |
| G24 | Repo de GitHub: descripción, homepage, topics y LICENSE | backlog | P3 | Administración | — | 1 |
| LH-P0-1 | Estudiar hidratación (hydrateRoot) de la portada | backlog | P2 | Rendimiento | Rendimiento y Core Web Vitals | 4 |
| LH-P1-1 | Cargar AdSense tras load o la primera interacción | backlog | P2 | Rendimiento | Rendimiento y Core Web Vitals | 2 |
| LH-P1-8 | CSP completa compatible con Turnstile y AdSense | backlog | P2 | Seguridad/infra | Calidad y seguridad | 2 |
| LH-TBT | Medir window.__HUB__ y el TBT de la portada en móvil | backlog | P2 | Rendimiento | Rendimiento y Core Web Vitals | 2 |
| LH-CHECKS | Comprobaciones pendientes: 439 URLs del sitemap en local, diff visual y pruebas del simulador | todo | P1 | Desarrollo | Calidad y seguridad | 2 |
| M1 | Más contenido en las fichas /jugador/* | backlog | P2 | SEO | Contenido e indexación | 4 |
| M2 | Más contenido en las páginas /equipo/* | backlog | P3 | SEO | Contenido e indexación | 3 |
| M3 | Acortar títulos de más de 60 caracteres y unificar el sufijo «| Anillero» | backlog | P3 | SEO | Contenido e indexación | 2 |

### Incidencias (16)

| Ref | Incidencia | Gravedad | Categoría |
|---|---|---|---|
| E1 | /en y /ca redirigían a /start (noindex) | alta | SEO |
| E2 | Etiqueta «Hall of Fame» falsa en fichas de jugador | alta | SEO |
| E3 | Descripciones «en la NBA» con equipos que no son de la NBA | media | SEO |
| E4 | Nombres de equipo duplicados («Real Madrid Real Madrid») | media | SEO |
| E5 | 191 enlaces internos a /equipo/* que no existen | alta | SEO |
| E6 | Jugadores duplicados en dos URLs | media | SEO |
| E7 | http://anillero.com no redirige a https | alta | Seguridad/infra |
| E8 | 500 cacheados en tres fichas del CDN | media | Seguridad/infra |
| I1 | Portada: LCP móvil alto | alta | Rendimiento |
| I5 | /noticias: LCP móvil 8,9 s y CLS 0,15 | media | Rendimiento |
| I6 | /equipo/* en móvil: TBT de 880 ms | baja | Rendimiento |
| I11 | Barra final con 307 en vez de 301/308 | baja | SEO |
| I12 | CSP bloquea Turnstile en /auth/* | media | Seguridad/infra |
| I14 | La página 404 carga AdSense | media | Marketing |
| I15 | /jugadores pesa 476 KB (19.000 palabras) | baja | SEO |
| I16 | /hall-of-fame/* sin JSON-LD y 109 KB de media | baja | SEO |

### Hitos (6)

- **Dominio único y entornos separados:** anillero.com como único host indexable; pre.anillero.com protegido y fuera de Google.
- **Medición:** Analítica, Search Console y embudo para decidir con datos.
- **Rendimiento y Core Web Vitals:** LCP < 2,5 s y CLS < 0,1 en campo en las plantillas principales.
- **Contenido e indexación:** Fichas y equipos con contenido suficiente y datos correctos.
- **Distribución y crecimiento:** Tarjeta compartible, retos y presencia en directorios.
- **Calidad y seguridad:** CI, dependencias, cabeceras y partidas sin pérdidas.
