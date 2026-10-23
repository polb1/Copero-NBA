# 05 · Rendimiento, experiencia de usuario, accesibilidad y conversión

## 1. Rendimiento (laboratorio)

**Herramienta:** Playwright con Chromium 1228 en perfil Pixel 5, sin caché, con la red y la CPU limitadas como en el perfil móvil de Lighthouse: latencia de 150 ms, 1,6 Mbps de bajada y CPU 4× más lenta. Se hicieron 3 cargas por dominio el 23-10-2026. El script está en `scratchpad/wk/audit-perf.mjs`, fuera del repo.

**Son datos de laboratorio, no de usuarios reales.** No hay datos CrUX ni de campo, y **PageSpeed Insights respondió «cuota diaria excedida»**, así que no hay puntuación oficial de Lighthouse.

| Métrica (mediana de 3) | anillero.com (`df99907`) | pre.anillero.com (`f3925bf`) | Umbral «bueno» |
|---|---|---|---|
| FCP (primer contenido) | ~0,81 s | ~0,77 s | ≤ 1,8 s |
| LCP | ~2,96 s | ~3,26 s | ≤ 2,5 s |
| Juego interactivo (desaparece el splash) | ~2,8 s | ~3,2 s | — |
| CLS | **0,14** sin limitación / **2,0** con limitación | igual | ≤ 0,1 |
| Transferido en la carga inicial | 179 KB, 34 peticiones | 253 KB, 36 peticiones | — |
| Errores de consola y peticiones fallidas | 0 / 0 | 0 / 0 | — |

**Peso del build en `pre`:**

| Archivo | Tamaño | Comprimido (gzip) |
|---|---|---|
| `main-*.js` | 768 kB | 230 kB |
| `simWorker-*.js` | 164 kB | — |
| `en-*.js` | 101 kB | 40 kB |
| `ca-*.js` | 101 kB | 37 kB |
| `main-*.css` | 65 kB | 14 kB |

Vite avisa de que hay chunks de más de 500 kB.

**Diagnóstico:**
- **CLS:** la rejilla de países (`.country-grid`, dentro de `.simple-cols`) cambia de altura al montarse y empuja el contenido. El valor de 2,0 con red lenta es probablemente la suma de ese salto más el cambio de fuente (Inter y Barlow se cargan con `media="print"` y swap) y la sustitución del splash. Hay que **confirmarlo con Lighthouse oficial**, porque el valor es anómalamente alto.
- **LCP de ~3 s:** el bundle principal incluye el JSON de plantillas reales (444 KB sin comprimir) y todo el motor. El splash pinta rápido (buen FCP), pero el contenido real llega tarde.
- **Bien resuelto:**
  - la simulación corre en un Web Worker, así que el hilo principal no se bloquea;
  - las 200 banderas tienen `loading="lazy"`;
  - las fuentes no bloquean;
  - el service worker sirve los assets desde caché en las visitas siguientes.

**Recomendaciones:**
1. Reservar la altura de `.country-grid` o renderizarla con altura fija y scroll interno.
2. Separar `nbaRoster2026.json` y el motor en chunks cargados con `import()`. La pantalla de creación no los necesita hasta pulsar «Empezar».
3. Medir con PageSpeed Insights cuando haya cuota, o con Lighthouse en local, y guardar la línea base.
4. Usar `font-display: optional` o *preload* de la fuente del H1.

## 2. Experiencia de un usuario nuevo (móvil, observado en capturas)

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Qué entiende en los primeros 5 segundos? | «Crea tu jugador. Elige país y posición y vive tu carrera desde los 18 años». **Se entiende que es un juego de carrera.** | Captura `first-screen.png` |
| ¿Queda claro que es gratis? | **No en la primera pantalla.** «Gratis» solo aparece en el `<title>` y en el pie, debajo del juego. | Texto visible inicial |
| ¿Puede empezar rápido? | **Sí.** Escribe un nombre y pulsa «Empezar carrera»: 2 acciones. La primera decisión aparece en ~0,2 s. | Flujo automatizado |
| ¿Hay demasiados pasos? | No. El botón aparece **gris y deshabilitado** hasta escribir un nombre, y el aviso «Escribe al menos un nombre o un apellido» se muestra antes de interactuar, lo que da sensación de error. | Captura |
| ¿Se explica en qué se diferencia de otros? | **No.** No menciona plantillas reales 2026-27, los minijuegos ni el catalán. | — |
| ¿Transmite calidad? | Sí: estética oscura coherente, camiseta con los colores del país y fotos en las decisiones | Capturas |
| ¿Sabe qué hacer después? | Sí: cada decisión es una tarjeta grande con 2 o 3 opciones | `first-decision.png` |
| ¿Se juega bien en móvil? | Sí: sin scroll horizontal (`overflowX = 0` a 393 px) y botones grandes | Medido |
| ¿Puede continuar una carrera anterior? | Sí, en el mismo navegador (ranura única y «Mis carreras»). **No** entre dispositivos y **no** puede importar el JSON exportado. | Código |
| ¿Razón para volver mañana? | **Débil.** Hay racha y logros, pero el reto diario no está en la UI. | Código |
| ¿Se pueden compartir resultados? | Sí: tarjeta PNG y `navigator.share` al retirarse | Código y tests |
| ¿Invitar a amigos? | No hay mecanismo específico: ni reto con semilla compartible ni enlace | Código |

**Puntos de abandono probables (hipótesis, sin datos):**
1. Pantalla de creación: botón deshabilitado y lista de 200 países visible.
2. Primera temporada: decisiones de draft sin contexto para quien no conoce la NBA.
3. Mitad de carrera en el modo Larga: 4-5 decisiones por temporada.
4. Tras la retirada: no hay un siguiente objetivo claro, salvo empezar otra carrera.

Cómo medirlos: eventos del embudo en [07](07-analytics-plan.md).

## 3. Accesibilidad (comprobaciones automáticas básicas)

| Comprobación | Resultado |
|---|---|
| `lang` del documento | `es` (y `en` / `ca` en sus páginas) ✅ |
| Imágenes sin `alt` | 0 de 200 ✅ |
| Botones sin nombre accesible | 0 ✅ |
| Inputs sin etiqueta | 0 (el dorsal usa el tipo `number` con etiqueta visual) ✅ |
| Movimiento reducido y alto contraste | Ajustes `motion` y `contrast` en el store ✅ (no se ha probado la UI) |
| Contraste del texto gris sobre el fondo oscuro | No medido. Algunos textos secundarios (#5F6672 sobre #0b0c0e) probablemente no llegan a 4,5:1. |
| Navegación con teclado y lector de pantalla | **No probados** |

Pendiente: pasar axe-core o Lighthouse Accessibility, y probar con VoiceOver o TalkBack.

## 4. Conversión: recomendaciones concretas, sin rediseñar

1. Añadir a la cabecera de creación una línea con la propuesta de valor: «Gratis · sin registro · plantillas reales 2026-27 · 5 minutos por carrera en Exprés».
2. Mostrar el aviso del nombre solo después de que el usuario intente empezar, o rellenar un nombre de ejemplo editable.
3. Plegar la rejilla de países tras un buscador, que de paso arregla el CLS.
4. Incluir el dominio y un «¿Superas mi carrera?» en la tarjeta PNG.
