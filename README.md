# NBA Legacy

Simulador de carrera profesional de baloncesto. Creas un jugador ficticio, vives el camino al draft
(NCAA, Europa, vía alternativa o novato directo) y gestionas su carrera hasta la retirada: minutos,
entrenamiento, contratos, lesiones, traspasos, premios, anillos y legado.

Inspirado en el concepto de carrera narrativa de Copero, con una identidad y unas mecánicas propias.
Proyecto sin afiliación con la NBA: las franquicias se usan solo como referencia y todos los
jugadores, entrenadores y agentes son ficticios.

## Puesta en marcha

Requiere Node 18+.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173. Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas del motor (calendario, determinismo, integridad de box scores, distribuciones estadísticas, playoffs, premios, lotería, carreras completas) |
| `npm run build` | Build de producción estática en `dist/` (despliegue en cualquier hosting estático) |
| `npm run typecheck` | Comprobación de tipos |

## Qué incluye

- **Liga completa simulada**: 30 franquicias, calendario real de 82 partidos, Play-In, playoffs al mejor de 7, All-Star, fecha límite de traspasos, cambios de entrenador.
- **Motor estadístico determinista**: box scores coherentes (los puntos salen de los tiros), fatiga, forma, lesiones, ventaja de campo, calidad rival. Misma semilla + mismas decisiones = mismo resultado.
- **Draft**: temporada pre-draft, combine, entrevistas, mock draft, big board, lotería 3-2-1 (aprobada en mayo de 2026) y noche del draft con dos rondas.
- **Contratos** con cifras 2026-27: tope, impuesto, aprons, MLE, mínimos, two-way, escala de novato aproximada, opciones, extensiones y agencia libre restringida (modelo simplificado y declarado como tal).
- **Vista simple** (pantalla principal): identidad en una sola pantalla y una pantalla de carrera con tarjeta, decisiones en tarjetas y línea de tiempo por edades. 1-2 decisiones por temporada; los resultados de la temporada solo se muestran al terminarla.
- **66 acontecimientos**, 4 de ellos **minijuegos de tiro** jugables (último tiro, tiros libres, concurso de triples, reto de entrenamiento).
- **Fotos de stock e ilustraciones** en cada evento, fase y opción; simulación en directo con barra de progreso, contador de OVR animado, confeti en los grandes momentos y línea de tiempo animada.
- **Progresión** por entrenamiento semanal, edad, minutos y potencial oculto (los ojeadores pueden equivocarse).
- **Premios** calculados con las estadísticas de todos los jugadores: MVP, DPOY, ROY, 6MOY, MIP, All-NBA, All-Defensive, All-Star, líderes y MVP de las Finales.
- **Tres ritmos**: carrera completa, carrera rápida y desafío diario (semilla compartida por fecha UTC).
- **Vista detallada** con 22 pantallas conectadas al mismo estado, responsive, con teclado (`N`, `W`, `E`, `1-4`) y movimiento reducido.
- **Persistencia** local con autosave, varias partidas, exportación/importación JSON, logros globales y tarjeta final descargable en PNG.

## Documentación

- [docs/RESEARCH.md](docs/RESEARCH.md): fuentes, observaciones de Copero y reglas NBA (consultadas el 17/10/2026).
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): diseño del juego.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): arquitectura y modelo de simulación.
- [docs/ROADMAP.md](docs/ROADMAP.md): fases, estado y limitaciones.

## Ajustar la simulación

Todas las reglas de liga y los parámetros del modelo están en `src/engine/config.ts`
(tope salarial, lotería, Play-In, requisitos de premios, ritmo, porcentajes base, plantillas de minutos,
frecuencia de eventos). Los eventos son datos en `src/content/events.ts`.

## Imágenes y licencias

- **30 fotografías de Unsplash** en `public/stock/` (2,4 MB), usadas como cabecera de cada evento y fase y en las tarjetas de opción. Licencia de Unsplash: uso comercial permitido sin atribución. Lista completa con enlaces en [docs/CREDITS.md](docs/CREDITS.md). Se eligieron sin logotipos de ligas o marcas ni personas identificables.
- **22 ilustraciones vectoriales originales** (`src/ui/Scene.tsx`) como respaldo: si una foto falta o no carga, se muestra la ilustración.
- Para cambiar o añadir fotos: copia el archivo a `public/stock/` y añádelo a `STOCK_PHOTOS` en `src/ui/Scene.tsx` (admite varias fotos por escena; se alternan).

Tipografías: Barlow Condensed e Inter (Google Fonts, licencia SIL Open Font License).

## Entrega y despliegue

`npm run build` genera una web estática en `dist/` que se puede publicar en cualquier hosting
(Netlify, Vercel, GitHub Pages, un bucket S3…). Usa rutas con `#`, así que no necesita
configuración de servidor. Las partidas se guardan en el navegador del jugador; no hay backend.

Aviso legal incluido en la propia aplicación: proyecto sin afiliación con la NBA; las franquicias se
nombran solo como referencia y no se usan logotipos. Para una versión comercial con marcas reales haría
falta una licencia de la NBA; la alternativa es renombrar los equipos en `src/data/teams.ts`.
