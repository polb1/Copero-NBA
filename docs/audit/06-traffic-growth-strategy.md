# 06 · Diagnóstico de tráfico, mercado y estrategia de crecimiento

## 1. Qué se sabe realmente del tráfico

| Fuente | ¿Existe? | ¿Hay datos? |
|---|---|---|
| Analítica en el código (GA4, Plausible, Umami…) | **No** | — |
| Cloudflare Web Analytics | No se detectó el *beacon* en el HTML. No se comprobó en el panel. | Desconocido |
| Métricas del Worker en Cloudflare | Existen. El panel de la cuenta personal mostraba «Requests 0» (1-22 oct), pero las peticiones a *static assets* no cuentan como invocaciones del Worker, así que **no es una medida de visitas**. | No interpretable |
| Search Console | Propiedad `nba.polb.dev` (portada «rastreada, sin indexar» el 20-10). **anillero.com: no consta.** | No hay datos de anillero.com |
| Logs del servidor | No configurados (Logpush es de pago) | — |
| Instalaciones PWA | No se miden | — |

**Conclusión:** «recibe poco tráfico» **no puede confirmarse ni medirse hoy.** La ausencia de datos no equivale a ausencia de tráfico. Aun así, varios hechos técnicos hacen muy probable que el tráfico orgánico sea casi nulo.

## 2. Causas del bajo tráfico

| # | Causa | Estado | Evidencia |
|---|---|---|---|
| 1 | Problemas técnicos que impiden indexar | **Confirmada** | Canonical a otro dominio, 6 hosts duplicados indexables, portada «sin indexar» en el dominio antiguo y dominio nuevo con días de vida |
| 2 | Falta de contenido que responda a búsquedas | **Confirmada** | 3 URLs indexables y unas 1.060 palabras por idioma; los competidores tienen de 7 a 15 guías |
| 3 | Escasa autoridad y pocos enlaces | **Probable** | Dominio nuevo, repo de GitHub sin homepage, no se han encontrado menciones externas |
| 4 | Falta de promoción y distribución | **Probable** | Sin redes, sin Discord y sin publicaciones detectadas |
| 5 | Competencia elevada (en inglés) | **Confirmada en inglés**, baja en español | Ver §3 |
| 6 | Propuesta de valor poco clara | **Probable** | No dice «gratis» ni qué la diferencia en la primera pantalla; marca ambigua (NBA Legacy / Anillero) |
| 7 | La experiencia inicial no convierte | **Poco probable** | 2 acciones hasta jugar, sin errores |
| 8 | Poca retención y pocas recomendaciones | **Probable** | Sin reto diario visible ni mecanismo de invitación; la tarjeta PNG no lleva URL (sin verificar) |
| 9 | Falta de medición | **Confirmada** | Sección 1 |

## 3. Competidores (consultados el 23-10-2026)

Toda la información sale de las propias webs de los productos. **No se conoce el tráfico de ninguno.**

| Nombre y URL | Qué ofrece | En qué destaca | Qué aprender | Qué no copiar | Oportunidad para Anillero |
|---|---|---|---|---|---|
| **HoopDreams** — hoopdreams.io | Carrera de texto desde los 16 años; Full Season, GOAT Mode, duelos con amigos y GM Mode | 7 guías SEO con hub (`/guides/...`), 15 idiomas, ranking, PWA y sincronización | El hub de guías por intención («nba-draft-simulator», «best-builds»…) y los **duelos con semilla** | Monedas, tokens y límite diario de carreras con pago (fricción y monetización agresiva) | Experiencia gratuita y sin límites; plantillas reales |
| **DRAFTBOUND** — draftboundsim.com | Desde los 14 años: instituto, reclutamiento, liga ficticia de unos 240 jugadores y gamecast 2D | Retos con semilla, carrera post-retirada, changelog público, páginas Press y Privacy | **Changelog público** y páginas de prensa/privacidad (confianza) | Liga ficticia: nuestra baza son los equipos reales | Realismo 2026-27 y Europa |
| **My NBA Career Simulator** — mynbacareer.com | Crear prospecto, 4 vías previas al draft y 20 temporadas al instante | **Interruptor EN/ES**, comparativa con 2K MyCareer, fórmula del Hall of Fame | Página de comparativa honesta | — | Único rival con ES detectado: competir en español con más profundidad (Europa, ACB) |
| **Basketball GM** — basketball-gm.com | Gestor de franquicia con rosters históricos | Comunidad grande: r/BasketballGM, Discord, blog | La **comunidad** como motor de crecimiento | No es el mismo género (GM, no carrera) | Proponer Anillero en hilos de «quiero un modo carrera» |
| **Build a Baller** — pitchinglab.pitchergami.com/hoops | Construir un jugador con ratings reales de la NBA | Modo Draft y **reto diario** | El reto diario como hábito | — | El reto diario ya existe en nuestro motor |
| **airball.gg** (Career Mode), **basketballcareersimulator.com** | Modo carrera en navegador | — | — | — | — |

