# Revisión de términos y robots (4/11/2026)

Regla aplicada: ante bloqueo anti-bot **no se evade**. Si la web exige resolver un
challenge, se descarta la fuente y se documenta.

| Fuente | robots.txt | Términos | Decisión |
|---|---|---|---|
| **tbf.org.tr** (BSL oficial) | 403 (Cloudflare, ni el robots se sirve) | No consultables | **Descartada**: challenge interactivo "verifica que eres humano". No se resuelve |
| **bsl.org.tr** | — | — | **Descartada**: HTTP 410 Gone |
| **esake.gr** (GBL oficial) | 404 (sin restricciones publicadas) | Contenido del organizador (ΕΣΑΚΕ) | **Aceptada** con atribución, User-Agent identificable, 1,2 s entre peticiones y caché 3 h |
| **api-sports.io** | n/a | Plan gratuito permite uso con atribución y cuota | **Aceptada** (cuota 100/día) |
| **proballers.com** | 200 (permite) | No revisables sin superar el challenge | **Descartada** técnicamente: 403 Cloudflare |
| **api.basketball-bundesliga.de** | n/a | Requiere clave | **Descartada**: 401 |
| **vtb-league.com** | Permite todo salvo `/wp/wp-admin/` | Web oficial | **Parcial**: `/wp-json/wp/v2/teams` y `/gamestat` son públicos, pero no exponen marcadores ni box score. La clasificación va en un iframe con API propia (`infobasket.su`) → *pendiente de revisar términos antes de usarla* |
| **ESPN** | n/a | Prohíbe uso comercial sin licencia | **En uso con riesgo declarado**; alternativa con licencia: balldontlie GOAT (9,99 $/mes) |
| **EuroLeague api-live** | n/a | Endpoint público no documentado | **En uso**; puede cambiar sin aviso |
| **balldontlie** | n/a | Free: 5 req/min | **Aceptada** |
| **Apify** | n/a | Términos de la plataforma | **Aceptada**, con presupuesto |

## Riesgos abiertos

1. **ESPN**: uso comercial de sus datos sin licencia. Si anillero.com se monetiza, hay que sustituirlo por un proveedor con licencia.
2. **EuroLeague**: endpoint no documentado; sin SLA.
3. **esake.gr**: no hay API; un rediseño rompe el parser (mitigado con detección de cambios y fallo aislado).
4. **Infobasket (VTB)**: no se usará hasta revisar sus términos; hoy VTB entra sólo por la ventana de fechas de API-Basketball.
