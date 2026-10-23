# 00 · Resumen ejecutivo — Auditoría de NBA Legacy (Anillero)

**Fecha:** 23-10-2026.

**Código auditado:** rama `pre` de GitHub (`f3925bf`), que contiene todo `main` (`ea2557d`) y 17 commits más. Las diferencias con producción se detallan en [12-domain-migration-and-environments.md](12-domain-migration-and-environments.md).

**Entornos:**
- Producción: https://anillero.com/
- Preproducción: https://pre.anillero.com/
- Dominio antiguo: `nba.polb.dev`, que sigue activo.

**Nombre del producto:** dentro del juego, en el `<title>`, en el manifest y en el JSON-LD la marca sigue siendo **«NBA Legacy»**. «Anillero» solo aparece como dominio. Esta discrepancia de marca tiene que decidirla el propietario (ver §5).

## 1. Veredicto en una frase

NBA Legacy es un **MVP funcional de buena calidad técnica**, con un motor de simulación sólido y muy testeado. Comercialmente está en **fase de prototipo**: no mide nada, Google no lo ha indexado y su configuración de dominios le dice a Google que la página principal es otra.

## 2. Estado general

| Dimensión | Nivel | Comentario |
|---|---|---|
| Calidad del código | **Alta** (75/100) | TypeScript estricto sin errores, motor puro y determinista, 239 tests en verde. |
| Madurez funcional | **MVP funcional / beta temprana** (≈65-75 % de lo planteado) | El bucle principal funciona de los 18 años a la retirada. Hay huecos: el reto diario no tiene interfaz, la documentación está desfasada y no se puede importar una partida. |
| Madurez comercial | **Prototipo** (25/100) | Sin analítica, sin páginas legales, marca ambigua, sin canales de comunidad. |
| Capacidad de captar tráfico | **Muy baja ahora mismo** (15/100) | Canonical apuntando a otro dominio, 6 hosts duplicados indexables, solo 3 URLs indexables y portada sin indexar en Google. |
| Confianza de esta evaluación | **Media-alta** | Código, tests, build, HTTP y comportamiento en móvil verificados. Sin acceso a Search Console de anillero.com ni a datos de tráfico. |

Nivel global de madurez: **MVP funcional**. No llega a «beta pública», porque no mide nada y no puede saber si alguien juega.

### Puntuaciones por área (0-100)

**Escala:**
- 0-30: ausente o con fallos graves
- 31-60: existe, pero con carencias importantes
- 61-80: correcto
- 81-100: sólido y verificado

| Área | Nota | Evidencia principal |
|---|---|---|
| Arquitectura | 78 | Motor puro y determinista, Web Worker, capas claras. Penaliza: `store.ts` mezcla responsabilidades y `Play.tsx` tiene 860 líneas. |
| Calidad del código | 75 | 0 errores de tipos, 0 TODO, 0 `innerHTML`. Bug en `exportCareer`. Sin linter. |
| Funcionalidad | 72 | Bucle completo testeado. Reto diario sin UI; guardado frágil. |
| Experiencia de usuario | 68 | 2 acciones hasta jugar, buen diseño móvil. No dice «gratis» arriba; botón deshabilitado al entrar. |
| Diseño visual | 75 | Coherente y cuidado (capturas) |
| Rendimiento | 55 | FCP ~0,8 s, pero LCP ~3 s, CLS ≥ 0,14 y JS de 768 kB (laboratorio) |
| SEO técnico | 20 | Canonical a otro dominio, 6 hosts duplicados, HTTP sin redirección. Lo demás, correcto. |
| SEO de contenidos | 35 | Landing buena en 3 idiomas, pero solo 3 URLs |
| Seguridad | 60 | Sin secretos ni backend. 8 vulnerabilidades (casi todas de desarrollo); sin cabeceras de seguridad; pre abierto. |
| Accesibilidad | 65 | `alt`, etiquetas y `lang` correctos. Contraste y teclado no medidos. |
| Testing | 85 | 239 tests en verde, incluidas carreras completas. Sin E2E en el repo ni CI. |
| Mantenibilidad | 62 | Documentación desfasada; i18n frágil (claves = texto ES); sin CI ni PRs |
| Despliegue y fiabilidad | 35 | Producción ≠ `main`; rollbacks que fijan versiones; 4 Workers en 2 cuentas |
| Analítica y medición | 0 | No existe |
| Preparación para crecer | 25 | Sin medición, marca ambigua, sin legales ni canales |

Las áreas críticas (SEO técnico, analítica, despliegue) pesan más que la media. Por eso el nivel global es «MVP funcional», aunque el código esté por encima.

## 3. Los cinco problemas más graves

