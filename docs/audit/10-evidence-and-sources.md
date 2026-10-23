# 10 · Evidencias, fuentes y limitaciones

## Fuentes externas consultadas (23-10-2026)

| URL | Para qué |
|---|---|
| https://anillero.com/ (+ `/en/`, `/ca/`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js`) | HTML servido, cabeceras y medición en móvil |
| https://pre.anillero.com/ (ídem) | Ídem |
| https://nba.polb.dev/, https://pre-nba.polb.dev/ | Hosts duplicados |
| https://copero-x-nba.anillero-project.workers.dev/, https://copero-nba-pre.anillero-project.workers.dev/ | Hosts duplicados |
| https://api.github.com/repos/polb1/Copero-NBA (y `/branches`, `/pulls`) | Visibilidad, licencia, ramas y PRs |
| https://www.googleapis.com/pagespeedonline/v5/runPagespeed | Intento de PSI (cuota agotada) |
| https://hoopdreams.io/guides/nba-career-simulator | Competidor |
| https://www.mynbacareer.com/ | Competidor |
| https://draftboundsim.com/ | Competidor |
| https://basketball-gm.com/ | Competidor de un género adyacente |
| Resultados de búsqueda: «basketball career simulator browser game free create player NBA draft», «simulador carrera NBA navegador gratis crear jugador», `site:anillero.com`, `site:nba.polb.dev` | Panorama de las SERP (el buscador de la herramienta **no es Google**) |
| Otras webs vistas en los resultados (sin visitar): https://pitchinglab.pitchergami.com/hoops, https://www.airball.gg/career-mode, https://basketballcareersimulator.com/ | Competidores |

## Evidencias internas

| Hallazgo | Evidencia |
|---|---|
| Dominio antiguo en el canonical | `scripts/gen-pages.mjs:5`; `index.html:15-19, 23, 35-36`; `curl -s https://anillero.com/ \| grep canonical` |
| Versión en cada dominio | `assets/main-*.js` servido (anillero.com y nba.polb.dev: `DkKkEaNh` = `df99907`; pre.anillero.com y pre-nba.polb.dev: `B601qlMJ` = `f3925bf`) y builds locales |
| Mapa de Workers y ramas | Panel de Cloudflare (22-10-2026): Workers & Pages, Settings → Builds, Domains y Deployments de cada worker |
| Rollback fijado en nba.polb.dev | Panel → Deployments: la versión activa `67251ebb` aparecía por debajo de 3 versiones más nuevas |
| Despliegue manual en anillero.com | `wrangler deploy` del 22-10-2026, versión `9d3b92a0-edae-43aa-87b7-cd76d38675fb` |
| Tests, build y audit | Salidas guardadas en `%TEMP%/audit-out/` (fuera del repo) |
| Medición en móvil | `scratchpad/audit-prod/result.json`, `scratchpad/audit-pre/result.json` y capturas `first-screen.png`, `start.png` y `first-decision.png` (fuera del repo) |

## Hechos, inferencias e hipótesis

- **Hechos:** todo lo verificado con `curl`, Git, tests, build, Playwright o el panel de Cloudflare.
- **Inferencias:** que Google no tenga indexado anillero.com; la causa del CLS de 2,0 con la red limitada.
- **Hipótesis:** volúmenes de búsqueda, competencia en ES y CA, puntos de abandono y el impacto de cada acción de crecimiento.

## Limitaciones del análisis

- Sin acceso a Search Console de anillero.com, analítica, logs, la configuración de seguridad de GitHub ni herramientas de volumen de palabras clave.
- El buscador de la herramienta no es Google y no garantiza el operador `site:`.
- No se jugó una carrera completa en esta auditoría. El motor está cubierto por 239 tests que simulan carreras completas (`autopilot.ts`, `career.test.ts`, `retirement.test.ts`).
- Durante la auditoría el repositorio cambió (`pre` avanzó a `f3925bf`). Este informe refleja ese commit.
- La revisión legal señala riesgos, pero **no es asesoramiento jurídico**.
- El contraste de colores y la navegación con teclado no se midieron.