**Hueco detectado (hipótesis):**
- En **español** las SERP de «simulador de carrera NBA» son de baja calidad: emuladores de apps Android y páginas generadas.
- En **catalán** no hay nada.
- **Europa y la ACB** como camino real (137 clubes y 42 ligas) no los cubre bien nadie.

## 4. Estrategia por canales

### A. SEO y contenidos

Pocas guías útiles, cada una alimentada con datos reales del motor.

| Público | Intención | Palabra clave principal | URL propuesta | Tipo | Dificultad | Impacto | Esfuerzo | Medición |
|---|---|---|---|---|---|---|---|---|
| Hispanohablantes | Jugar | simulador de carrera NBA gratis | `/` (ya existe; arreglar el canonical) | Landing | Media | Alto | Bajo | Impresiones y clics en GSC |
| ES | Informarse | cómo funciona el draft de la NBA | `/guias/draft-nba/` | Guía con ejemplos del simulador | Media | Medio | Medio | Clics → `career_start` |
| ES | Informarse y jugar | jugar en Europa antes de la NBA (ACB, Euroliga, NCAA) | `/guias/europa-o-ncaa/` | Guía con datos agregados del motor (% de llegadas a la NBA por vía) | Baja | Medio | Medio | Ídem |
| ES | Informarse | posiciones del baloncesto explicadas | `/guias/posiciones/` | Guía (ya existe `POS_INFO` en `Start.tsx`) | Media | Medio | Bajo | Ídem |
| EN | Comparar | MyCareer alternative browser free | `/en/guides/mycareer-alternative/` | Comparativa honesta | Alta | Medio | Bajo | Ídem |
| EN | Jugar | basketball career simulator Europe | `/en/guides/euroleague-to-nba/` | Guía | Media | Medio | Medio | Ídem |
| CA | Jugar | simulador de carrera de bàsquet | `/ca/` (existe) | Landing | Baja | Bajo-medio | — | Ídem |
| Todos | Curiosidad | «Mi carrera: datos de 10.000 carreras simuladas» | `/guias/estadisticas/` | Datos propios generados con el motor (contenido original y enlazable) | Baja | Medio-alto (enlaces) | Medio | Enlaces y referidos |

**No hacer:** páginas por cada equipo o jugador generadas automáticamente.

### B. Redes sociales y comunidades

| Canal | Formato concreto | Por qué |
|---|---|---|
| TikTok, YouTube Shorts, Reels | «De la ACB al anillo en 60 s»: grabación de pantalla de una carrera Exprés con decisiones dramáticas y el resultado de la tirada animada | La tirada de probabilidad y los minijuegos son muy visuales |
| | «Elegí la agencia familiar… y esto pasó»: dos finales alternativos con la misma semilla | El determinismo del motor lo permite |
| Reddit | r/BasketballGM, r/NBA2K (hilos de modo carrera), r/baloncesto, r/ACB; en inglés solo en hilos de feedback o «Show-off Saturday» y respetando las normas | Comunidades donde se pide justo esto |
| Discord propio | Canal de carreras compartidas y retos semanales | Retención y feedback |
| Foros ES | ACB.com (comunidad), Forocoches (subforo de deportes), Mediavida | Mercado hispano poco servido |

### C. Viralidad dentro del producto

| Idea | Coste | Justificación |
|---|---|---|
| URL y CTA en la tarjeta PNG («anillero.com · ¿superas mi legado?») | Muy bajo | Cada tarjeta compartida es un anuncio gratuito |
| **Reto con semilla compartible:** `anillero.com/#/start?seed=XXXX`, mismas condiciones, comparar el legado | Bajo (el motor ya es determinista y `dailyKey` existe) | Duelos entre amigos sin backend |
| Reto diario o semanal (recuperar `dailyKey` en la UI) | Bajo-medio | Hábito y conversación («¿qué sacaste hoy?») |
| Ranking global | Alto (backend) | **No ahora** |

### D. Retención (no es lo mismo que adquisición)

- Reto diario o semanal visible en la portada.
- «Siguiente objetivo» al retirarse: por ejemplo, «Consigue un anillo desde la vía europea».
- Vitrina de logros entre carreras (ya existe; darle visibilidad).
- Importar o exportar la partida para cambiar de dispositivo.
- **Evitar** notificaciones *push* y recompensas compulsivas.

### E. Colaboraciones y enlaces

- Directorios de juegos de navegador e indie: itch.io (página del juego con enlace), Product Hunt, Indie Hackers (*show*), AlternativeTo (como alternativa a 2K MyCareer y HoopDreams).
- Creadores de baloncesto en español (YouTube y TikTok de ACB/NBA) a los que ofrecer un reto con su semilla.
- Blogs de baloncesto en catalán (nicho con poca oferta).
- Repo de GitHub con homepage y *topics* (`basketball`, `simulator`, `browser-game`).
- **No** comprar enlaces ni usar granjas.

Backlog completo con prioridades: [08-prioritized-roadmap.md](08-prioritized-roadmap.md).
