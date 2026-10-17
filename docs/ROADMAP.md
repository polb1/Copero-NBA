# NBA Legacy — Roadmap

| Fase | Contenido | Criterio de aceptación | Estado |
|---|---|---|---|
| 0. Investigación | RESEARCH, GAME_DESIGN, ARCHITECTURE | Documentos con fuentes y fechas | Hecho |
| 1. Motor base | RNG por streams, atributos/OVR, generación de liga, calendario de 82 partidos | Pruebas: 82 partidos por equipo, 1.230 en total, nadie juega dos veces el mismo día, determinismo | Hecho (pruebas en verde) |
| 2. Simulación | Box scores, agregación, clasificación, fatiga | Pruebas: porcentajes coherentes, medias de liga en rango, minutos = 240 + 25·OT, líderes plausibles, fatiga acotada | Hecho (pruebas en verde) |
| 3. Temporada | Play-In, playoffs, premios, All-Star, lotería 3-2-1 | Un campeón, series a 4 victorias, elegibilidad de 65 partidos, 16 equipos en lotería | Hecho (pruebas en verde) |
| 4. Carrera | Creación, 4 vías de entrada, draft, contratos, progresión, lesiones, eventos, objetivos, traspasos, G League | Carreras completas hasta la retirada en las 4 vías, deterministas, con resultados variados | Hecho (pruebas en verde) |
| 5. UI | 22 pantallas, responsive, teclado, movimiento reducido, alto contraste | Navegación completa sin pantallas muertas; sin scroll horizontal a 375 px | Hecho (revisado en navegador) |
| 6. Final | Retirada, legado, Hall of Fame, tarjeta PNG, logros, desafío diario | Desafío reproducible con las mismas decisiones | Hecho |
| 7. Futuro | Ver abajo | — | Pendiente |

## Pendiente / ideas
- Traducciones EN/PT (los textos ya están separados de la lógica de eventos; la UI aún tiene textos en línea).
- NBA Cup (torneo de temporada).
- Más ligas internacionales como competiciones completas (hoy NCAA, Europa y G League se simulan como competiciones "satélite" contra rivales genéricos).
- Ranking online del desafío diario (requiere backend).
- CBA completo: Bird rights detallados, sign-and-trade, matching de salarios en traspasos, cláusulas de bonus.
- Traspasos entre equipos NPC.
- Ficha de partido completa (box score de ambos equipos) en el registro.
- Reducir el tamaño de guardado (~0,7 MB por partida) si se quieren muchas ranuras en `localStorage`.

## Limitaciones conocidas
- El ranking del desafío diario es local.
- Reglas del convenio simplificadas (ver RESEARCH §2.4) y escala de novato aproximada.
- Plantillas ficticias; los NPC no traspasan jugadores entre ellos, solo se mueven en agencia libre.
- Las banderas de país usan emojis: en Windows se ven como códigos de dos letras.
