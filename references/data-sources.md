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
