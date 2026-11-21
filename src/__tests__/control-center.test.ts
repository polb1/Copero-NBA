// Control Center: pruebas T01–T06 (reglas puras). T07–T20 están en scripts/control-center.e2e.mjs
// y se ejecutan contra `wrangler dev` con D1 local.
import { DEFAULT_CATEGORIES, detectEnv, isAllowed, milestoneProgress, validate } from '../control-center/logic';
import { SEED_TASKS } from '../control-center/seed';
import { COLUMNS, visibleTasks } from '../control-center/App';

describe('Control Center', () => {
  it('T01 deduce el entorno de los datos por host, con CC_ENV por encima', () => {
    expect(detectEnv(undefined, 'anillero.com')).toBe('production');
    expect(detectEnv(undefined, 'pre.anillero.com')).toBe('pre');
    expect(detectEnv(undefined, 'copero-nba-pre.anillero-project.workers.dev')).toBe('pre');
    expect(detectEnv(undefined, 'localhost:8788')).toBe('local');
    expect(detectEnv(undefined, 'presupuesto.com')).toBe('production');
    expect(detectEnv('pre', 'anillero.com')).toBe('pre');
    expect(detectEnv('otro', 'pre.anillero.com')).toBe('pre');
  });

  it('T02 solo entran emails verificados de la lista blanca', () => {
    const allowed = ['a@x.com', 'b@x.com'];
    expect(isAllowed({ email: 'A@x.com', emailVerified: true }, allowed)).toBe(true);
    expect(isAllowed({ email: 'a@x.com', emailVerified: false }, allowed)).toBe(false);
    expect(isAllowed({ email: 'c@x.com', emailVerified: true }, allowed)).toBe(false);
    expect(isAllowed(null, allowed)).toBe(false);
    expect(isAllowed({ email: 'a@x.com', emailVerified: true }, [])).toBe(false);
  });

  it('T03 el progreso del hito se pondera por el peso de las tareas hechas', () => {
    expect(milestoneProgress([])).toBe(0);
    expect(milestoneProgress([{ status: 'done', weight: 3 }, { status: 'todo', weight: 1 }])).toBe(75);
    expect(milestoneProgress([{ status: 'review', weight: 5 }, { status: 'done', weight: 0 }])).toBe(0);
    expect(milestoneProgress([{ status: 'done', weight: 1 }, { status: 'done', weight: 1 }])).toBe(100);
  });

  it('T04 valida los campos y no deja escribir env, id ni autor', () => {
    expect(validate('tasks', { priority: 'P1' }, false)).toEqual({ ok: false, error: 'title: obligatorio' });
    expect(validate('tasks', { title: 'x', status: 'hecho' }, false).ok).toBe(false);
    expect(validate('tasks', { title: 'x', due_date: '21/11/2026' }, false).ok).toBe(false);
    expect(validate('tasks', { title: 'x', weight: 1.5 }, false).ok).toBe(false);
    const r = validate('tasks', { title: ' Tarea ', env: 'production', id: 'z', created_by: 'evil@x.com', assignee: 'A@X.com' }, false);
    expect(r).toEqual({ ok: true, data: { title: 'Tarea', assignee: 'a@x.com' } });
    expect(validate('tasks', {}, true).ok).toBe(false);
    expect(validate('notes', { title: 'n', pinned: 1 }, false).ok).toBe(true);
  });

  it('T05 la auditoría trae qué hacer, cuándo está hecho y de dónde sale; nada hecho ni asignado', () => {
    const cats = DEFAULT_CATEGORIES.map(([n]) => n);
    const refs = SEED_TASKS.map((t) => t.ref);
    expect(new Set(refs).size).toBe(refs.length);
    expect(SEED_TASKS.length).toBeGreaterThanOrEqual(20);
    for (const t of SEED_TASKS) {
      expect(t.status).toBe('todo');
      expect(t).not.toHaveProperty('assignee');
      expect(t.description.length, t.ref).toBeGreaterThan(30);
      expect(t.done_criteria.length, t.ref).toBeGreaterThan(10);
      expect(t.evidence.length, t.ref).toBeGreaterThan(10);
      expect(cats).toContain(t.category);
      expect(validate('tasks', { title: t.title, description: t.description, evidence: t.evidence, done_criteria: t.done_criteria, priority: t.priority, status: t.status }, false).ok).toBe(true);
    }
  });

  it('T06 el tablero agrupa en 3 columnas y filtra por persona y texto', () => {
    const tasks = [
      { id: '1', title: 'Canonical', description: '', status: 'backlog', priority: 'P2', sort: 0, assignee: null },
      { id: '2', title: 'CI', description: 'GitHub Actions', status: 'review', priority: 'P1', sort: 0, assignee: 'a@x.com' },
      { id: '3', title: 'OG', description: '', status: 'todo', priority: 'P0', sort: 0, assignee: 'b@x.com' },
    ];
    const statuses = COLUMNS.flatMap((c) => [...c.statuses]);
    for (const s of ['backlog', 'todo', 'doing', 'review', 'done']) expect(statuses.filter((x) => x === s).length, s).toBe(1);
    expect(visibleTasks(tasks, '', '').map((t) => t.id)).toEqual(['3', '2', '1']);
    expect(visibleTasks(tasks, '__none', '').map((t) => t.id)).toEqual(['1']);
    expect(visibleTasks(tasks, 'a@x.com', '').map((t) => t.id)).toEqual(['2']);
    expect(visibleTasks(tasks, '', 'github').map((t) => t.id)).toEqual(['2']);
  });
});
