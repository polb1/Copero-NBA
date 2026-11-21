# Permisos · Control Center

## Quién entra

Hacen falta las tres cosas, comprobadas en el servidor en cada petición:

1. **Sesión válida** de Better Auth (la misma cuenta de anillero.com).
2. **Email verificado** (`user.email_verified = 1`).
3. **Email en la lista blanca** `CC_ALLOWED_EMAILS` (separados por comas, sin distinguir mayúsculas).

Si la lista está vacía o no existe, **no entra nadie**.

| Situación | `/control-center` | `/api/cc/*` |
|---|---|---|
| Sin sesión | 302 → `/auth/login` | 401 |
| Sesión, sin verificar o fuera de la lista | 404 (no revela que existe) | 403 |
| Miembro | 200 | según la operación |

La lista blanca es una variable del Worker, no está en el código. En Cloudflare se define en *Workers → copero-x-nba / copero-nba-pre → Settings → Variables and Secrets* (mejor como **secret**, para que no se vea en el panel). En local va en `.dev.vars`, que está en `.gitignore`.

Para añadir o quitar a alguien: cambia la variable y vuelve a desplegar (o `wrangler secret put CC_ALLOWED_EMAILS`). No hace falta tocar la base de datos.

## Qué puede hacer un miembro

Todos los miembros tienen los mismos permisos: es un panel para un equipo pequeño. Con una excepción:

| Recurso | Ver | Crear/editar/borrar |
|---|---|---|
| Tareas compartidas | todos | todos |
| Tareas privadas | solo quien la creó | solo quien la creó (para el resto da 404) |
| Incidencias, hitos, decisiones, notas, categorías | todos | todos |
| Comentarios | todos | todos pueden comentar; no se editan |
| Filtros guardados | solo su propietario | solo su propietario |
| Actividad | todos | nadie (la escribe el servidor) |

## Qué no se puede falsear desde el cliente

- `env`, `id`, `created_by`, `author`, `owner`, `created_at`: los pone el servidor; si llegan en el cuerpo se ignoran.
- Cada tipo de entidad tiene una lista cerrada de campos editables y validados (`ENTITIES` en `logic.ts`): estados, prioridades y gravedades solo con sus valores; fechas `AAAA-MM-DD`; textos con longitud máxima.
- Todas las consultas llevan `WHERE env = ?` y, en las tareas, la condición de visibilidad.
- Las consultas son SQL con parámetros (`prepare().bind()`); los nombres de tabla y columna salen de la lista cerrada, nunca de la petición.

## Cabeceras

Todas las respuestas del panel y de la API llevan `X-Robots-Tag: noindex, nofollow, noarchive` y `Cache-Control: private, no-store`.
