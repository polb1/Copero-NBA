# NBA Legacy — Diseño de juego

## 1. Fantasía
Vivir la carrera completa de un jugador ficticio: desde prospecto hasta la retirada, tomando
decisiones que cambian minutos, dinero, relaciones, salud y legado. El usuario no juega los partidos;
el motor los simula y el usuario gestiona la vida del jugador.

## 2. Bucle principal
```
Crear jugador → Vía de entrada (NCAA / Internacional / Alternativa / Novato directo)
 → Pre-draft (combine, entrevistas, mock draft) → Lotería → Draft (o no seleccionado)
 → Contrato inicial → [ Temporada: training camp → regular → All-Star → deadline → Play-In → playoffs
 → premios → informe → offseason (progresión, contratos, agencia libre, retirada?) ] × N
 → Retirada → Resumen final + tarjeta compartible + Hall of Fame
```
Dentro de la temporada el usuario avanza **partido a partido, semana a semana o hasta el siguiente
acontecimiento**. El resultado es idéntico sea cual sea el tamaño del paso (RNG por día).

## 3. Ritmos
| Ritmo | Eventos | Avance por defecto | Semilla |
|---|---|---|---|
| Intenso (completa) | Hasta 2 por temporada (+ evento de verano el 40% de los años) | Hasta la siguiente decisión | Aleatoria |
| Normal (rápida) | 1 por temporada | Hasta la siguiente decisión | Aleatoria |
| Desafío diario | Como Normal, máx. 12 temporadas | Hasta la siguiente decisión | Fecha (UTC) |

Objetivo de ritmo: corto e intenso. En la vista simple cada temporada se resuelve con 1-2 decisiones y
un clic en el informe de fin de temporada; el juego solo se detiene por un acontecimiento, una lesión
moderada o grave, una petición de traspaso, un contrato o el informe anual. Las lesiones leves son solo
noticias. Medido en `pacing.test.ts`: ~2,2 paradas por temporada en Normal y ~3,5 en Intenso, contando el
informe anual.

El desafío diario fija nacionalidad, posición, físico, atributos y vía de entrada; el usuario solo
elige nombre y dorsal (no afectan al RNG). Puntuación = Legacy Score. Mismas decisiones ⇒ mismo resultado.

## 4. Jugador
- 23 atributos (0-99) + potencial (40-99). OVR = mezcla de media ponderada por posición (70 %) y la
  media de las cinco mejores habilidades ponderadas (30 %) para premiar especialistas.
- **Arquetipos** (Playmaker, Sharpshooter, Slasher, Two-Way Wing, 3&D, Stretch Big, Rim Protector,
  Post Scorer, All-Around): inclinan la distribución inicial de atributos, la propensión a tirar de
  tres / atacar el aro / pasar en la simulación, el crecimiento por foco de entrenamiento (+15 % en
  áreas afines) y el tipo de rol que ofrecen los equipos.
- Especializaciones (Base organizador, Escolta tirador…) son etiquetas de rol derivadas de la posición
  + arquetipo y se muestran en el perfil.
- Estados dinámicos: forma (−10..10), fatiga (0-100), salud, confianza del entrenador, moral,
  química, reputación, fama, presión mediática, lealtad, ética de trabajo (oculta).

## 5. Simulación de partido (resumen; detalle en ARCHITECTURE)
Simulación estadística de abajo arriba: posesiones del equipo → pérdidas, viajes a la línea, tiros
de campo → reparto por uso y minutos → acierto según habilidad, defensa rival, fatiga y forma →
rebotes de los fallos → asistencias, robos, tapones, faltas, +/-. Los puntos **salen** de los tiros,
nunca al revés. Prórrogas si hay empate.

## 6. Rol y minutos
El entrenador ordena la rotación por OVR efectivo (OVR + confianza + forma). El índice de rotación
determina una plantilla de minutos (titular 30-36, rotación 14-24, banquillo 0-10). Exigir minutos,
rendir bien o mal, y los eventos mueven la confianza y por tanto la posición en la rotación.

