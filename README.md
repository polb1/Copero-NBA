# NBA Legacy

Simulador de carrera profesional de baloncesto. Creas tu jugador, vives el camino al draft
(NCAA, Europa, vía alternativa o novato directo) y gestionas su carrera hasta la retirada: minutos,
entrenamiento, contratos, lesiones, traspasos, premios, anillos y legado.

Inspirado en el concepto de carrera narrativa de Copero, con una identidad y unas mecánicas propias.
Proyecto independiente sin afiliación con la NBA, ESPN ni Wikipedia: los nombres de franquicias y
jugadores reales se usan solo como referencia dentro de la simulación. Las plantillas y datos 2026-27
se basan en fuentes públicas (rosters y estadísticas de ESPN y Wikipedia, snapshot del 20-10-2026);
los partidos, decisiones, draft, entrenadores, agentes y el resto de la simulación son ficticios o
generados. No es un producto oficial ni está respaldado por la NBA.

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

- **Liga completa simulada**: 30 franquicias con plantillas reales 2026-27, calendario real de 82 partidos, Play-In, playoffs al mejor de 7, All-Star, fecha límite de traspasos, cambios de entrenador.
- **Motor estadístico determinista**: box scores coherentes (los puntos salen de los tiros), fatiga, forma, lesiones, ventaja de campo, calidad rival. Misma semilla + mismas decisiones = mismo resultado.
- **Draft**: temporada pre-draft, combine con pruebas de tiro, atléticas, manejo, fuerza y defensa, entrevistas, mock draft, big board, lotería 3-2-1 (aprobada en mayo de 2026) y noche del draft con dos rondas. El plan del combine (completo, duro, seguro, medir o saltar) afecta al stock y al pick.
- **Contratos** con cifras 2026-27: tope, impuesto, aprons, MLE, mínimos, two-way, escala de novato aproximada, opciones, extensiones y agencia libre restringida (modelo simplificado y declarado como tal).
- **Vista simple** (pantalla principal): identidad en una sola pantalla y una pantalla de carrera con tarjeta, decisiones en tarjetas y línea de tiempo por edades. 1-2 decisiones por temporada; los resultados de la temporada solo se muestran al terminarla.
- **87 acontecimientos**, con **10 minijuegos** jugables por posición (tiro, mates, rebotes, robos, pases y cierre de partido) y dificultad según OVR: más riesgo, más puntos.
- **Ilustraciones vectoriales originales** en cada evento, fase y opción; simulación en directo con barra de progreso, contador de OVR animado, confeti en los grandes momentos y línea de tiempo animada.
- **Progresión** por entrenamiento semanal, edad, minutos y potencial oculto (los ojeadores pueden equivocarse).
- **Premios** calculados con las estadísticas de todos los jugadores: MVP, DPOY, ROY, 6MOY, MIP, All-NBA, All-Defensive, All-Star, líderes y MVP de las Finales.
- **Tres ritmos**: carrera completa, carrera rápida y desafío diario (semilla compartida por fecha UTC).
- **Modo Larga con economía**: activos, mantenimiento, deuda al 8%, crisis, bancarrota y descenso/corte por bajo rendimiento; los ritmos rápidos conservan la carrera clásica sin finanzas.
- **Una sola pantalla de juego**: sin menús de gestión. Logros, partidas, ajustes y desafío diario quedan en páginas secundarias.
- **Clubes reales**: 137 clubes de Europa, Latinoamérica, Asia, África y Oceanía con fuerza por liga, 40 universidades NCAA y las 30 franquicias filiales de la G League. El nivel del club cambia la fuerza del equipo y tus minutos.
- **Todos los países del mundo** (200) con bandera.
- **Inicio por elección**: tras elegir agente, el juego ofrece 3 clubes de tu país (universidades NCAA si eres estadounidense), uno de cada nivel.
- **Carrera europea**: en vez del draft puedes quedarte fuera de la NBA: ofertas de clubes cada verano (renovación incluida), contratos de varios años, títulos de liga y MVP. Si tu nivel llega a OVR 72, también llaman equipos NBA.
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

- **22 ilustraciones vectoriales originales** en `src/ui/Scene.tsx` y `src/ui/art/`, usadas como cabecera de cada evento y fase y en las tarjetas de opción; sin fotos de terceros. Sin filtros SVG ni emoji, ids deterministas por instancia.

- **Logotipos de los equipos**: se cargan en tiempo de ejecución desde la CDN pública de la NBA (`src/data/logos.ts`), no se incluyen en el paquete. Son marcas de la NBA y sus franquicias. Para vender el juego sin licencia de la NBA, pon `OFFICIAL_LOGOS = false`: se usan escudos genéricos propios. Si un logo no carga (sin conexión), también se muestra el escudo propio.

Tipografías: Barlow Condensed e Inter (Google Fonts, licencia SIL Open Font License).

## Entrega y despliegue

`npm run build` genera una web estática en `dist/` que se puede publicar en cualquier hosting
(Netlify, Vercel, GitHub Pages, un bucket S3…). Usa rutas con `#`, así que no necesita
configuración de servidor. Las partidas se guardan en el navegador del jugador; no hay backend.

Aviso legal incluido en la propia aplicación: proyecto independiente sin afiliación con la NBA, ESPN
ni Wikipedia; las franquicias y sus logotipos se muestran solo como referencia. Para una versión
comercial con marcas reales haría falta una licencia de la NBA; la alternativa es renombrar los
equipos en `src/data/teams.ts`.
