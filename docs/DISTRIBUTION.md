# Publicación y difusión · checklist

Fecha: 7 de noviembre de 2026. Estado: **listo para publicar**; backend desplegado, build verificada.

## Requisitos técnicos (portales)

| Requisito | Estado |
|---|---|
| Carga inicial < 8 MB | ✅ 1,81 MB de JS + assets; `dist/` completo son 35 MB por las 9.031 fichas, pero el juego solo carga `main` (~1,2 MB) y el worker de simulación |
| Funciona en móvil y escritorio | ✅ |
| Sin registro para jugar | ✅ |
| SDK de anuncios del portal | ❌ pendiente (Poki/CrazyGames exigen su SDK; itch.io no requiere) |
| Sin enlaces salientes durante la partida (Poki) | ✅ build de portal (`/play`) sin enlaces salientes; menú del hub oculto en build de portal |
| Guardado en `localStorage` con `try/catch` | ✅ (modo incógnito cubierto) |

## Orden recomendado

1. **CrazyGames** (lanzamiento básico): sin SDK obligatorio, mide retención real. Luego "full launch" con SDK y revenue share 50/50.
2. **Poki** (full launch obligatorio): exige SDK propio, sin enlaces salientes, sin anuncios propios. Aprobación manual con criterio de retención >25% a 3 min.
3. **itch.io** (paralelo): gratis, sin requisitos, comunidad indie. Sirve para feedback temprano y SEO long-tail.

## Builds específicas por portal

| Portal | Build | Qué cambia |
|---|---|---|
| Web propia (anillero.com) | Completa | Menú completo, analytics, enlaces a `/jugadores`, `/hall-of-fame`, `/start` |
| CrazyGames (básico) | `dist/` sin cambios | Solo ocultar menú superior (`display:none` en `.top nav`) |
| CrazyGames (full) | Build dedicada | SDK de CG, sin analytics propio, revenue share 50/50 |
| Poki | Build dedicada | SDK de Poki, sin enlaces salientes, sin analytics propio, sin ads |
| itch.io | `dist/` comprimido .zip | Solo ocultar analytics, añadir `itch.io` metadata |

## Redes y comunidad (sin presupuesto)

- **TikTok / Reels / Shorts**: clips de 15-30 s (draft → anillo, tarjeta final). 3/semana.
- **Reddit**: r/BasketballGM, r/nba (solo días permitidos), r/WebGames, r/IndieDev.
- **Discord**: servidores de Basketball GM, Baloncesto, Indie Dev — participar 2 semanas antes de postear.
- **X / Threads**: hilo con tarjeta compartible + clip 15 s + link a `/play`.
- **YouTube Shorts**: "Mi carrera en Anillero: de novato a leyenda en 60 s".

## Assets de marketing listos

| Asset | Estado | Ubicación |
|---|---|---|
| Logo SVG (512×512) | ✅ | `public/icons/icon-512.png` |
| og:image (1200×630) | ✅ | `public/og/anillero-1200x630.png` |
| Tarjeta carrera (PNG 1080×1350) | ✅ generada en cliente | `src/ui/card.ts` |
| Gameplay clip (MP4 1080p) | ❌ pendiente | Grabar en `/play` |
| Tráiler 30 s | ❌ pendiente | Montar con clips + música libre |
| Press kit (ZIP) | ❌ pendiente | Logos, screenshots, fact sheet |

## Checklist pre-publicación

- [x] Search Console verificado y sitemap enviado (283 URLs).
- [x] Analítica activa (Cloudflare Web Analytics, beacon sin cookies).
- [x] Build de portal sin enlaces salientes ni menú del hub (`/play` limpio).
- [x] Textos legales revisados (marca NBA → "Anillero · Modo Carrera", escudos con fallback).
- [x] Reto diario con backend (ranking, racha persistente, seed servidor).
- [ ] Builds específicas por portal (CrazyGames full, Poki, itch.io).
- [ ] Assets de marketing: clip gameplay, tráiler, press kit.
- [ ] Textos de store: descripción corta (80 chars), larga (4000 chars), keywords.
- [ ] High-res screenshots (5-10) en 16:9 y 9:16.
- [ ] Política de privacidad y términos en inglés + español.