## 7. Progresión
- Durante la temporada: foco de entrenamiento semanal (tiro, finalización, creación, defensa,
  atletismo, rebote/fuerza, equilibrado, descanso) e intensidad. Genera "puntos de desarrollo"
  que dependen de edad, distancia al potencial, ética, salud, minutos y calidad del cuerpo técnico.
  **No** todo entrenamiento sube el OVR: los puntos se convierten en mejoras con rendimientos
  decrecientes cerca del potencial.
- Offseason: salto principal de desarrollo/declive por edad. Atletismo cae desde los 28-29;
  habilidades técnicas desde los 31-32; IQ crece hasta ~32.
- Especializarse: el foco intenso en un área da más mejoras ahí pero nada en las demás.
- **Potencial oculto**: el potencial visible es una estimación de los ojeadores. El techo real del
  jugador está oculto (estimación ± ~6) y la estimación converge hacia él con los años: hay
  "busts" y jugadores que florecen tarde.
- Objetivos de temporada (hasta 2): verificados con estadísticas reales al final; dan o quitan
  reputación, moral, confianza y pequeños bonus de atributos.

## 8. Eventos y decisiones
Biblioteca de 62 acontecimientos originales en 21 categorías, con condiciones, pesos, cooldowns,
prioridades y encadenamientos. Cada opción tiene efectos inmediatos y, a veces, resultados con
probabilidad oculta; el texto de resultado explica lo ocurrido. Las consecuencias modifican el
estado real (minutos vía confianza, atributos, dinero, química, lesiones, peticiones de traspaso…).

## 9. Economía
- Ingresos de carrera (salario + patrocinio) separados de la nómina de la franquicia.
- Valor de mercado por OVR, edad, producción y reputación. Máximos por experiencia.
- Ofertas de agencia libre condicionadas por necesidad posicional, ambición, nómina y excepción
  disponible (espacio, MLE, mínimo). Un equipo sin capacidad no puede ofrecer más de lo que tiene.
- Opciones de jugador/equipo, extensión de novato, agencia libre restringida simplificada.
- Traspasos: el jugador puede pedir traspaso; el interés de otros equipos depende de valor, contrato
  y necesidades. Se notifican ofertas al acercarse la fecha límite.

## 10. Lesiones
Riesgo por partido = base × minutos × (1 + fatiga) × (1 + historial). Severidad 70 % leve, 25 %
moderada, 5 % grave. Decisiones: jugar con molestias, descansar, seguir al cuerpo médico o acelerar
la rehabilitación (con riesgo de recaída). Lesiones graves pueden recortar atletismo o potencial.

## 11. Premios y legado
MVP, ROY, DPOY, MIP, 6MOY, All-Star, All-NBA (3×5), All-Defensive (2×5), líderes estadísticos,
MVP de las Finales y campeón, calculados con las estadísticas reales de **todos** los jugadores
simulados de la liga y reglas configurables (requisito de 65 partidos). Legacy Score suma
producción, picos, premios y anillos → probabilidad de Hall of Fame.

## 12. G League e internacional
Las competiciones "satélite" (NCAA, G League, Liga Europea ficticia) se simulan con el mismo motor de
partido contra rivales genéricos de un nivel configurable. Two-way: el jugador alterna G League y NBA
(máximo 50 partidos NBA), con promoción a contrato estándar si rinde.

## 13. Logros
Colección de 31 logros persistentes entre partidas (p. ej. "Robo del siglo: elegido en 2.ª ronda y
All-Star", "Triple-doble", "Anillo", "Hombre de franquicia").

## 14. Final de carrera
Retirada voluntaria (opción en offseason a partir de 30 años o con declive) o forzada (sin ofertas,
edad 42). Resumen con todos los totales, promedios, picos, equipos, premios, Hall of Fame y tarjeta
PNG descargable + texto para compartir.
