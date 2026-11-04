# Fuentes de datos de anillero.com

Actualizado: 4 de noviembre de 2026.
Alcance cerrado: **NBA, Liga ACB, Euroliga, BSL (Turquía) y GBL (Grecia)**.

Regla general: una sola pieza (`ingest.py`) consulta las fuentes y escribe JSON en `out/`.
La web nunca llama a la fuente. Sin evasión de CAPTCHAs ni bloqueos; si una web lo exige,
se descarta y se anota aquí.

---

## 1. NBA

- **Fuente usada:** endpoints públicos de ESPN (`site.api.espn.com/apis/site/v2/sports/basketball/nba/...`).
- **Términos revisados:** ESPN prohíbe el uso comercial de sus datos sin licencia. Uso actual: marcadores y clasificación con atribución; **riesgo legal pendiente de revisión**. Alternativa con licencia: balldontlie (plan GOAT, 9,99 $/mes) o API-Basketball.
- **Frecuencia:** resultados y calendario cada 3 h; clasificación cada 6 h.
- **Límites:** sin clave, pero con rate limiting por IP. Se usa caché y una llamada por bloque.
- **Riesgo:** medio. Es la única fuente gratuita y estable para NBA en la actualidad.

## 2. Liga ACB (Liga Endesa)

- **Fuentes usadas:** web oficial `acb.com` para resultados y calendario (`acb_oficial()` en `scripts/update-actualidad.py`); **Apify** (`sian.agency~basketball-api-scraper`) sólo para la clasificación.
- **Términos revisados:** `acb.com` no publica API oficial; se parsea el HTML público. Apify opera bajo sus propios términos y el actor declara datos públicos.
- **Frecuencia:** resultados/calendario diarios (cron 10:00); clasificación semanal (lunes 10:10) por coste: ~0,40 $ por refresco, presupuesto 1,20 $ de guarda.
- **Límites:** plan gratuito de Apify = 5 $/mes. Consumido ~3,04 $ a 4/11/2026.
- **Riesgo:** bajo en resultados; el coste es el límite real de la clasificación.

## 3. Euroliga

- **Fuente usada:** API oficial `https://api-live.euroleague.net` (`/v1`, `/v2/competitions/E/seasons/E2026/games`).
- **Términos revisados:** API pública que alimenta la web oficial de EuroLeague; no documentada como servicio de terceros. Uso informativo con atribución.
- **Frecuencia:** cada 3 h (resultados y calendario); clasificación cada 6 h.
- **Límites:** sin clave; responde JSON estable. 20 equipos, ~40 resultados por temporada en curso.
- **Riesgo:** bajo técnico, medio legal (endpoint no documentado, puede cambiar).

## 4. BSL — Basketbol Süper Ligi (Turquía) · **prioridad máxima**

Fuentes oficiales comprobadas y **descartadas**:

| Candidata | Resultado | Motivo |
|---|---|---|
| `bsl.org.tr` | HTTP 410 Gone | Dominio retirado |
| `tbf.org.tr` (TBF) | 403 + challenge Cloudflare | Bloqueo anti-bot. **No se evade** |
| `basketbolsuperligi.com` | 94 bytes | Dominio aparcado |
| `basketball.realgm.com` | 403 | Bloqueo |
| `basketball.eurobasket.com` | sin conexión | Inaccesible |

