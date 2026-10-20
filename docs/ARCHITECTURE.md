# NBA Legacy — Arquitectura

## Stack
- **Vite + React 18 + TypeScript** (SPA estática, sin backend: se puede desplegar en cualquier hosting).
- **React Router** (HashRouter para funcionar en hosting estático sin reescrituras).
- **Vitest** para pruebas unitarias y estadísticas del motor.
- Gráficos SVG propios (sin dependencia de librerías de charts), alimentados solo con el estado real.
- Persistencia en `localStorage` (varias ranuras + autosave) con exportación/importación JSON.

## Capas
```
src/
  engine/        Lógica pura, determinista, sin React. Testeable en Node.
    rng.ts         PRNG mulberry32 + hash de claves → streams derivados (seed, temporada, día, propósito)
    config.ts      Reglas de liga (cap, aprons, lotería, play-in, premios) y parámetros del modelo
    types.ts       Tipos del estado
    attributes.ts  Atributos, OVR, arquetipos
    players.ts     Generación de jugadores (clases de draft y ligas generadas)
    league.ts      Creación de la liga (30 equipos, plantillas, entrenadores, estilos)
    schedule.ts    Calendario de 82 partidos y fechas
    gamesim.ts     Motor estadístico de partido (box scores coherentes)
    stats.ts       Agregación, porcentajes, dobles-dobles, game score
    season.ts      Avance diario, All-Star, deadline, Play-In, playoffs
    awards.ts      Premios y líderes
    progression.ts Entrenamiento, desarrollo, envejecimiento
    injuries.ts    Lesiones y fatiga
    contracts.ts   Valor de mercado, ofertas, escala de novato, capacidad salarial
    draft.ts       Clases de draft, combine, mock, lotería, selección
    satellite.ts   Competiciones NCAA / G League / Europa
    events.ts      Intérprete de eventos (condiciones y efectos declarativos)
    goals.ts       Objetivos de temporada
    achievements.ts, legacy.ts, daily.ts
    career.ts      Creación de carrera y utilidades (rol, noticias, eventos en cola)
    flow.ts        Avance diario con hooks del usuario, entrenamiento semanal, eventos, deadline, All-Star, fin de temporada
    offseason.ts   Temporada baja de la liga, ofertas del usuario, pre-draft, firma y retirada
    market.ts      Interés de equipos, ofertas de agencia libre, fallback (two-way, G League, Europa), traspasos
    api.ts         Fachada que usa la UI
  content/       Textos y definiciones de eventos (datos), nombres, países, universidades
  data/          Franquicias NBA y snapshot real de plantillas 2026-27 (ESPN/Wikipedia)
  store/         Store global (useSyncExternalStore) + persistencia
  ui/            Componentes compartidos (tarjeta, gráficos, tablas)
  screens/       Una pantalla por ruta
```

Desde 2026-27 las carreras nuevas usan el snapshot real de plantillas y datos (ESPN y Wikipedia,
20-10-2026); las clases de draft, los entrenadores y los agentes siguen siendo generados.

## Principios
1. **Motor puro**: toda acción de juego es una función `(career, input) → career`. La UI nunca
   modifica el estado directamente. Esto permite pruebas, deshacer el paso a paso y determinismo.
2. **Determinismo**: no se usa `Math.random` en el motor. Cada número aleatorio sale de
   `rngFor(seed, ...claves)`, p. ej. `rngFor(seed, 'game', season, gameId)`. Avanzar partido a partido
   o temporada entera produce el mismo resultado; las decisiones cambian el estado y por tanto el
   futuro, de forma reproducible.
3. **Datos separados de lógica**: los eventos son objetos declarativos (`content/events.ts`) con
   condiciones (`when`) y efectos (`effects`) que interpreta `engine/events.ts`.
4. **Reglas configurables**: `config.ts` agrupa cifras de la temporada y parámetros del modelo
   estadístico; las pruebas fijan los rangos esperados.
5. **Competiciones ampliables**: NBA se simula como liga completa; el resto usa la interfaz
   `SatelliteCompetition` (nivel, nº de partidos, nombre). Añadir una liga = añadir una entrada.

## Modelo de partido
Para cada equipo: posesiones `P = pace ± ruido`. Tasa de pérdidas, de tiros libres y de rebote
ofensivo ajustadas por ratings de equipo. Los FGA se reparten por `uso = minutos × tendencia ofensiva^k`;
el porcentaje de 3 y de 2 de cada jugador depende de sus atributos, la defensa rival, la fatiga y la
forma, y los aciertos se muestrean binomialmente. Puntos = 2·FG2 + 3·FG3 + FT. Rebotes salen de los
fallos reales. Asistencias ≈ 60 % de canastas, robos ≈ 50 % de pérdidas rivales, tapones de los
fallos de 2 rivales. Faltas hasta 6. +/- = margen × minutos/48 + ruido de suma cero.

## Pruebas
`src/engine/__tests__/`: calendario, determinismo, integridad de box scores (puntos = 2·T2 + 3·T3 + TL,
intentos ≥ aciertos, faltas ≤ 6), minutos por equipo, medias de liga en rangos realistas, líderes
plausibles, reparto de minutos estrella/banquillo, distribución de victorias, Play-In y cuadro,
elegibilidad de premios, lotería 3-2-1, fatiga acotada y carreras completas automáticas (4 vías,
reproducibilidad y variedad de resultados).

## Persistencia
`localStorage['nbalegacy:slot:<id>']` guarda el estado completo serializado (versión de esquema
incluida para migraciones). Autosave tras cada acción. Logs de partido solo se conservan para la
temporada actual del jugador; temporadas pasadas se resumen. Logros y récords diarios se guardan
aparte (persisten entre partidas).

## Rendimiento
Una temporada completa (1.230 partidos, ~26 jugadores por partido) se simula en < 1 s en un portátil
medio. El avance largo se trocea por días y cede al navegador para no congelar la UI.
