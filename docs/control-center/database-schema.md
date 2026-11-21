# Esquema de base de datos · Control Center

Migración: `migrations/0004_control_center.sql`. Todas las tablas tienen `env` (`production`, `pre` o `local`) y la API filtra siempre por él. Fechas de calendario como texto `AAAA-MM-DD`; marcas de tiempo como milisegundos (`INTEGER`). Las personas se guardan por email.

## Tablas

### `cc_categories`
| Columna | Tipo | Notas |
|---|---|---|
| id | TEXT PK | UUID |
| env | TEXT | |
| name | TEXT | único por entorno (`idx_cc_categories_name`) |
| color | TEXT | hex |
| sort | INTEGER | orden |
| created_at | INTEGER | |

Se crean solas las 7 por defecto la primera vez que alguien entra en un entorno: Desarrollo, Diseño/UX, SEO, Rendimiento, Seguridad/infra, Marketing y Administración.

### `cc_tasks`
| Columna | Tipo | Notas |
|---|---|---|
| id, env | TEXT | |
| title | TEXT | obligatorio, ≤ 200 |
| description, evidence, done_criteria | TEXT | |
| status | TEXT | `backlog` · `todo` · `doing` · `review` · `done` |
| priority | TEXT | `P0` · `P1` · `P2` · `P3` |
| category_id | TEXT → cc_categories | `ON DELETE SET NULL` |
| assignee | TEXT | email o `NULL` (Sin asignar) |
| suggested_assignee | TEXT | solo informativo |
| visibility | TEXT | `shared` · `private` (solo la ve quien la creó) |
| due_date | TEXT | `AAAA-MM-DD` |
| milestone_id | TEXT → cc_milestones | `ON DELETE SET NULL` |
| weight | INTEGER | 0–100, peso en el hito |
| source, source_ref | TEXT | origen; `source_ref` único por entorno (importación idempotente) |
| incident_id | TEXT | incidencia de la que viene |
| verified | INTEGER | 0/1: los criterios de terminado se han comprobado |
| sort | REAL | orden en el Kanban |
| created_by, created_at, updated_at | | |

### `cc_incidents`
`id, env, title, description, severity (critica|alta|media|baja), status (abierta|en_tarea|resuelta|descartada), category_id, evidence, source, source_ref, task_id → cc_tasks, created_by, created_at, updated_at`.

El vínculo con su tarea va en los dos sentidos: `cc_incidents.task_id` y `cc_tasks.incident_id`.

### `cc_milestones`
`id, env, title, description, due_date, status (abierto|cerrado), source_ref, created_by, created_at, updated_at`. El progreso no se guarda: se calcula en cada lectura.

### `cc_decisions`
`id, env, title, context, decision, status (propuesta|aceptada|descartada), decided_at, created_by, created_at, updated_at`.

### `cc_notes`
`id, env, title, body, pinned, created_by, created_at, updated_at`.

### `cc_comments`
`id, env, entity_type (tasks|incidents|milestones|decisions|notes|categories), entity_id, body, author, created_at`. Se borran con su entidad.

### `cc_activity`
`id, env, actor, action, entity_type, entity_id, summary, created_at`. Solo inserciones: registro de quién hizo qué.

### `cc_saved_filters`
`id, env, owner, name, view, query (JSON), created_at`. Cada filtro es de su propietario.

## Progreso ponderado de un hito

```
progreso = Σ peso(tareas del hito en «done») / Σ peso(todas las tareas del hito) × 100
```
Redondeado al entero. Sin tareas o con peso total 0: 0 %. Las tareas privadas de otra persona no cuentan en lo que tú ves. Implementado en `milestoneProgress()` (`src/control-center/logic.ts`).

## `migrations/0003_auth.sql`

Las tablas de Better Auth (`user`, `session`, `account`, `verification`) y `guest` estaban en `src/db/schema.ts` pero no en `migrations/`, así que una base de datos local nueva no podía iniciar sesión. Se generan con `drizzle-kit export` y usan `IF NOT EXISTS`: en la base remota, que ya las tiene, no cambian nada.
