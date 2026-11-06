# Publicación y difusión · checklist

Fecha: 6 de noviembre de 2026.

## Requisitos técnicos (portales)

| Requisito | Estado |
|---|---|
| Carga inicial < 8 MB | ✅ 1,81 MB de JS + assets; `dist/` completo son 35 MB por las 9.031 fichas, pero el juego solo carga `main` (~1,2 MB) y el worker de simulación |
| Funciona en móvil y escritorio | ✅ |
| Sin registro para jugar | ✅ |
| SDK de anuncios del portal | ❌ pendiente (Poki y CrazyGames exigen el suyo) |
| Sin enlaces salientes durante la partida (Poki) | ⚠️ revisar: hoy hay enlaces al portal en el menú; en la build de portal deben ocultarse |
| Guardado en `localStorage` con `try/catch` | ✅ (modo incógnito cubierto) |

## Orden recomendado

1. **CrazyGames** primero: su lanzamiento básico no exige SDK de anuncios, así que sirve
   para medir retención sin integrar nada. Después, "full launch" con su SDK.
2. **Poki** después: exige quitar anuncios y enlaces externos, y su aprobación es manual
   con criterios de retención (>25 % jugando 3+ minutos).
3. **itch.io** en paralelo: gratis, sin requisitos y con comunidad de juegos indie.

## Redes y comunidad (sin presupuesto)

- **TikTok / Shorts**: clips de 15 s de una carrera (draft → anillo). 3 por semana.
- **Reddit**: r/BasketballGM, r/nba (respetando reglas de autopromoción), r/WebGames.
- **Discord** de juegos de gestión y de baloncesto: participar antes de publicar.
- **X**: hilo con la tarjeta compartible de una carrera real.

## Antes de publicar en ningún sitio

- [ ] Search Console verificado y sitemap enviado (267 URLs).
- [ ] Analítica activa (Cloudflare, ya inyectada).
- [ ] Probar la build de portal sin enlaces salientes ni menú del hub.
- [ ] Textos legales revisados (marca NBA, escudos de clubes).
- [ ] Decidir si el reto diario necesita backend antes del lanzamiento (ranking = motivo
      para volver; hoy la racha vive en el navegador).