- **Fuente usada:** **API-Basketball** (`v1.basketball.api-sports.io`), liga `97`, plan gratuito.
- **Términos revisados:** api-sports.io permite uso del plan gratuito con atribución y límite de peticiones.
- **Límites:** **100 peticiones/día** en el plan gratuito. Consumo previsto: 2 peticiones por refresco (calendario + clasificación) → hasta 50 refrescos/día, muy por encima de lo necesario.
- **Clave:** obligatoria, gratuita en <https://dashboard.api-sports.io>. Guardada en `~/.hermes/apisports.env` con `chmod 600`; nunca en el repositorio.
- **Comprobado el 4/11/2026 con la clave real (liga 104 = Super Ligi):**
  - `GET /status` → plan **Free**, 100 peticiones/día, cuenta de Dario.
  - `GET /standings?league=104&season=2026-2027` → **bloqueado**: `"Free plans do not have access to this season, try from 2022 to 2024"`.
  - `GET /games?league=104&season=2026-2027` → **bloqueado** por el mismo motivo.
  - `GET /games?date=...` → funciona, pero **sólo devuelve el día actual**; otras fechas salen vacías. Hoy no había partidos de la liga 104.
- **Conclusión:** el plan gratuito **no puede cubrir la temporada en curso**. Para BSL hace falta el plan **Pro (15 $/mes, 7.500 peticiones/día)**, que desbloquea todas las temporadas y competiciones.
- **Estado:** adaptador escrito (`adapters/bsl_apisports.py`, liga 104). No genera `out/bsl_*.json` mientras el plan no desbloquee la temporada.
- **Riesgo:** bajo técnico; el único límite es el plan.

## 5. GBL — Greek Basketball League (Grecia) · **prioridad máxima**

- **Fuente usada:** **web oficial `esake.gr`** (ΕΣΑΚΕ), HTML público server-side:
  - `/el/action/EsakeRanking` → clasificación completa (PJ, V-D, puntos a favor/en contra, diferencia).
  - `/el/action/EsakeResults?series=NN` → calendario y resultados por jornada (26 jornadas), con cuartos.
  - `/el/action/EsakegameView?idgame=...` → ficha de partido (usada para validar).
- **Términos revisados:** `robots.txt` devuelve **404** (no hay restricciones publicadas). No hay API documentada; se parsea HTML público con `User-Agent` identificable, 1,2 s entre peticiones y caché de 3 h.
- **Frecuencia:** calendario y resultados cada 3 h; clasificación cada 6 h; en vivo cada 5 min sólo si hay partido próximo o en juego.
- **Límites:** 1 petición por jornada (26) + 1 de clasificación. Con caché, un refresco normal son 2-3 peticiones.
- **Validación (4/11/2026):** clasificación 14 equipos (PAOK 5-0, 10 pts, 390-357); jornada 5 `VIKOS ΦALCONS 95–84 ΑΕΚ` confirmada contra la ficha oficial del partido (`idgame=F744FDDE`), con pabellón y hora.
- **Riesgo:** medio-bajo. Sin API, un rediseño de la web rompe el parser; por eso el adaptador falla de forma aislada y avisa.

---

## Resumen de frecuencias

| Liga | Resultados/calendario | Clasificación | En vivo |
|---|---|---|---|
| NBA | 3 h | 6 h | 5 min (si aplica) |
| ACB | diario 10:00 | semanal (Apify) | — |
| Euroliga | 3 h | 6 h | 5 min (si aplica) |
| BSL | 3 h | 6 h | 5 min (si aplica) |
| GBL | 3 h | 6 h | 5 min (si aplica) |

## Presupuesto

- API-Basketball: 100 peticiones/día (contador en `out/.state.json`).
- Apify: 5 $/mes; guarda de 1,20 $ antes de cada refresco.
- Resto de fuentes: gratis, con caché y cortesía de 1,2 s.

## Qué falta y por qué

1. **BSL sin clave** de API-Basketball: es el único bloqueo. Sin ella no hay datos turcos.
2. **Estadísticas de jugador** en ACB/Euroliga/BSL/GBL: ninguna fuente gratuita las ofrece completas. Se dejan vacías, nunca inventadas. Proveedores que sí las cubren: Goalserve, enetpulse, Statscore, Broadage (de pago).
3. **Marcador en directo real** (cuarto a cuarto) sólo lo da API-Basketball en su plan gratuito para BSL; para el resto habría que contratar un feed en vivo.
