# Guía de Grabación · Gameplay Clip + Screenshots

## Objetivo
Grabar **1 clip de gameplay (MP4 1080p, 30-60s)** + **8-10 screenshots** (16:9 y 9:16) para:
- Tráiler 30s (montaje)
- Assets de store (CrazyGames, Poki, itch.io, web)
- Press kit
- Posts en redes (TikTok, Reels, Shorts, X, Reddit)

---

## Preparación

### Entorno
- **URL**: `https://anillero.com/play` (build de portal limpia, sin menú hub)
- **Resolución de grabación**: 1920×1080 (16:9) — OBS / QuickTime / ScreenFlow / Kap
- **También graba vertical**: 1080×1920 (9:16) — usa móvil o redimensiona ventana
- **Audio**: música libre (epidemic sound, youtube audio library) o SFX del juego
- **Duración total**: 2-3 min de footage → editar a 30-60s

### Cuenta de prueba
- Juega en **incógnito** (nuevo deviceId cada vez) para mostrar onboarding limpio
- O usa deviceId conocido si quieres mostrar carrera avanzada

---

## Secuencia recomendada (storyboard)

| Orden | Qué grabar | Duración | Notas |
|-------|------------|----------|-------|
| 1 | **Splash + título** "NBA LEGACY" | 2s | Logo animado |
| 2 | **Creación de jugador** — nombre, país, posición, estilo | 8s | Muestra selector país (scroll), dorsal, arquetipo |
| 3 | **Elección de club** — 3 ofertas, dinero vs minutos | 6s | Toque en "Fichar" |
| 4 | **Draft NBA** — declararse, noche del draft, pick | 6s | Momento "¡Elegido #12!" |
| 5 | **Temporada: decisiones** — prensa, entreno, patrocinador | 8s | UI de cartas, moral/química moviéndose |
| 6 | **Minijuego drag-and-shoot** — 2-3 tiros (curva realista) | 10s | **Clave**: muestra física, arco, tablero, aro |
| 7 | **Simulación partido a partido** — barra de progreso, logros | 5s | "Victoria vs Lakers", "All-Star" |
| 8 | **Traspaso / agencia libre** — ofertas, elegir nuevo club | 5s | |
| 9 | **Anillo / playoffs** — confeti, banner, trofeo | 6s | Momento "¡CAMPEÓN!" |
| 10 | **Retirada + vitrina** — legacy score, anillos, logros, tarjeta | 8s | Pantalla final compartible |
| 11 | **Reto diario + ranking** — seed del día, puesto #3 | 4s | Muestra backend vivo |

**Total footage**: ~70-80s → editar a **30-45s tráiler** + **15-30s clips verticales**

---

## Screenshots necesarios (captura con `Cmd+Shift+4` o herramienta)

| # | Pantalla | Formato | Uso |
|---|----------|---------|-----|
| 1 | Creación jugador (selector país abierto) | 16:9 + 9:16 | Store, press kit |
| 2 | Elección club (3 cards con dinero/minutos) | 16:9 + 9:16 | Store |
| 3 | Noche del draft (pick + confeti) | 16:9 + 9:16 | Trailer, store |
| 4 | Decisiones de temporada (cartas + barras moral/química) | 16:9 | Store, press |
| 5 | **Drag-and-shoot en acción** (bola en arco, tablero visible) | 16:9 + 9:16 | **Principal** — muestra física |
| 6 | Partido simulado (eventos: mate, triple, falta) | 16:9 | Store |
| 7 | Playoffs / anillo (banner campeón + confeti) | 16:9 + 9:16 | Trailer, store |
| 8 | Retirada: vitrina trofeos + legacy score | 16:9 | Store, press |
| 9 | Tarjeta carrera compartible (PNG 1080×1350) | 9:16 | Social, press |
| 10 | Reto diario + ranking (seed, puesto, racha) | 16:9 | Backend proof |
| 11 | Vista móvil vertical (juego completo en 9:16) | 9:16 | Mobile store |

**Tip**: usa modo responsive en DevTools (Chrome: `Cmd+Shift+M`) para 9:16 exacto (390×844, 375×812).

---

## Post-producción

### Tráiler 30s (para store / web)
```
0-2s   Logo Anillero + "Simulador de carrera NBA gratis"
2-6s   Creación jugador → club → draft (cortes rápidos)
6-12s  Drag-and-shoot x2 (física real) + decisión prensa
12-18s Simulación partidos → All-Star → traspaso
18-24s Playoffs → anillo → confeti
24-28s Retirada: vitrina + tarjeta compartible
28-30s "Juega gratis en anillero.com" + logo
```
Música: epic/sports instrumental, 120-130 BPM, sin vocals.

### Clips verticales 15s (TikTok / Reels / Shorts)
- **Clip A**: "Creé a mi jugador y me draftaron #12" (creación → draft)
- **Clip B**: "El tiro decisivo en el minijuego" (drag-shoot x2)
- **Clip C**: "De novato a campeón en 5 minutos" (montaje rápido anillo)
- **Clip D**: "Mi carrera: 3 anillos, legacy 14k" (tarjeta final)

### Press Kit (ZIP)
```
press-kit/
├── logos/           (SVG, PNG 512, 1024, 2048)
├── screenshots/     (16:9 + 9:16, PNG 1920×1080 / 1080×1920)
├── trailer.mp4      (30s, 1080p, H.264)
├── fact-sheet.md    (descripción, features, créditos, contacto)
├── brand-guidelines.md (colores, tipografía, uso de marca)
└── credits.txt      (fuentes datos, fonts, libs, música)
```

---

## Checklist antes de publicar

- [ ] Clip gameplay 1080p grabado y editado (30-60s)
- [ ] Tráiler 30s montado + música libre
- [ ] 10+ screenshots en 16:9 y 9:16 (PNG, sin UI de devtools)
- [ ] Tarjeta carrera PNG 1080×1350 generada (botón compartir en juego)
- [ ] Logos en SVG + PNG multiples tamaños
- [ ] Press kit ZIP subido a Drive / Dropbox con enlace compartible
- [ ] Textos de store copiados de `docs/STORE_TEXTS.md`
- [ ] Legal: privacy + terms en ES/EN accesibles en `/legal/`
- [ ] Builds portal generadas: `npm run portal:all`
- [ ] ZIPs: `crazygames-full.zip`, `poki-build.zip`, `itch-build.zip`