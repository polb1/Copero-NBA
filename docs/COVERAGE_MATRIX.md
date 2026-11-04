# Matriz de cobertura · liga × nivel × fuente (día 0)

Medido el 4/11/2026 con las claves reales. Niveles: L1 calendario/resultados/clasificación ·
L2 equipos, escudos, plantillas · L3 box score por partido · L4 play-by-play y avanzadas.

| Liga | Fuente | L1 | L2 | L3 | L4 | Estado |
|---|---|---|---|---|---|---|
| **NBA** | ESPN + balldontlie | ✅ | ✅ 6.758 jugadores | ❌ | ❌ | En producción |
| **ACB** | acb.com + Apify (clasificación) | ✅ | ✅ 18 equipos | ❌ | ❌ | En producción |
| **EuroLeague** | api-live.euroleague.net | ✅ | ✅ 20 equipos | 🟡 marcador y cuartos | ❌ | En producción |
| **GBL (Grecia)** | esake.gr (oficial) | ✅ 26 jornadas | ✅ 14 equipos | 🟡 cuartos en resultados | ❌ | En producción |
| **BSL (Turquía)** | API-Basketball (ventana de fechas) | 🟡 sólo desde el 4/11 | ❌ | ❌ | ❌ | Parcial: sin histórico previo ni plantillas |
| **BBL (Alemania)** | API-Basketball (ventana de fechas) | 🟡 desde el 4/11 | ❌ | ❌ | ❌ | Parcial; API oficial BBL da 401 |
| **VTB (Rusia)** | API-Basketball (ventana de fechas) | 🟡 desde el 4/11 | ❌ | ❌ | ❌ | Parcial; web oficial sin marcadores en JSON |
| **CBA (China)** | API-Basketball (ventana de fechas) | 🟡 desde el 4/11, 8 partidos/día | ❌ | ❌ | ❌ | Parcial |
| **Lega A (Italia)** | API-Basketball (ventana de fechas) | 🟡 desde el 4/11 | ❌ | ❌ | ❌ | Parcial |

## Comprobaciones directas

- `GET /games?date=2026-11-04` → 186 partidos de 37 ligas (plan Free permitido).
- `GET /games?date=2026-11-03` → 333 partidos de 42 ligas, **incluye BBL, VTB y CBA**.
- `GET /games?date=2026-11-01` (pasado) y `2026-11-07` (futuro) → **0 resultados**: la ventana gratuita es hoy y ayer.
- `GET /standings?league=104&season=2026-2027` → bloqueado en Free.
- `GET /games/statistics?id=...` → el endpoint no existe; `statistics` exige league+season+team → bloqueado en Free.
- Cobertura declarada por la API para BBL 2026-27: `games.statistics.teams=true`, `players=true`, `standings=true`, `players=true`. **Está disponible, pero sólo en plan de pago.**

## Consecuencia práctica

Sin pagar se puede mantener L1 diario de las 8 ligas con **2 peticiones/día**, pero:

1. No hay histórico: la clasificación derivada empieza a tener sentido tras varias semanas
   (se publica sólo cuando cada equipo ha jugado ≥ 5 partidos; si no, se omite).
2. No hay plantillas ni box score.
3. El calendario futuro no se conoce por adelantado: se descubre el día que se juega.

## Actualización: publicación desde el primer partido

La clasificación de BSL, BBL, VTB, CBA y Lega A se publica **desde el primer partido
capturado**, marcada como *parcial* en la web (aviso visible en la pestaña Clasificación).
Pasa a considerarse completa cuando cada equipo ha jugado ≥ 5 partidos (`COMPLETA_DESDE`
en `scripts/sync-out-to-site.py`).

Captura: dos pasadas diarias (10:30 y 23:45). La ventana de fechas cubre hoy y ayer, así que
no se pierde ningún partido aunque una de las dos ejecuciones falle.
