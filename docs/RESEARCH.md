# NBA Legacy — Investigación

Fecha de consulta: **17 de octubre de 2026**. Todas las cifras de esta página corresponden a esa fecha
y se guardan como **reglas configurables** en `src/engine/config.ts`; no deben asumirse vigentes en
otras temporadas.

## 1. Referencia: Copero — Simulador de carrera (fútbol)

URL: https://copero.com.ar/juegos/simulador-carrera (inspeccionada en navegador real, sin cuenta).

### 1.1 Hechos observados

| Pantalla / mecánica | Lo observado |
|---|---|
| Portada | Título "Build your own football career", texto corto de promesa, selector de ritmo **Intense / Normal / Express**. Con *Normal* se muestra: "Decisions every 2 seasons for a balanced experience". Botones *Start career* y *Back to Games*. Idiomas ES / EN / PT. |
| Identidad | Un único paso: apellido, dorsal, pie preferido (izquierdo/derecho), nacionalidad (24 países visibles + "Show more" + buscador), posición elegida sobre un **campo dibujado** (LW, ST, RW, LM, CAM, RM, LB, CM, RB, CDM, CB, GK). Una **camiseta** se actualiza en vivo con apellido y dorsal. El botón de confirmar se habilita al completar los campos. |
| Pantalla de carrera | Columna izquierda: **tarjeta** con OVR (empieza en 50), bandera, dorsal + posición, club, edad (16), valor de mercado, partidos, goles, asistencias y una "vitrina de trofeos" vacía. Debajo, la **decisión** actual. Columna derecha: **línea de tiempo por edad** (16, 18, 20 … 38) con club, OVR, partidos, goles y asistencias por tramo; los tramos futuros aparecen vacíos. |
| Primera decisión | "Academy offer": tres clubes reales de la misma liga; se elige uno. |
| Progresión | Tras elegir, la línea de tiempo avanza **dos temporadas de golpe** (edad 16 → 18), el OVR subió (50 → 62) y se rellenó la fila con estadísticas agregadas. Aparece "Choosing club…" para el siguiente tramo. |
| Aviso legal | Texto al pie: los nombres de clubes se usan solo para identificación; sin afiliación. |
| Consentimiento | Banner CMP + banner propio de cookies (se rechazaron los opcionales). |

### 1.2 No inspeccionado (no se inventa)
No se completó una carrera entera, por lo que **no se observaron** directamente: retirada, tarjeta final,
opciones de compartir, persistencia de partidas ni el modo *Intense/Express* en detalle. Tampoco se
accedió al código. Cualquier parecido en esas áreas es una propuesta propia, no una copia.

### 1.3 Principios extraídos (propuesta propia)
1. Arranque en menos de un minuto: identidad en una sola pantalla con previsualización en vivo.
2. La tarjeta del jugador es el ancla visual permanente.
3. La línea de tiempo de la carrera da sensación de "vida" y de progreso.
4. Decisiones discretas y claras (2–4 opciones) en lugar de micro-gestión.
5. El ritmo elegido cambia la densidad de decisiones, no las reglas.

NBA Legacy amplía estos principios con: simulación partido a partido de una liga completa, draft
detallado, contratos y tope salarial, lesiones, premios calculados, G League, desafío diario y tarjeta
final descargable.

## 2. Baloncesto profesional

### 2.1 Liga y franquicias
- 30 franquicias en dos conferencias (Este / Oeste) de 15 equipos, cada una con tres divisiones de 5
  (Atlantic, Central, Southeast / Northwest, Pacific, Southwest). Fuente: nba.com.
- Temporada regular de 82 partidos. Distribución del calendario: 4 partidos contra cada rival de
  división (16), 4 contra seis rivales de conferencia (24), 3 contra los otros cuatro (12) y 2 contra
  cada equipo de la otra conferencia (30). El juego aplica exactamente esta fórmula.
- La NBA Cup (torneo de temporada) **no** está integrada en esta versión.

### 2.2 Posiciones y roles
PG, SG, SF, PF, C, con roles modernos sin posición fija (playmaker, 3&D, stretch big, rim protector…).
Las selecciones All-NBA son **sin posiciones** desde 2023-24 (CBA 2023): el juego las aplica así.

### 2.3 Draft
- Dos rondas; 30 picks por ronda en teoría (las sanciones pueden eliminar picks; el juego usa 30+30
  como valor configurable).
- **Lotería**: la Junta de Gobernadores aprobó el 28/05/2026 un formato "3-2-1" contra el *tanking*
  vigente hasta 2029 (AP, NBC Sports): 16 equipos en la lotería, 3 bolas para los equipos fuera de
  playoffs y Play-In, salvo los 3 peores récords que pierden una ("draft relegation") y no pueden caer
  más abajo del pick 12; 2 bolas para los seeds 9 y 10 del Play-In; 1 bola para los perdedores del 7 vs 8.
  No puede ganar el número 1 el mismo equipo dos años seguidos.
  **Laguna**: las fuentes consultadas no especifican cuántos picks se sortean. El juego sortea los 4
  primeros y lo marca como **suposición** configurable.
