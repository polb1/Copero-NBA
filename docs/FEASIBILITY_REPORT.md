# Informe de viabilidad — BBL, VTB, CBA y Lega A (día 0)

Estado: **sondeo del día 0 completado**. El modo sombra de 14 días **no ha empezado**;
este documento se irá rellenando con las métricas reales (no hay resultados inventados).

## Día 0 · cobertura medida (4/11/2026)

| Liga | L1 | L2 | L3 | Peticiones/día | Decisión provisional |
|---|---|---|---|---|---|
| BBL | 🟡 parcial (sólo el día) | ❌ | ❌ | 2 (compartidas) | Go parcial si se acepta "sin histórico" |
| VTB | 🟡 parcial | ❌ | ❌ | 2 (compartidas) | Go parcial |
| CBA | 🟡 parcial (8 partidos el 3/11) | ❌ | ❌ | 2 (compartidas) | Go parcial |
| Lega A | 🟡 parcial | ❌ | ❌ | 2 (compartidas) | Go parcial |

La ventana de fechas de API-Basketball (hoy y ayer) cubre las cuatro a la vez con
**2 peticiones diarias**, así que el presupuesto no es el problema: el problema es la
profundidad (no hay L2 ni L3 en el plan gratuito).

## Huecos por fuente

- **BBL**: la API oficial (`api.basketball-bundesliga.de`) responde **401** sin clave de la liga.
  La cobertura declarada por API-Basketball para 2026-27 es completa (estadísticas de equipo
  y jugador, clasificación), pero está tras el muro del plan de pago.
- **VTB**: la web oficial publica `/wp-json/wp/v2/teams` y `/wp-json/wp/v2/gamestat` (públicos,
  robots permite), pero los objetos sólo traen `game_id`, títulos y enlaces: **sin marcador**.
  La clasificación se sirve en un iframe que llama a `infobasket.su`, el proveedor de la liga;
  usarlo exige revisar sus términos antes (pendiente, no se usa).
- **CBA**: sin web oficial accesible verificada; entra sólo por API-Basketball.
- **Lega A**: sin fuente oficial gratuita encontrada; entra sólo por API-Basketball.

## Qué haría falta para "Go" completo (L1-L3)

Plan **Pro de API-Basketball: 15 $/mes** (7.500 peticiones/día). Con eso:
- Calendario completo y futuro, histórico y clasificación oficial de las cuatro.
- Box score por partido y estadísticas de jugador.
- `coverage` de BBL 2026-27 ya confirma que el dato existe en la plataforma.

## Métricas del modo sombra

| Métrica | Objetivo | Medido |
|---|---|---|
| Disponibilidad | ≥ 95 % | pendiente |
| Completitud L3 a 24 h | ≥ 98 % | no aplica (L3 no disponible gratis) |
| Exactitud | ≥ 99 % | pendiente |
| Conciliación de clasificación | ≥ 95 % | pendiente (necesita ≥ 5 jornadas acumuladas) |
| Presupuesto | ≤ 80 % | ✅ 2 % (2/100) |
| Schema drift | 0 críticas | pendiente |

## Decisión que se necesita

1. **0 €**: publicar L1 de BBL, VTB, CBA y Lega A desde hoy, sin histórico ni estadísticas,
   con la clasificación apareciendo cuando haya 5 partidos por equipo.
2. **15 $/mes**: activar Pro y tener L1-L3 completo de las nueve competiciones.