1. **Canonical, hreflang, Open Graph, sitemap y robots apuntan a `nba.polb.dev`** (`scripts/gen-pages.mjs:5`, `index.html:15-36`, `public/sitemap.xml`, `public/robots.txt`). Producción le dice a Google que la página «buena» es el dominio antiguo. *Hecho verificado en el HTML servido.*
2. **El mismo sitio se sirve en 6 hosts públicos indexables**: anillero.com, nba.polb.dev, pre.anillero.com, pre-nba.polb.dev y dos `*.workers.dev`. Ninguno lleva `noindex` ni redirige. Preproducción compite con producción. *Hecho.*
3. **No hay ninguna medición.** No hay analítica en el código, Cloudflare Web Analytics no consta como activo y no hay Search Console para anillero.com, o al menos no está verificado. Es imposible saber si «hay poco tráfico» o cuánto hay. *Hecho para el código; el resto, no verificable.*
4. **Los despliegues son frágiles y no reflejan `main`.** Producción sirve `df99907` por un rollback manual. El próximo push a `main` la cambiará sin avisar. No hay CI, ni ramas protegidas, ni PRs. Un rollback en Cloudflare deja la versión «fijada» y los builds siguientes no se activan, que es lo que le pasó a nba.polb.dev. *Hecho.*
5. **Riesgo de marca y legal.** El nombre «NBA Legacy» usa la marca NBA. Los logos de la NBA se cargan desde `cdn.nba.com`, y hay 168 escudos de clubes de Wikipedia, nombres reales de jugadores y datos extraídos de ESPN. Existe un aviso de «proyecto independiente», pero no hay política de privacidad, aviso legal ni licencia. *Requiere asesoramiento jurídico; aquí solo se señala el riesgo.*

Problemas importantes que no entran en el top 5:
- 8 vulnerabilidades en dependencias. Casi todas afectan solo al servidor de desarrollo; la de React Router es de severidad alta, pero el riesgo real es bajo con HashRouter.
- CLS de 0,14 o más en la portada móvil.
- Bug en el nombre del JSON exportado (`store.ts`, `/s+/g`).
- Partidas guardadas que se borran en silencio si cambia `SAVE_VERSION`.
- Cada guardado ocupa 0,55-0,63 MB de `localStorage`.

## 4. Potencial

Hay hueco para el producto, pero el nicho está concurrido. Hay al menos 6 simuladores de carrera de baloncesto gratuitos en navegador, como HoopDreams, DRAFTBOUND, My NBA Career Simulator o Build a Baller. Varios ya tienen guías SEO, retos, tablas de clasificación y PWA.

Las ventajas reales de NBA Legacy:
- Plantillas reales 2026-27, con 137 clubes y 42 ligas.
- Tres idiomas, incluido el **catalán**, que no ofrece ningún competidor detectado.
- Partida corta en modo Exprés y minijuegos.
- Tarjeta PNG para compartir.

El mercado hispanohablante parece menos disputado. Es una **hipótesis**: no hay datos de volumen de búsqueda.

## 5. Decisiones que necesita el propietario

- **Marca:** ¿«NBA Legacy» o «Anillero»? Afecta al título, al JSON-LD, al manifest, al Open Graph y al riesgo legal.
- **Dominio único:** ¿se redirige `nba.polb.dev` con un 301 a `anillero.com`?
- **Herramienta de analítica.** Recomendación: Cloudflare Web Analytics o Umami/Plausible, sin cookies. Ver [07](07-analytics-plan.md).
- **Preproducción:** ¿protegerla con Cloudflare Access o, como mínimo, con `X-Robots-Tag: noindex`?

## 6. Índice de informes

| Archivo | Contenido |
|---|---|
| [01-project-inventory.md](01-project-inventory.md) | Arquitectura, inventario y diagramas |
| [02-feature-maturity.md](02-feature-maturity.md) | Estado de cada funcionalidad y % terminado |
| [03-github-security.md](03-github-security.md) | Repositorio, historial, dependencias, seguridad y CI/CD |
| [04-technical-seo.md](04-technical-seo.md) | SEO técnico e indexación |
| [05-performance-ux.md](05-performance-ux.md) | Rendimiento, UX, accesibilidad y conversión |
| [06-traffic-growth-strategy.md](06-traffic-growth-strategy.md) | Diagnóstico de tráfico, competidores y estrategia |
| [07-analytics-plan.md](07-analytics-plan.md) | Eventos, embudo, KPI y cuadro de mando |
| [08-prioritized-roadmap.md](08-prioritized-roadmap.md) | Backlog priorizado y plan de 30 días |
| [09-test-results.md](09-test-results.md) | Pruebas ejecutadas y resultados |
| [10-evidence-and-sources.md](10-evidence-and-sources.md) | Fuentes, evidencias y limitaciones |
| [11-quick-wins.md](11-quick-wins.md) | Mejoras rápidas: 1 día, 1 semana, 1 mes |
| [12-domain-migration-and-environments.md](12-domain-migration-and-environments.md) | Dominios, entornos y migración |
