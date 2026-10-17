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
- **62 acontecimientos** con condiciones, pesos, cooldowns, encadenamientos y consecuencias reales.
- **Progresión** por entrenamiento semanal, edad, minutos y potencial oculto (los ojeadores pueden equivocarse).
- **Premios** calculados con las estadísticas de todos los jugadores: MVP, DPOY, ROY, 6MOY, MIP, All-NBA, All-Defensive, All-Star, líderes y MVP de las Finales.
- **Tres ritmos**: carrera completa, carrera rápida y desafío diario (semilla compartida por fecha UTC).
- **22 pantallas** conectadas al mismo estado, responsive, con teclado (`N`, `W`, `E`, `1-4`) y movimiento reducido.
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
