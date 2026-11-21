// Control Center: página privada /control-center y API /api/cc/*.
// Acceso: sesión de Better Auth + email verificado + email en CC_ALLOWED_EMAILS.
// Datos: D1 (tablas cc_*), siempre filtrados por el entorno de la petición.
import type { Hono, Context } from 'hono';
import type { Env } from '../types';
import type { createAuth } from '../auth';
import { DEFAULT_CATEGORIES, ENTITIES, detectEnv, isAllowed, milestoneProgress, parseAllowed, validate, type EntityKind } from './logic';
import { SEED_TASKS } from './seed';

type CcUser = { email: string; name?: string; emailVerified: boolean };
type Ctx = Context<{ Bindings: Env; Variables: any }>;

const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'private, no-store' };
const now = () => Date.now();
const id = () => crypto.randomUUID();

function envOf(c: Ctx) {
  return detectEnv(c.env.CC_ENV, new URL(c.req.url).host);
}

async function log(c: Ctx, action: string, type: string, entityId: string, summary: string) {
  await c.env.DB.prepare('INSERT INTO cc_activity (id, env, actor, action, entity_type, entity_id, summary, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id(), envOf(c), (c.get('user') as CcUser).email, action, type, entityId, summary.slice(0, 300), now()).run();
}

async function ensureCategories(db: D1Database, env: string) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cc_categories WHERE env = ?').bind(env).first<{ n: number }>();
  if (row && row.n > 0) return;
  await db.batch(DEFAULT_CATEGORIES.map(([name, color], i) =>
    db.prepare('INSERT OR IGNORE INTO cc_categories (id, env, name, color, sort, created_at) VALUES (?,?,?,?,?,?)').bind(id(), env, name, color, i, now())));
}

/** Tareas privadas: solo las ve quien las creó. */
const VISIBLE = "(visibility = 'shared' OR created_by = ?)";

async function readJson(c: Ctx): Promise<unknown> {
  try { return await c.req.json(); } catch { return undefined; }
}

