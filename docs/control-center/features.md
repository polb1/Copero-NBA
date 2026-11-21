# Funcionalidades · Control Center

| Sección | Qué hace |
|---|---|
| **Dashboard** | Tareas por estado, mis abiertas, vencidas, incidencias abiertas, abiertas por prioridad, progreso de cada hito y actividad reciente. Si el entorno está vacío, botón para la importación inicial. |
| **Mi trabajo** | Tareas asignadas a mí y mis tareas privadas. |
| **Trabajo compartido** | Todas las tareas compartidas del equipo. |
| **Kanban** | Columnas Backlog · Por hacer · En curso · En revisión · Hecho. Arrastrar una tarjeta cambia su estado y la pone al final de la columna. Sin ratón: abrir la tarjeta (Enter) y cambiar el estado en el panel. |
| **Lista** | Tabla ordenable por cualquier columna (clic en la cabecera). |
| **Calendario** | Mes con las tareas en su fecha límite; cuenta las abiertas sin fecha. |
| **Por persona** | Una columna por miembro y otra «Sin asignar». |
| **Por prioridad** | Tareas abiertas en columnas P0–P3. |
| **Incidencias** | Alta rápida, cambio de estado y **Convertir en tarea** con un clic: crea la tarea con título, descripción, evidencia y categoría, prioridad según la gravedad (crítica → P0…), y deja el vínculo en los dos sentidos. Si ya tenía tarea, abre esa. |
| **Hitos** | CRUD con barra de progreso ponderado (ver `database-schema.md`). |
| **Decisiones** | Registro de decisiones: contexto, decisión, estado y fecha. Con comentarios. |
| **Notas** | Notas libres del equipo. Con comentarios. |
| **Actividad** | Últimas 200 acciones: quién, qué y sobre qué. |
| **Categorías** | Añadir, renombrar, cambiar color y borrar (sus tareas quedan sin categoría). |

## En todas las vistas de tareas

- **Filtros:** texto, estado, prioridad, categoría, responsable (incluido «Sin asignar») e hito.
- **Filtros guardados:** se guardan con su vista y son personales.
- **Panel de tarea:** todos los campos, evidencia, criterios de terminado, casilla «Verificado», origen, enlace a la incidencia y comentarios.

## Buscador global

En la barra superior. Busca (desde 2 caracteres) en tareas, incidencias, hitos, decisiones y notas, en título, descripción y evidencia. Las tareas privadas de otros no aparecen.

## Lo que no hace (a propósito)

- Notificaciones por email, adjuntos, subtareas, tiempo real y roles distintos: no se pidieron.
- No enlaza desde ninguna página pública.