- El formato 2019-2026 (14 equipos, 14 % / 14 % / 14 % / 12,5 % …, 4 picks sorteados) se conserva como
  regla alternativa (`lotteryFormat: "classic2019"`).

### 2.4 Contratos (temporada 2026-27, fuente: pr.nba.com/2026-27-salary-cap y prensa)
| Concepto | Valor 2026-27 |
|---|---|
| Salary cap | $164.961M |
| Luxury tax | $200.428M |
| First apron | $209.015M |
| Second apron | $221.686M |
| Salario mínimo de equipo | $148.465M |
| Non-Taxpayer MLE | $15.044M |
| Taxpayer MLE | $6.064M |
| Room MLE | $9.366M |
| Mínimo 0 años de experiencia | $1,357,763 |
| Mínimo 10+ años | $3,876,529 |
| Two-way | $678,882 (50 % del mínimo de novato) |

- Escala de novato: **no se encontró la escala oficial pick a pick para 2026-27.** El juego usa una
  curva aproximada (≈8,4 % del cap para el #1 hasta ≈1,6 % para el #30) etiquetada como aproximada.
  Contratos de primera ronda: 2 años garantizados + 2 opciones de equipo; extensión tras la 3.ª
  temporada; agencia libre restringida tras la 4.ª (con qualifying offer).
- Máximos por experiencia (CBA 2023): 25 % del cap (0–6 años), 30 % (7–9), 35 % (10+).
- Two-way: hasta 3 por equipo y hasta 50 partidos activos en NBA (CBA 2023).
- Por encima del segundo apron se pierde la MLE; usar la NTMLE por encima de $6.064M impone *hard cap*
  en el primer apron.

**Simplificación declarada**: el juego no implementa todas las cláusulas del convenio (Bird rights
completos, sign-and-trade, matching salarial al 125 %, cláusulas de bonus "likely/unlikely"…). Usa un
modelo de capacidad de oferta por equipo (espacio + excepción disponible) y lo indica en pantalla.

### 2.5 Temporada y postemporada
- Play-In: seeds 7-10 de cada conferencia. 7 vs 8 (ganador = 7.º); el perdedor se enfrenta al ganador
  del 9 vs 10 por el 8.º puesto.
- Playoffs: 4 rondas al mejor de 7, formato de campo 2-2-1-1-1.
- Premios con requisito de **65 partidos** (CBA 2023) para MVP, DPOY, All-NBA y All-Defensive (el juego
  usa 65 partidos con ≥20 min como aproximación; no modela las excepciones por lesión grave).
- All-NBA: tres quintetos sin posición. All-Defensive: dos quintetos.

### 2.6 Hall of Fame
Las fuentes consultadas discrepan (3 o 4 temporadas completas de retiro). Se usa **4** como valor
configurable (`hofWaitSeasons`) y se avisa en la pantalla final.

### 2.7 Estadística de referencia
Promedios de liga recientes aproximados (para calibración, no datos oficiales exactos): ~99–100
posesiones, ~113–115 puntos por equipo, ~37 triples intentados, ~36 % en triples, ~78 % en libres.
Se usan como objetivos de las pruebas estadísticas automatizadas.

## 3. Fuentes
- Copero (inspección directa): https://copero.com.ar/juegos/simulador-carrera
- NBA, cap 2026-27: https://pr.nba.com/2026-27-salary-cap/
- Ministry of Sport, cifras 2026-27: https://ministryofsport.com/nba-confirms-salary-cap-and-financial-thresholds-for-2026-27-season/
- Bleacher Report, aprons y mínimos: https://bleacherreport.com/articles/25448479-2026-27-nba-salary-cap-1st-and-2nd-aprons-luxury-tax-levels-revealed-fa
- Yardbarker, mínimos 2026-27: https://www.yardbarker.com/nba/articles/nba_minimum_salaries_for_202627/s1_14822_44016395
- Lotería 3-2-1 (AP vía NBC): https://www.nbcwashington.com/nba/nba-draft-lottery-reform-anti-tanking-explainer-format/4109765/
- Hall of Fame: https://www.nba.com/news/naismith-memorial-basketball-hall-fame-announces-modifications-enshrinement
- Reglamento NBA: https://official.nba.com/rulebook/
- NBA G League: https://gleague.nba.com/

## 4. Limitaciones
- Sin acceso a la API de estadísticas de la NBA: todos los jugadores de las plantillas son **ficticios**.
  Solo se usan nombres de franquicias reales a efectos de identificación, sin afiliación.
- No se usan logotipos ni fotografías con derechos.
- Las reglas se simplifican donde se indica; todas son parámetros en `config.ts`.
