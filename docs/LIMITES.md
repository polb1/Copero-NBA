# Límites de las fuentes (medidos el 4/11/2026)

| Fuente | Plan | Cuota | Medido |
|---|---|---|---|
| API-Basketball (api-sports.io) | Free | 100 peticiones/día, reset 00:00 UTC | `GET /status` → `limit_day: 100`, `current: 0`. Verificado que el plan Free **sólo abre temporadas 2022-2024** |
| balldontlie | Free | 5 peticiones/minuto | 429 al tercer intento seguido. Paginación por `cursor`, ~6.758 jugadores |
| Apify | Free | 5 $/mes | 3,04 $ consumidos a 4/11/2026; guarda de 1,20 $ antes de refrescar |
| ESPN (`site.api.espn.com`) | Público | Sin cuota publicada | Estable con 1 llamada por bloque; se usa caché |
| EuroLeague (`api-live.euroleague.net`) | Público | Sin cuota publicada | Estable; 20 equipos por temporada |
| esake.gr (GBL) | Web oficial | Sin cuota; cortesía 1,2 s | 26 jornadas seguidas sin bloqueo |
| Proballers | — | — | **403 Cloudflare** (challenge). Descartada |
| TBF (`tbf.org.tr`) | — | — | **403 + challenge interactivo**. Descartada |
| BBL (`api.basketball-bundesliga.de`) | — | — | **401** (requiere clave de la liga) |
| Basketball-Reference | — | — | Restrictivo; sólo verificación manual |

## Consumo diario del pipeline actual

| Job | Peticiones |
|---|---|
| `ingest.py run` (ventana hoy + ayer) | **2** de API-Basketball |
| GBL (esake.gr) | 2-3 (con caché de 3 h) |
| NBA / ACB / Euroliga | 0 (usan los JSON ya generados por `update-actualidad.py`) |

Total API-Basketball: **2/100 (2 %)**. Margen enorme.