export function mountControlCenter(app: Hono<any>, getAuth: (env: Env) => ReturnType<typeof createAuth>) {
  // Página: sin sesión → login; sesión sin permiso → 404 (no revela que existe).
  const page = async (c: Ctx) => {
    let user: CcUser | null = null;
    try {
      const s = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers });
      user = (s?.user as CcUser) ?? null;
    } catch (err) { console.error('cc session', err); }
    if (!user) return c.redirect('/auth/login', 302);
    if (!isAllowed(user, parseAllowed(c.env.CC_ALLOWED_EMAILS))) return c.text('Not found', 404, NOINDEX);
    const res = await c.env.ASSETS.fetch(new URL('/control-center', c.req.url));
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(NOINDEX)) out.headers.set(k, v);
    return out;
  };
  app.get('/control-center', page);
  app.get('/control-center.html', page);

  app.use('/api/cc/*', async (c: Ctx, next) => {
    const user = c.get('user') as CcUser | null;
    if (!user) return c.json({ error: 'No autorizado' }, 401, NOINDEX);
    if (!isAllowed(user, parseAllowed(c.env.CC_ALLOWED_EMAILS))) return c.json({ error: 'Sin acceso' }, 403, NOINDEX);
    await ensureCategories(c.env.DB, envOf(c));
    await next();
    for (const [k, v] of Object.entries(NOINDEX)) c.res.headers.set(k, v);
  });

  app.get('/api/cc/me', async (c: Ctx) => {
    const u = c.get('user') as CcUser;
    const members = parseAllowed(c.env.CC_ALLOWED_EMAILS);
    const rows = members.length
      ? (await c.env.DB.prepare(`SELECT email, name FROM user WHERE lower(email) IN (${members.map(() => '?').join(',')})`).bind(...members).all<{ email: string; name: string }>()).results
      : [];
    // Nombre de pila de cada miembro (de su cuenta); sin cuenta, la parte local del email.
    const names = Object.fromEntries(members.map((m) => [m, (rows.find((r) => r.email.toLowerCase() === m)?.name || m.split('@')[0]).split(' ')[0]]));
    return c.json({ user: { email: u.email, name: u.name ?? u.email }, env: envOf(c), members, names });
  });

  app.get('/api/cc/dashboard', async (c: Ctx) => {
    const env = envOf(c), me = (c.get('user') as CcUser).email;
    const db = c.env.DB;
    const [byStatus, byPriority, mine, overdue, incidents, activity] = await db.batch([
      db.prepare(`SELECT status, COUNT(*) AS n FROM cc_tasks WHERE env = ? AND ${VISIBLE} GROUP BY status`).bind(env, me),
      db.prepare(`SELECT priority, COUNT(*) AS n FROM cc_tasks WHERE env = ? AND status != 'done' AND ${VISIBLE} GROUP BY priority`).bind(env, me),
      db.prepare(`SELECT COUNT(*) AS n FROM cc_tasks WHERE env = ? AND assignee = ? AND status != 'done'`).bind(env, me),
      db.prepare(`SELECT COUNT(*) AS n FROM cc_tasks WHERE env = ? AND status != 'done' AND due_date < ? AND ${VISIBLE}`).bind(env, new Date().toISOString().slice(0, 10), me),
      db.prepare(`SELECT status, COUNT(*) AS n FROM cc_incidents WHERE env = ? GROUP BY status`).bind(env),
      db.prepare('SELECT * FROM cc_activity WHERE env = ? ORDER BY created_at DESC LIMIT 15').bind(env),
    ]);
    return c.json({
      byStatus: byStatus.results, byPriority: byPriority.results,
      mine: (mine.results[0] as { n: number }).n, overdue: (overdue.results[0] as { n: number }).n,
      incidents: incidents.results, activity: activity.results,
    });
  });

  app.get('/api/cc/search', async (c: Ctx) => {
    const q = (c.req.query('q') ?? '').trim();
    if (q.length < 2) return c.json({ results: [] });
    const env = envOf(c), me = (c.get('user') as CcUser).email, like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    const results: unknown[] = [];
    for (const kind of ['tasks', 'incidents', 'milestones', 'decisions', 'notes'] as const) {
      const def = ENTITIES[kind];
      const where = def.search.map((f) => `${f} LIKE ? ESCAPE '\\'`).join(' OR ');
      const extra = kind === 'tasks' ? ` AND ${VISIBLE}` : '';
      const binds = [env, ...def.search.map(() => like), ...(kind === 'tasks' ? [me] : [])];
      const r = await c.env.DB.prepare(`SELECT id, title FROM ${def.table} WHERE env = ? AND (${where})${extra} LIMIT 20`).bind(...binds).all();
      for (const row of r.results) results.push({ kind, ...row });
    }
    return c.json({ results });
  });

  // Filtros guardados: cada uno es de su propietario.
  app.get('/api/cc/filters', async (c: Ctx) => {
    const r = await c.env.DB.prepare('SELECT * FROM cc_saved_filters WHERE env = ? AND owner = ? ORDER BY created_at').bind(envOf(c), (c.get('user') as CcUser).email).all();
    return c.json({ items: r.results.map((f: any) => ({ ...f, query: JSON.parse(f.query) })) });
  });
  app.post('/api/cc/filters', async (c: Ctx) => {
    const b = await readJson(c) as { name?: unknown; view?: unknown; query?: unknown } | undefined;
    if (!b || typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80 || typeof b.query !== 'object' || !b.query) return c.json({ error: 'Filtro no válido' }, 400);
    const query = JSON.stringify(b.query);
    if (query.length > 4000) return c.json({ error: 'Filtro demasiado grande' }, 400);
    const row = { id: id(), env: envOf(c), owner: (c.get('user') as CcUser).email, name: b.name.trim(), view: typeof b.view === 'string' ? b.view.slice(0, 20) : 'list', query, created_at: now() };
    await c.env.DB.prepare('INSERT INTO cc_saved_filters (id, env, owner, name, view, query, created_at) VALUES (?,?,?,?,?,?,?)').bind(...Object.values(row)).run();
    return c.json({ item: { ...row, query: b.query } }, 201);
  });
  app.delete('/api/cc/filters/:id', async (c: Ctx) => {
    const r = await c.env.DB.prepare('DELETE FROM cc_saved_filters WHERE id = ? AND env = ? AND owner = ?').bind(c.req.param('id'), envOf(c), (c.get('user') as CcUser).email).run();
    return r.meta.changes ? c.json({ ok: true }) : c.json({ error: 'No encontrado' }, 404);
  });

  // Comentarios sobre cualquier entidad.
  app.get('/api/cc/comments', async (c: Ctx) => {
    const r = await c.env.DB.prepare('SELECT * FROM cc_comments WHERE env = ? AND entity_type = ? AND entity_id = ? ORDER BY created_at')
      .bind(envOf(c), c.req.query('entity_type') ?? '', c.req.query('entity_id') ?? '').all();
    return c.json({ items: r.results });
  });
  app.post('/api/cc/comments', async (c: Ctx) => {
    const b = await readJson(c) as { entity_type?: unknown; entity_id?: unknown; body?: unknown } | undefined;
    if (!b || typeof b.entity_type !== 'string' || !(b.entity_type in ENTITIES) || typeof b.entity_id !== 'string' ||
        typeof b.body !== 'string' || !b.body.trim() || b.body.length > 10000) return c.json({ error: 'Comentario no válido' }, 400);
    const me = (c.get('user') as CcUser).email, env = envOf(c);
    const def = ENTITIES[b.entity_type as EntityKind];
    const target = await c.env.DB.prepare(`SELECT id FROM ${def.table} WHERE id = ? AND env = ?${b.entity_type === 'tasks' ? ` AND ${VISIBLE}` : ''}`)
      .bind(...[b.entity_id, env, ...(b.entity_type === 'tasks' ? [me] : [])]).first();
    if (!target) return c.json({ error: 'No encontrado' }, 404);
    const row = { id: id(), env, entity_type: b.entity_type, entity_id: b.entity_id, body: b.body.trim(), author: me, created_at: now() };
    await c.env.DB.prepare('INSERT INTO cc_comments (id, env, entity_type, entity_id, body, author, created_at) VALUES (?,?,?,?,?,?,?)').bind(...Object.values(row)).run();
    await log(c, 'comentó', b.entity_type, b.entity_id, row.body);
    return c.json({ item: row }, 201);
  });

  app.get('/api/cc/activity', async (c: Ctx) => {
    const r = await c.env.DB.prepare('SELECT * FROM cc_activity WHERE env = ? ORDER BY created_at DESC LIMIT 200').bind(envOf(c)).all();
    return c.json({ items: r.results });
  });

  // Incidencia → tarea, con vínculo en los dos sentidos. Si ya tiene tarea, devuelve esa.
  app.post('/api/cc/incidents/:id/to-task', async (c: Ctx) => {
    const env = envOf(c), me = (c.get('user') as CcUser).email;
    const inc = await c.env.DB.prepare('SELECT * FROM cc_incidents WHERE id = ? AND env = ?').bind(c.req.param('id'), env).first<any>();
    if (!inc) return c.json({ error: 'No encontrada' }, 404);
    if (inc.task_id) {
      const existing = await c.env.DB.prepare('SELECT * FROM cc_tasks WHERE id = ? AND env = ?').bind(inc.task_id, env).first();
      if (existing) return c.json({ item: existing, existing: true });
    }
    const priority = ({ critica: 'P0', alta: 'P1', media: 'P2', baja: 'P3' } as Record<string, string>)[inc.severity] ?? 'P2';
    const task = {
      id: id(), env, title: inc.title, description: inc.description, status: 'todo', priority, category_id: inc.category_id,
      evidence: inc.evidence, source: inc.source || `Incidencia ${inc.title}`, incident_id: inc.id, created_by: me, created_at: now(), updated_at: now(),
    };
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO cc_tasks (${Object.keys(task).join(', ')}) VALUES (${Object.keys(task).map(() => '?').join(', ')})`).bind(...Object.values(task)),
      c.env.DB.prepare("UPDATE cc_incidents SET task_id = ?, status = 'en_tarea', updated_at = ? WHERE id = ?").bind(task.id, now(), inc.id),
    ]);
    await log(c, 'convirtió en tarea', 'incidents', inc.id, inc.title);
    return c.json({ item: task }, 201);
  });

  // Importación inicial desde las auditorías. Idempotente por source_ref.
  app.post('/api/cc/import', async (c: Ctx) => {
    const env = envOf(c), me = (c.get('user') as CcUser).email, db = c.env.DB;
    const cats = await db.prepare('SELECT id, name FROM cc_categories WHERE env = ?').bind(env).all<{ id: string; name: string }>();
    const catId = (name: string) => cats.results.find((x) => x.name === name)?.id ?? null;
    const t2 = SEED_TASKS.map((t, i) => db.prepare(`INSERT OR IGNORE INTO cc_tasks (id, env, title, description, status, priority, category_id, assignee, visibility, weight, evidence, done_criteria, source, source_ref, verified, sort, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,NULL,'shared',?,?,?,?,?,0,?,?,?,?)`)
      .bind(id(), env, t.title, t.description, t.status, t.priority, catId(t.category), t.weight, t.evidence, t.done_criteria, t.source, t.ref, i, me, now(), now()));
    const res = await db.batch(t2);
    const inserted = res.reduce((s, r) => s + (r.meta.changes ?? 0), 0);
    await log(c, 'importó', 'tasks', 'import', `${inserted} tareas de la auditoría`);
    return c.json({ ok: true, inserted, tasks: SEED_TASKS.length });
  });

  // CRUD genérico.
  const kindOf = (c: Ctx): EntityKind | null => { const k = c.req.param('kind'); return k && k in ENTITIES ? (k as EntityKind) : null; };

  app.get('/api/cc/:kind', async (c: Ctx) => {
    const kind = kindOf(c);
    if (!kind) return c.json({ error: 'No encontrado' }, 404);
    const env = envOf(c), me = (c.get('user') as CcUser).email, def = ENTITIES[kind];
    // shortcut: devuelve todo el entorno y filtra el cliente; paginar si pasa de unos miles de filas.
    const order = kind === 'categories' ? 'sort, name' : kind === 'tasks' ? 'sort, created_at' : 'created_at DESC';
    const r = kind === 'tasks'
      ? await c.env.DB.prepare(`SELECT * FROM cc_tasks WHERE env = ? AND ${VISIBLE} ORDER BY ${order}`).bind(env, me).all()
      : await c.env.DB.prepare(`SELECT * FROM ${def.table} WHERE env = ? ORDER BY ${order}`).bind(env).all();
    let items: any[] = r.results;
    if (kind === 'milestones') {
      const tasks = await c.env.DB.prepare(`SELECT milestone_id, status, weight FROM cc_tasks WHERE env = ? AND milestone_id IS NOT NULL AND ${VISIBLE}`).bind(env, me).all<any>();
      items = items.map((m) => {
        const mine = tasks.results.filter((t) => t.milestone_id === m.id);
        return { ...m, progress: milestoneProgress(mine), task_count: mine.length };
      });
    }
    return c.json({ items });
  });

  app.post('/api/cc/:kind', async (c: Ctx) => {
    const kind = kindOf(c);
    if (!kind) return c.json({ error: 'No encontrado' }, 404);
    const v = validate(kind, await readJson(c), false);
    if (!v.ok) return c.json({ error: v.error }, 400);
    const row = { ...v.data, id: id(), env: envOf(c), ...(kind === 'categories' ? {} : { created_by: (c.get('user') as CcUser).email, updated_at: now() }), created_at: now() };
    try {
      await c.env.DB.prepare(`INSERT INTO ${ENTITIES[kind].table} (${Object.keys(row).join(', ')}) VALUES (${Object.keys(row).map(() => '?').join(', ')})`).bind(...Object.values(row)).run();
    } catch (err) {
      return c.json({ error: String(err).includes('UNIQUE') ? 'Ya existe' : 'No se pudo guardar' }, 409);
    }
    await log(c, 'creó', kind, row.id, String(v.data.title ?? v.data.name ?? ''));
    const item = await c.env.DB.prepare(`SELECT * FROM ${ENTITIES[kind].table} WHERE id = ?`).bind(row.id).first();
    return c.json({ item }, 201);
  });

  app.patch('/api/cc/:kind/:id', async (c: Ctx) => {
    const kind = kindOf(c);
    if (!kind) return c.json({ error: 'No encontrado' }, 404);
    const v = validate(kind, await readJson(c), true);
    if (!v.ok) return c.json({ error: v.error }, 400);
    const env = envOf(c), me = (c.get('user') as CcUser).email, table = ENTITIES[kind].table, rowId = c.req.param('id') ?? '';
    const vis = kind === 'tasks' ? ` AND ${VISIBLE}` : '';
    const data = kind === 'categories' ? v.data : { ...v.data, updated_at: now() };
    const r = await c.env.DB.prepare(`UPDATE ${table} SET ${Object.keys(data).map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND env = ?${vis}`)
      .bind(...Object.values(data), rowId, env, ...(kind === 'tasks' ? [me] : [])).run().catch((err) => ({ meta: { changes: -1 }, err }));
    if (r.meta.changes === -1) return c.json({ error: 'No se pudo guardar' }, 409);
    if (!r.meta.changes) return c.json({ error: 'No encontrado' }, 404);
    const item = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(rowId).first<any>();
    await log(c, v.data.status ? `cambió estado a ${v.data.status}` : 'editó', kind, rowId, String(item?.title ?? item?.name ?? ''));
    return c.json({ item });
  });

  app.delete('/api/cc/:kind/:id', async (c: Ctx) => {
    const kind = kindOf(c);
    if (!kind) return c.json({ error: 'No encontrado' }, 404);
    const env = envOf(c), me = (c.get('user') as CcUser).email, table = ENTITIES[kind].table, rowId = c.req.param('id') ?? '';
    const vis = kind === 'tasks' ? ` AND ${VISIBLE}` : '';
    const item = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND env = ?${vis}`).bind(...[rowId, env, ...(kind === 'tasks' ? [me] : [])]).first<any>();
    if (!item) return c.json({ error: 'No encontrado' }, 404);
    const extra: D1PreparedStatement[] = [c.env.DB.prepare('DELETE FROM cc_comments WHERE env = ? AND entity_type = ? AND entity_id = ?').bind(env, kind, rowId)];
    if (kind === 'tasks') extra.push(c.env.DB.prepare("UPDATE cc_incidents SET task_id = NULL, status = 'abierta' WHERE task_id = ? AND env = ?").bind(rowId, env));
    if (kind === 'incidents') extra.push(c.env.DB.prepare('UPDATE cc_tasks SET incident_id = NULL WHERE incident_id = ? AND env = ?').bind(rowId, env));
    if (kind === 'milestones') extra.push(c.env.DB.prepare('UPDATE cc_tasks SET milestone_id = NULL WHERE milestone_id = ? AND env = ?').bind(rowId, env));
    if (kind === 'categories') {
      extra.push(c.env.DB.prepare('UPDATE cc_tasks SET category_id = NULL WHERE category_id = ? AND env = ?').bind(rowId, env));
      extra.push(c.env.DB.prepare('UPDATE cc_incidents SET category_id = NULL WHERE category_id = ? AND env = ?').bind(rowId, env));
    }
    await c.env.DB.batch([...extra, c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND env = ?`).bind(rowId, env)]);
    await log(c, 'borró', kind, rowId, String(item.title ?? item.name ?? ''));
    return c.json({ ok: true });
  });
}
