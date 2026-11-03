# Fuentes de datos Copero-NBA (estado real, 1 nov 2026)

## Gratuitas / sin límite de pago
- NBA: ESPN site.api.espn.com (standings, scoreboard, rosters, crests)
- EuroLeague: api-live.euroleague.net/v1 + /v2 (standings 20, results 40, fixtures 30, crests oficiales)
- B.League: bleague.jp (standings 12, schedule/month, crests via Wikipedia)
- Noticias: Marca, Gigantes, Relevo, Mundo Deportivo (RSS, 28 artículos hoy con proxy de imagen)

## Pagas / con Apify (token guardado en ~/.hermes/apify.env; $5/mes gratis, $1.96 restantes)
- ACB: sian.agency/basketball-api-scraper (standings 18, schedule 30/30, crests)
- Lega / BBL / LNB / LKL / BSL / Greek / Israeli / NBL Australia / EuroLeague extras: posibles (cada refresco ≈ $0.30-$0.45)

## No disponibles hoy (intentado; bloqueado o sin API pública)
- TheSportsDB: standings bloqueados; solo eventsseason limitado (~15 eventos/temporada)
- Basketball-Reference: /euro/league/2026.html 404; requiere formato diferente
- Flashscore / Sofascore: 403/429 (WAF / bot wall)
- ACB web API interna: acb.com/next (Next.js, no documentado libremente)

## Sondeos 1-nov-2026 (códigos HTTP reales)
- realgm.com / eurobasket.com → 403 (Cloudflare)
- api.basketball-bundesliga.de/api/... → 401 (requiere token)
- api.legabasket.it → no resuelve DNS; legabasket.it renderiza por JS (sin <table> en HTML)
- ESPN ligas ita.1 / ger.1 / esp.1 → sin cobertura (0 eventos)
- basketball-reference.com/euro|acb|italian/league/2026.html → 404
- flashscore / sofascore → 403/429
- NBA (ESPN), EuroLeague (api-live v2), B.League (bleague.jp) → OK y ya integrados
- Apify sian.agency/basketball-api-scraper → OK (ACB completo; BBL/LBA posibles por ~0,35 $/liga)

## Revisión 3-nov-2026 (fuentes verificadas)
| Fuente | Ligas | Oficial | Notas |
|---|---|---|---|
| api-live.euroleague.net | EuroLeague | Sí | v1/v2 públicas, XML/JSON |
| acb.com/es/liga/calendario | Liga ACB | **Sí** | Next.js incrusta el calendario completo como JSON (306 partidos, marcador y estado). Sin clave ni coste. Sustituye a Apify para resultados y próximos (`acb_oficial()` en update-actualidad.py). Marcador del 1-nov (Unicaja 89-92 Barça) coincide con TheSportsDB |
| bleague.jp/schedule | B.League | Sí (web) | Solo devuelve la jornada en curso para cualquier mes; la fecha sale del enlace de entradas |
| site.api.espn.com | NBA | No (sin documentar) | NBL y G League sin eventos en ESPN |
| thesportsdb.com (clave 123) | Lega, BBL, LNB, Grecia, Israel, LKL, BSL, NBL | No (colaborativa) | La clave gratuita da 1 evento en `eventspastleague` y ~15 por temporada |
| Apify sian.agency | Liga ACB (clasificación) | No (tercero) | De pago; ya solo hace falta para la clasificación |

Las fechas de `results.json` y `fixtures.json` se guardan siempre en ISO (`YYYY-MM-DD`); la interfaz las muestra con `fechaCorta`.

## Cadencia y coste (recalculado 3-nov-2026)
- ACB resultados y próximos: **gratis** desde acb.com (`acb_oficial()` en update-actualidad.py).
- Apify solo para **clasificación**: ~0,045 $ por liga y refresco.
- Rutina diaria: clasificación de 1 liga (rotando ACB/BBL/LBA) ≈ 1,35 $/mes.
- Rutina semanal: refresco completo solo BBL y LBA ≈ 1,20 $/mes.
- Total ≈ 2,55 $/mes de los 5 $ del plan gratuito.
- NBA, EuroLeague y B.League: diarios y gratuitos (ESPN / API oficial / bleague.jp).
- Prohibido `git push --force` en main: usar `git pull --rebase origin main` y push normal.
