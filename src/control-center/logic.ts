// Control Center: reglas puras (sin D1 ni red), compartidas por la API y los tests.

export type CcEnv = 'production' | 'pre' | 'local';

export const TASK_STATUS = ['backlog', 'todo', 'doing', 'review', 'done'] as const;
export const PRIORITY = ['P0', 'P1', 'P2', 'P3'] as const;
export const SEVERITY = ['critica', 'alta', 'media', 'baja'] as const;
export const INCIDENT_STATUS = ['abierta', 'en_tarea', 'resuelta', 'descartada'] as const;
export const DECISION_STATUS = ['propuesta', 'aceptada', 'descartada'] as const;
export const MILESTONE_STATUS = ['abierto', 'cerrado'] as const;
export const VISIBILITY = ['shared', 'private'] as const;

export const DEFAULT_CATEGORIES: [string, string][] = [
  ['Desarrollo', '#2563eb'],
  ['Diseño/UX', '#db2777'],
  ['SEO', '#16a34a'],
  ['Rendimiento', '#ea580c'],
  ['Seguridad/infra', '#dc2626'],
  ['Marketing', '#9333ea'],
  ['Administración', '#64748b'],
];

/** Entorno de los datos. CC_ENV manda; si falta, se deduce del host de la petición. */
export function detectEnv(override: string | undefined, host: string): CcEnv {
  if (override === 'production' || override === 'pre' || override === 'local') return override;
  const h = host.toLowerCase().split(':')[0];
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost')) return 'local';
  if (/(^|[.-])pre[.-]/.test(h)) return 'pre';
  return 'production';
}

/** Lista blanca de emails (variable CC_ALLOWED_EMAILS, separada por comas). Vacía = nadie entra. */
export function parseAllowed(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAllowed(user: { email: string; emailVerified: boolean } | null, allowed: string[]): boolean {
  return !!user && user.emailVerified && allowed.includes(user.email.toLowerCase());
}

/** Progreso de un hito: solo cuentan las tareas terminadas, ponderadas por su peso. */
export function milestoneProgress(tasks: { status: string; weight: number }[]): number {
  const total = tasks.reduce((s, t) => s + Math.max(0, t.weight), 0);
  if (!total) return 0;
  const done = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + Math.max(0, t.weight), 0);
  return Math.round((done / total) * 100);
}

type Field = { type: 'text'; max: number; required?: boolean } | { type: 'enum'; values: readonly string[] }
  | { type: 'int'; min: number; max: number } | { type: 'date' } | { type: 'ref' } | { type: 'email' } | { type: 'num' };

const t = (max: number, required = false): Field => ({ type: 'text', max, required });
const e = (values: readonly string[]): Field => ({ type: 'enum', values });

/** Campos editables por tipo de entidad. Lo que no está aquí no se puede escribir desde la API. */
export const ENTITIES = {
  tasks: {
    table: 'cc_tasks',
    fields: {
      title: t(200, true), description: t(20000), status: e(TASK_STATUS), priority: e(PRIORITY),
      category_id: { type: 'ref' }, assignee: { type: 'email' }, suggested_assignee: t(200),
      visibility: e(VISIBILITY), due_date: { type: 'date' }, milestone_id: { type: 'ref' },
      weight: { type: 'int', min: 0, max: 100 }, evidence: t(20000), done_criteria: t(20000),
      source: t(500), verified: { type: 'int', min: 0, max: 1 }, sort: { type: 'num' },
    },
    search: ['title', 'description', 'evidence'],
  },
  incidents: {
    table: 'cc_incidents',
    fields: {
      title: t(200, true), description: t(20000), severity: e(SEVERITY), status: e(INCIDENT_STATUS),
      category_id: { type: 'ref' }, evidence: t(20000), source: t(500),
    },
    search: ['title', 'description', 'evidence'],
  },
  milestones: {
    table: 'cc_milestones',
    fields: { title: t(200, true), description: t(20000), due_date: { type: 'date' }, status: e(MILESTONE_STATUS) },
    search: ['title', 'description'],
  },
  decisions: {
    table: 'cc_decisions',
    fields: { title: t(200, true), context: t(20000), decision: t(20000), status: e(DECISION_STATUS), decided_at: { type: 'date' } },
    search: ['title', 'context', 'decision'],
  },
  notes: {
    table: 'cc_notes',
    fields: { title: t(200, true), body: t(50000), pinned: { type: 'int', min: 0, max: 1 } },
    search: ['title', 'body'],
  },
  categories: {
    table: 'cc_categories',
    fields: { name: t(60, true), color: t(20), sort: { type: 'int', min: 0, max: 1000 } },
    search: ['name'],
  },
} as const satisfies Record<string, { table: string; fields: Record<string, Field>; search: readonly string[] }>;

export type EntityKind = keyof typeof ENTITIES;

/** Valida un cuerpo de creación (partial=false) o edición (partial=true). Devuelve los campos limpios o un error. */
export function validate(kind: EntityKind, body: unknown, partial: boolean): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Cuerpo no válido' };
  const fields = ENTITIES[kind].fields as Record<string, Field>;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    const f = fields[k];
    if (!f) continue; // campos desconocidos (id, env, created_by…) se ignoran
    if (v === null && f.type !== 'enum' && !(f.type === 'text' && f.required)) { data[k] = null; continue; }
    switch (f.type) {
      case 'text':
        if (typeof v !== 'string' || v.length > f.max) return { ok: false, error: `${k}: texto no válido` };
        if (f.required && !v.trim()) return { ok: false, error: `${k}: obligatorio` };
        data[k] = f.required ? v.trim() : v;
        break;
      case 'enum':
        if (typeof v !== 'string' || !f.values.includes(v)) return { ok: false, error: `${k}: valor no válido` };
        data[k] = v;
        break;
      case 'int':
        if (typeof v !== 'number' || !Number.isInteger(v) || v < f.min || v > f.max) return { ok: false, error: `${k}: número no válido` };
        data[k] = v;
        break;
      case 'num':
        if (typeof v !== 'number' || !Number.isFinite(v)) return { ok: false, error: `${k}: número no válido` };
        data[k] = v;
        break;
      case 'date':
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return { ok: false, error: `${k}: fecha AAAA-MM-DD` };
        data[k] = v;
        break;
      case 'ref':
        if (typeof v !== 'string' || !/^[\w-]{1,64}$/.test(v)) return { ok: false, error: `${k}: referencia no válida` };
        data[k] = v;
        break;
      case 'email':
        if (typeof v !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(v)) return { ok: false, error: `${k}: email no válido` };
        data[k] = v.toLowerCase();
        break;
    }
  }
  if (!partial) {
    for (const [k, f] of Object.entries(fields)) {
      if (f.type === 'text' && f.required && data[k] == null) return { ok: false, error: `${k}: obligatorio` };
    }
  }
  if (partial && !Object.keys(data).length) return { ok: false, error: 'Nada que actualizar' };
  return { ok: true, data };
}
