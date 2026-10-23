# 02 · Mapa de funcionalidades y madurez

## Cómo se ha verificado

| Clave | Método |
|---|---|
| **T** | Test automatizado en verde. 239 tests en 41 archivos, ejecutados el 23-10-2026 sobre `f3925bf`. |
| **N** | Navegador. Playwright y Chromium con perfil Pixel 5 contra anillero.com y pre.anillero.com, de la portada a la primera decisión (23-10-2026). En sesiones anteriores se recorrieron carreras completas con WebKit/iPhone, pero sobre versiones anteriores de `main`. |
| **E** | Solo revisión estática del código. |

**Estados:**
- ✅ Completa y verificada
- 🟡 Parcial
- 🔵 Implementada sin verificar
- 🎭 Simulada o ficticia
- ⛔ No implementada
- 🧱 Bloqueada

| Funcionalidad | Archivos principales | Estado | Qué funciona | Qué falta o qué limita | Verificación | Siguiente paso |
|---|---|---|---|---|---|---|
| Creación de jugador | `screens/simple/Start.tsx`, `engine/career.ts` | ✅ | Nombre y/o apellido (al menos uno), dorsal, mano hábil, 200 países, posición, 3 ritmos | La posición y el estilo se eligen, pero no hay arquetipos visibles como en la competencia | N, T (`career.test`) | Medir el abandono en esta pantalla |
| Configuración inicial y ritmos (Exprés, Normal, Larga) | `engine/config.ts` (`EVENT_RATE`), `flow.ts` | ✅ | 1, 2-3 y 4-5 decisiones por temporada | — | T (`pacing.test`) | — |
| Agentes | `content/events.ts`, `engine/events.ts` | ✅ | Tres agencias con comisiones distintas | Efecto a largo plazo poco visible para el jugador (E) | N (primera decisión observada) | Mostrar el efecto del agente en contratos |
| Vías de entrada (club nacional, NCAA, G League, Europa) | `career.ts`, `clubpick.ts`, `satellite.ts` | ✅ | OVR inicial según la edad, sin clubes top si OVR < 66 | Las competiciones satélite son contra rivales genéricos | T (`clubs`, `eurocareer`, `realLeague`) | — |
| Draft (combine, entrevistas, lotería, puerta de acceso) | `engine/draft.ts`, `content/combine.ts` | ✅ | Combine e entrevistas mueven la cotización; fallback realista si no te eligen | — | T (`draft`, `draftGate`, `combine`) | — |
| Contratos, ofertas y renovaciones | `engine/contracts.ts`, `market.ts`, `offseason.ts` | 🟡 | Valor de mercado, ofertas de agencia libre, escala de novato, two-way y Europa | Convenio colectivo simplificado: sin Bird rights detallados, sign-and-trade ni bonus (documentado) | T (`economy`, `marketChampion`) | Aceptable para el público objetivo |
| Temporadas y calendario de 82 partidos | `schedule.ts`, `season.ts` | ✅ | 1.230 partidos, nadie juega dos veces el mismo día, determinista | — | T (`engine.test`) | — |
| Simulación de partidos y box scores | `gamesim.ts`, `stats.ts` | ✅ | Porcentajes y minutos coherentes, líderes plausibles | No hay ficha de partido completa de ambos equipos en la UI | T | — |
| Estadísticas de carrera | `stats.ts`, `Play.tsx` (pestañas) | ✅ | Totales y promedios por temporada; franja de totales en móvil | — | N (sesiones previas), E | — |
| Progresión de atributos y OVR | `progression.ts`, `attributes.ts`, `nbaRating.ts` | ✅ | Desarrollo, envejecimiento, apuestas de OVR | — | T (`nbaRating`, `gamble`) | — |
| Lesiones y fatiga | `injuries.ts` | ✅ | Lesiones, fatiga acotada | — | T (`fatigue`) | — |
| Traspasos | `market.ts` | 🟡 | El usuario puede ser traspasado | Los equipos NPC no se traspasan jugadores entre sí (documentado) | E | Bajo impacto en la experiencia |
| Playoffs, Play-In y campeón | `season.ts` | ✅ | Series a 4 victorias, un campeón | — | T (`champion`) | — |
| Premios y All-Star | `awards.ts` | ✅ | MVP, All-NBA, All-Star, elegibilidad de 65 partidos | — | T | — |
| Ligas internacionales | `data/clubs.ts` (179 clubes), `satellite.ts` | 🟡 | 137 clubes reales y 42 ligas como destino | Ligas «satélite» simplificadas, no son competiciones completas | T (`realLeague`) | — |
| Selección nacional y medallas | `events.ts`, `achievements.ts`, `ui/card.ts` | 🔵 | Eventos y medallas en la tarjeta PNG | No verificado de punta a punta en esta auditoría | E | Test de flujo |
| Decisiones narrativas (~96 eventos) | `content/events.ts`, `engine/events.ts`, `EventInline.tsx` | ✅ | Condiciones y efectos declarativos; tirada de probabilidad animada | Textos solo en ES; EN y CA se traducen en el DOM | T (`outcomes`, `risk`, `gamble`), N | — |
| Minijuegos (tiro, reacción, potencia, memoria) | `ui/minigames/*`, `engine/minigames.ts` | 🔵 | Uno por posición; más difíciles en `pre` | Muy recientes, aún no están en producción (anillero.com sirve `df99907`) | T (`minigame*`, `dragShot*`, `pointer`) | Probar en móviles reales |
| Economía y finanzas (patrimonio, hipotecas, bancarrota, all-in) | `engine/finance.ts` | 🔵 | Gastos de carrera, hipotecas y bancarrota con consecuencias deportivas | Está en `main`/`pre`, no en producción | T (`finance`, `financeEvents`, `financeFlow`) | — |
| Guardado y recuperación | `store/store.ts` | 🟡 | Autoguardado en `localStorage`, rescate en caso de error | **Una sola ranura.** 0,55-0,63 MB por partida (medido). `migrate()` descarta partidas de otra versión. **No se puede importar** el JSON exportado. Bug en el nombre del archivo exportado. | N (tamaño medido), E | P1: migraciones reales e importación |
| Historial de carreras | `store.ts` (`recordHistory`), `Careers.tsx` | ✅ | Carreras terminadas con ranking | Solo en este navegador | E, N (sesiones previas) | — |
| Logros (22) y vitrina | `engine/achievements.ts`, `Play.tsx` | ✅ | Logros que se mantienen entre partidas | Los logros `daily*` están filtrados porque no hay reto diario | T (`challenges`) | — |
| Reto por carrera | `engine/challenges.ts` | ✅ | Un objetivo por carrera, visible en la pestaña «Reto» | — | T | — |
| **Reto diario** | `career.ts` (`dailyKey`), `config.ts` (`daily`) | 🧱 / ⛔ en UI | El motor lo soporta | **No hay entrada en la interfaz.** El ROADMAP dice «Hecho», pero está desfasado. | E | Recuperarlo: es la mejor palanca de retención (ver 06) |
| Racha de días | `store.ts` (`touchStreak`) | 🔵 | Se guarda | Sin uso visible relevante (E) | E | — |
| Tarjeta PNG y compartir | `ui/card.ts`, `ui/download.ts`, `navigator.share` | ✅ | Pico de OVR, valor máximo, medallas | No incluye un enlace o código para invitar ni el dominio de producción en la imagen (sin verificar) | T (`card`, `download`) | Añadir URL y CTA en la tarjeta |
| Idiomas ES/EN/CA | `i18n/*`, `gen-pages.mjs` | ✅ | 3 URLs indexables y cookie de idioma | Traducción en el DOM, frágil ante cambios de texto | T (`i18n/__tests__`) | — |
| Responsive y móvil | `simple.css` | ✅ | Sin scroll horizontal a 393 px (medido: `overflowX = 0`) | CLS de la rejilla de países | N | Reservar la altura de `.country-grid` |
| PWA instalable | `manifest.webmanifest`, `sw.js` | ✅ | Manifest válido y SW registrado | Sin capturas en el manifest; sin `id` | N (200 en ambos), E | — |
| Funcionamiento sin conexión | `sw.js` | 🔵 | Diseñado para funcionar sin red una vez cacheado | No probado en esta auditoría | E | — |
| Ranking online o cuentas | — | ⛔ | — | Requiere backend (documentado como futuro) | — | No prioritario |
| Analítica | — | ⛔ | — | Nada | E | **P0** |
| Páginas legales (privacidad, aviso legal) | — | ⛔ | Solo hay una nota de «proyecto independiente» en el pie | — | E | P1 |

## Porcentaje aproximado terminado

**Método:** se listan las 31 funcionalidades de la tabla y se puntúa cada una según su estado: ✅ = 1, 🟡/🔵 = 0,5, ⛔/🧱 = 0. Después se pondera con dos pesos:
- el **núcleo jugable** (creación → temporadas → draft → contratos → retirada) pesa ×2;
- lo **comercial** (analítica, legales, distribución) pesa ×1.

**Resultados:**
- Juego en sí: **≈ 85 %** de lo planteado. El bucle completo existe y está testeado.
- Producto publicable (juego + guardado robusto + medición + legales + SEO coherente): **≈ 60-65 %**.
- Rango global razonado: **65-75 %**.

No es el porcentaje de archivos escritos. La parte que falta pesa poco en líneas de código y mucho en la capacidad de crecer.
