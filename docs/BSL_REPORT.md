# BSL (Basketbol Süper Ligi) — informe de fuentes

Fecha: 4 de noviembre de 2026. Temporada en curso: 2026-2027.

## Resumen

| Vía | Resultado |
|---|---|
| `tbf.org.tr` (oficial, TBF) | **Bloqueada**: 403 de Cloudflare con challenge interactivo en todas las rutas (`/ligler/bsl-2026-2027/puan-durumu`, `/maclar`, incluso `/robots.txt`). El challenge se comprobó también con navegador real: exige marcar "verifica que eres humano". **No se resuelve** (regla: sin evasión) |
| `bsl.org.tr` | **410 Gone**; dominio retirado |
| `basketbolsuperligi.com` | Dominio aparcado (94 bytes) |
| `realgm` | 403 |
| `eurobasket.com` | Sin conexión (000) |
| API-Basketball (`league=104`) | Plan Free: `games?league=104&season=2026-2027` → **"Free plans do not have access to this season"**. `games?date=` sí funciona y trae los partidos del día |
| Proballers (liga 168) | 403 Cloudflare |
| Basketball-Reference | Sólo manual, términos restrictivos |

## Lo que sí se obtiene hoy, gratis

- **L1 parcial por ventana de fechas**: 2 peticiones/día (`games?date=hoy` y `?date=ayer`)
  devuelven todos los partidos del día de todas las competiciones; se filtran los de la
  liga 104. El 4/11 no había partidos de BSL; el histórico se irá acumulando.
- **Clasificación derivada** de esos resultados (2 puntos por victoria, 1 por derrota),
  publicada sólo cuando cada equipo ha jugado ≥ 5 partidos.
- **Nada de plantillas ni box score**: `statistics` exige `league+season+team` y el plan
  Free bloquea la temporada.

## Lo que falta y qué haría falta para tenerlo

| Nivel | Qué falta | Cómo se consigue |
|---|---|---|
| L1 completo (calendario futuro, histórico) | Toda la temporada | API-Basketball **Pro (15 $/mes)** |
| L2 (equipos, plantillas, escudos) | 16 plantillas | API-Basketball Pro (`players`) o la web del club |
| L3 (box score) | Parciales, estadísticas por jugador | API-Basketball Pro (`statistics`) |
| L4 | Play-by-play, quintetos | No disponible en API-Basketball; requiere proveedor (Statscore/Broadage) |

## Recomendación

1. **Corto plazo (0 €)**: mantener la captura diaria por ventana de fechas. Da resultados
   reales desde hoy, sin histórico.
2. **Si BSL es prioritaria**: plan Pro de 15 $/mes, que además desbloquea BBL, VTB, CBA y
   Lega A con estadísticas y plantillas. Es la única vía lícita encontrada.
3. **Descartado**: scraping de TBF mientras mantenga el challenge.
