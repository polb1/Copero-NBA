# 07 · Plan de analítica

**Situación actual:**
- No hay ninguna medición en el código.
- Solo hay una cookie funcional (`lang`).
- No hay banner de consentimiento, y hoy no es necesario.

## 1. Herramienta recomendada

| Opción | Coste | Cookies / consentimiento (RGPD / ePrivacy) | Eventos personalizados | Encaje |
|---|---|---|---|---|
| **Cloudflare Web Analytics** | Gratis, ya está en Cloudflare | Sin cookies, no requiere banner | **No** (solo páginas vistas, referentes y Core Web Vitals reales) | Ideal como **primer paso inmediato**: 5 minutos y datos de campo de CWV |
| **Umami** (cloud gratis o autoalojado) | Gratis hasta cierto volumen | Sin cookies | **Sí** | **Recomendada para el embudo** |
| **Plausible** | De pago (~9 €/mes) | Sin cookies | Sí | Igual que Umami, pero de pago |
| **Google Analytics 4** | Gratis | Usa cookies → **banner obligatorio en la UE** y Consent Mode | Sí, muy potente | Exceso de complejidad y fricción para un juego pequeño, que además reduce los datos por los rechazos |

**Recomendación:**
1. Cloudflare Web Analytics desde hoy, solo en el dominio de producción.
2. Umami para eventos.
3. Solo en `anillero.com`: el script se inyecta en el build cuando `SITE_URL` es el de producción. **Nunca** en `pre`.
4. Search Console de dominio para la parte orgánica.

## 2. Eventos

Adaptados a la arquitectura: los eventos salen del store, en `store/store.ts`, y de las pantallas. **Ninguno incluye el nombre del jugador, la semilla completa ni identificadores personales.**

| Evento | Cuándo se dispara | Parámetros | KPI |
|---|---|---|---|
| `landing_view` | Automático (página vista) | `lang`, `referrer` (lo pone la herramienta) | Visitas por canal |
| `create_view` | Montaje de `Start.tsx` | `lang` | — |
| `career_start` | Pulsar «Empezar carrera» con éxito | `mode` (express, quick o full), `pos`, `region` (continente, no país), `lang` | Conversión visita → carrera |
| `first_decision` | Primera respuesta a un evento | `event_kind` (agent, draft…) | Activación |
| `season_complete` | Fin de cada temporada (solo la 1.ª, la 3.ª y la 10.ª, para limitar el volumen) | `season_n`, `mode`, `league_tier` | Profundidad |
| `career_retire` | Retirada | `seasons`, `mode`, `legacy_tier` (bucket), `rings` (bucket) | Carreras completadas |
| `card_share` / `card_download` | Botones de compartir y descargar | `method` (share o download) | Viralidad |
| `career_resume` | Abrir la app con una partida en curso (`lastSlotId`) | `days_since_last` (bucket) | Sesiones de retorno |
| `minigame_play` | Fin de un minijuego | `type`, `result` (bucket) | Uso de minijuegos |
| `lang_switch` | Cambio de idioma | `from`, `to` | — |
| `error_boundary` | El `ErrorBoundary` captura un fallo | `screen` | Estabilidad |

Fuente externa (UTM o referente): la registra la herramienta automáticamente. Usar `?utm_source=tiktok…` en los enlaces de las redes.

## 3. Embudo

```
landing_view → career_start → first_decision → season_complete (1.ª) → career_resume (otro día) → career_resume en días distintos (recurrente)
```

**Retención:** D1, D7 y D30 aproximados mediante `career_resume`. Sin cookies, la retención exacta por usuario no es posible; el *hash* diario de Umami y Plausible no sigue a la misma persona entre días. Alternativas:
- un identificador anónimo propio en `localStorage`, enviado como propiedad del evento, que sí permite cohortes pero requiere revisar si constituye un tratamiento que necesita consentimiento (consultar);
- o conformarse con la métrica «sesiones de retorno».

## 4. Cuadro de mando

| Bloque | Métricas |
|---|---|
| **Adquisición** | Usuarios y visitas; visitas por canal (orgánico, social, referido, directo); impresiones, clics, CTR y posición en GSC; landing pages principales |
| **Activación** | % de `landing_view` → `career_start`; % de `career_start` → `first_decision`; % que completa la 1.ª temporada |
| **Retención** | `career_resume` por semana; carreras completadas; usuarios recurrentes (si se usa el ID anónimo); D1, D7 y D30 cuando haya volumen (> 100 carreras/semana) |
| **Viralidad** | `card_share` por cada `career_retire`; visitas con `utm_source=card` |
| **Técnico** | Core Web Vitals reales (Cloudflare Web Analytics); tasa de `error_boundary` |

**Objetivos:** no se fijan todavía. Primero hay que recoger **4 semanas de línea base** y después proponer metas relativas, por ejemplo «+20 % de activación tras el cambio de onboarding».

## 5. Privacidad

- No enviar nombres de jugadores, la semilla, el país exacto ni datos de la partida.
- Publicar una política de privacidad corta que diga qué se mide y con qué herramienta.
- Excluir el tráfico interno: un filtro por IP en Umami, o un `localStorage.setItem('umami.disabled', 1)` en los dispositivos del equipo.
- Producción y preproducción **no deben compartir el ID de sitio.**
