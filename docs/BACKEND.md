# Backend de Anillero · propuesta

Fecha: 6 de noviembre de 2026. Estado: **propuesta**, no implementado.

## Por qué hace falta

Hoy todo lo que no es HTML vive en el navegador del jugador. Eso rompe tres cosas
que ya están en el producto o en el plan:

1. **Racha del reto diario**: se pierde al limpiar datos o cambiar de móvil, y no se
   puede comparar entre jugadores.
2. **Ranking y comparación**: "puesto #3 de tus carreras" solo compara contigo mismo.
3. **Tarjeta compartible**: hoy es un PNG generado en el cliente. Sin servidor no hay
   URL propia (`/c/<id>`), ni imagen Open Graph, ni contador de compartidos.
4. **Guardado de carrera**: si el jugador cambia de dispositivo, pierde todo.

No hace falta backend para *jugar*. Hace falta para **retener, comparar y medir**.

## Stack recomendado: Cloudflare Workers + D1

| Pieza | Elección | Motivo |
|---|---|---|
| Cómputo | **Workers** (el mismo proyecto `copero-x-nba`) | Ya sirve la web; cero CORS, cero servidor que mantener, free tier 100.000 req/día |
| Base de datos | **D1** (SQLite gestionado) | 5 GB gratis, SQL normal, latencia baja junto al Worker |
| Ficheros | **R2** | Solo si guardamos tarjetas PNG en servidor (opcional; también vale generarlas en el cliente) |
| Cron | **Cron Triggers de Workers** | Cierre diario del reto, recálculo de ranking |
| Auth | **Device ID anónimo** (UUID en localStorage) + enlace mágico más adelante | Empezar sin fricción: nadie se registra para jugar |

**Por qué no Laravel aquí**: el equipo lo domina, pero implicaría otro dominio, CORS,
un VPS o PaaS que mantener y ~5-10 €/mes. Se justificaría si hiciera falta un panel de
administración serio o lógica de negocio pesada. Para ranking, rachas y guardado, Workers
cubre de sobra y a coste cero. Si más adelante hace falta backoffice, Laravel puede
consumir la misma API.

**Por qué no Supabase**: Postgres + auth resuelto, pero añade dependencia externa, CORS
y límites de free tier que se notan con imágenes. Workers+D1 mantiene todo en el mismo
sitio donde ya está el dominio.

## Qué guarda (esquema mínimo)

```sql
players(id TEXT PRIMARY KEY,        -- UUID anónimo del dispositivo
        created_at INTEGER, nickname TEXT, country TEXT)

careers(id TEXT PRIMARY KEY, player_id TEXT, seed INTEGER,
        created_at INTEGER, finished_at INTEGER,
        legacy_score INTEGER, titles INTEGER, tier TEXT,
        payload TEXT)               -- JSON de la carrera (para reanudar/compartir)

daily_results(day TEXT, player_id TEXT, goal_id TEXT,
              done INTEGER, progress_a INTEGER, progress_b INTEGER,
              legacy_score INTEGER, created_at INTEGER,
              PRIMARY KEY(day, player_id))

daily_streaks(player_id TEXT PRIMARY KEY, streak INTEGER, best INTEGER, last_day TEXT)

shares(id TEXT PRIMARY KEY, career_id TEXT, created_at INTEGER, views INTEGER)
```

Índices: `daily_results(day)`, `careers(player_id)`, `daily_streaks(streak DESC)`.

## Endpoints

| Método | Ruta | Para qué |
|---|---|---|
| POST | `/api/daily/result` | Registra el resultado del día (idempotente por día y jugador) |
| GET | `/api/daily/today` | Objetivo del día + cuántos lo han cumplido |
| GET | `/api/daily/leaderboard?day=` | Top 100 del día (legacy score) |
| POST | `/api/career` | Guarda una carrera terminada |
| GET | `/api/career/:id` | Carrera concreta (para `/c/<id>`) |
| GET | `/c/:id` | Página pública de la carrera + Open Graph dinámico |
| GET | `/api/stats` | Agregados anónimos (partidas, retos, compartidos) |

**Anti-trampas mínimo**: el seed del día lo decide el servidor (`/api/daily/today`), y el
resultado se valida comprobando que la carrera se generó con ese seed. No es infalible,
pero encarece el tramposo casual.

## Cómo se implementa (3 semanas)

1. **Semana 1**: D1 + tablas + `POST /api/daily/result` y `GET /api/daily/today`.
   El cliente deja de calcular la racha en local y la pide al servidor (con *fallback*
   a localStorage si falla).
2. **Semana 2**: ranking diario y página `/c/<id>` con Open Graph. Las tarjetas pasan a
   tener URL propia: eso es lo que hace que un compartido traiga visitas.
3. **Semana 3**: guardado de carrera en servidor + panel mínimo de métricas.

## Coste

- Workers: 100.000 peticiones/día gratis. Con 1.000 jugadores activos y ~10 llamadas por
  sesión, sobra margen.
- D1: 5 GB y 5 M lecturas/día gratis. Una carrera pesa ~20 KB: 250.000 carreras.
- Total esperado al principio: **0 €/mes**.

## Qué NO mete el backend

- No guarda datos personales: solo un UUID anónimo y, si el jugador quiere, un apodo.
- No toca la ingesta de datos deportivos: eso sigue en `ingest.py` y los JSON estáticos.
- No sirve el juego: el juego sigue siendo estático y jugable sin conexión.
