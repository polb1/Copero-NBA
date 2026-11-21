// Control Center: pruebas T07–T20 contra el Worker real con D1 local.
// Requisitos: `npm run build`, migraciones locales aplicadas, .dev.vars con
// CC_ALLOWED_EMAILS=cc-a@test.localhost,cc-b@test.localhost y `npm run worker:dev` en marcha.
// Ejecutar: npm run test:cc   (CC_BASE cambia la URL; por defecto http://localhost:8788)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.CC_BASE ?? 'http://localhost:8788';
const PASS = 'cc-test-Password-123';
const RUN = Date.now().toString(36);
const users = { a: 'cc-a@test.localhost', b: 'cc-b@test.localhost', x: 'cc-x@test.localhost' };
const jar = {};

function d1(sql) {
    // SQL entre comillas dobles: funciona igual en cmd.exe y en sh (las sentencias solo usan comillas simples).
  const out = execSync(`npx wrangler d1 execute anillero --local --json --command "${sql}"`, { encoding: 'utf8' });
  return JSON.parse(out)[0].results;
}

async function req(who, path, { method = 'GET', body, redirect = 'manual' } = {}) {
  const headers = { Origin: BASE };
  if (who && jar[who]) headers.Cookie = jar[who];
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, headers: res.headers, json, text };
}

before(async () => {
  for (const [k, email] of Object.entries(users)) {
    await req(null, '/api/auth/sign-up/email', { method: 'POST', body: { email, password: PASS, name: `Test ${k}` } });
  }
  d1("UPDATE user SET email_verified = 1 WHERE email LIKE 'cc-%@test.localhost'");
  for (const [k, email] of Object.entries(users)) {
    const res = await fetch(`${BASE}/api/auth/sign-in/email`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ email, password: PASS }) });
    assert.equal(res.status, 200, `login ${email}: ${await res.text()}`);
    jar[k] = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
});

test('T07 la API sin sesión responde 401 con noindex', async () => {
  const r = await req(null, '/api/cc/me');
  assert.equal(r.status, 401);
  assert.match(r.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.equal((await req(null, '/api/cc/tasks')).status, 401);
});

test('T08 la página sin sesión redirige al login', async () => {
  const r = await req(null, '/control-center');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/auth/login');
  assert.equal((await req(null, '/control-center.html')).status, 302);
});

test('T09 una cuenta fuera de la lista: API 403 y página 404', async () => {
  assert.equal((await req('x', '/api/cc/me')).status, 403);
  assert.equal((await req('x', '/api/cc/tasks', { method: 'POST', body: { title: 'intruso' } })).status, 403);
  const page = await req('x', '/control-center');
  assert.equal(page.status, 404);
  assert.doesNotMatch(page.text, /Control Center/);
});

test('T10 un miembro ve la página con noindex y las 7 categorías por defecto', async () => {
  const page = await req('a', '/control-center');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.match(page.text, /<meta name="robots" content="noindex/);
  const me = await req('a', '/api/cc/me');
  assert.equal(me.json.env, 'local');
  const cats = (await req('a', '/api/cc/categories')).json.items.map((c) => c.name);
  for (const n of ['Desarrollo', 'Diseño/UX', 'SEO', 'Rendimiento', 'Seguridad/infra', 'Marketing', 'Administración']) assert.ok(cats.includes(n), n);
});

test('T11 crear, leer, editar y borrar una tarea; datos no válidos dan 400', async () => {
  assert.equal((await req('a', '/api/cc/tasks', { method: 'POST', body: { title: '' } })).status, 400);
  assert.equal((await req('a', '/api/cc/tasks', { method: 'POST', body: { title: 'x', priority: 'P9' } })).status, 400);
  const c = await req('a', '/api/cc/tasks', { method: 'POST', body: { title: `T11 ${RUN}`, priority: 'P1', due_date: '2026-12-01', env: 'production' } });
  assert.equal(c.status, 201);
  assert.equal(c.json.item.env, 'local');
  assert.equal(c.json.item.created_by, users.a);
  const id = c.json.item.id;
  const e = await req('b', `/api/cc/tasks/${id}`, { method: 'PATCH', body: { assignee: users.b, description: 'editada por B' } });
  assert.equal(e.json.item.assignee, users.b);
  assert.ok((await req('b', '/api/cc/tasks')).json.items.some((t) => t.id === id && t.description === 'editada por B'));
  assert.equal((await req('a', `/api/cc/tasks/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await req('a', `/api/cc/tasks/${id}`, { method: 'PATCH', body: { title: 'y' } })).status, 404);
});

test('T12 mover una tarjeta en el Kanban cambia el estado y queda en la actividad', async () => {
  const id = (await req('a', '/api/cc/tasks', { method: 'POST', body: { title: `T12 ${RUN}` } })).json.item.id;
  const m = await req('a', `/api/cc/tasks/${id}`, { method: 'PATCH', body: { status: 'doing', sort: 99 } });
  assert.equal(m.json.item.status, 'doing');
  const act = (await req('b', '/api/cc/activity')).json.items;
  assert.ok(act.some((x) => x.entity_id === id && x.action === 'cambió estado a doing' && x.actor === users.a));
});

test('T13 una tarea privada solo la ve quien la creó', async () => {
  const id = (await req('a', '/api/cc/tasks', { method: 'POST', body: { title: `T13 privada ${RUN}`, visibility: 'private' } })).json.item.id;
  assert.ok((await req('a', '/api/cc/tasks')).json.items.some((t) => t.id === id));
  assert.ok(!(await req('b', '/api/cc/tasks')).json.items.some((t) => t.id === id));
  assert.equal((await req('b', `/api/cc/tasks/${id}`, { method: 'PATCH', body: { title: 'robada' } })).status, 404);
  assert.equal((await req('b', `/api/cc/tasks/${id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await req('b', '/api/cc/comments', { method: 'POST', body: { entity_type: 'tasks', entity_id: id, body: 'hola' } })).status, 404);
  assert.equal((await req('b', `/api/cc/search?q=${encodeURIComponent(`T13 privada ${RUN}`)}`)).json.results.length, 0);
});

test('T14 una incidencia se convierte en tarea con un clic y conserva el vínculo', async () => {
  const inc = (await req('a', '/api/cc/incidents', { method: 'POST', body: { title: `T14 ${RUN}`, severity: 'critica', evidence: 'curl → 500' } })).json.item;
  const r = await req('b', `/api/cc/incidents/${inc.id}/to-task`, { method: 'POST' });
  assert.equal(r.status, 201);
  assert.equal(r.json.item.incident_id, inc.id);
  assert.equal(r.json.item.priority, 'P0');
  assert.equal(r.json.item.evidence, 'curl → 500');
  const after = (await req('a', '/api/cc/incidents')).json.items.find((i) => i.id === inc.id);
  assert.equal(after.task_id, r.json.item.id);
  assert.equal(after.status, 'en_tarea');
  const again = await req('a', `/api/cc/incidents/${inc.id}/to-task`, { method: 'POST' });
  assert.equal(again.json.existing, true);
  assert.equal(again.json.item.id, r.json.item.id);
});

test('T15 el progreso del hito se calcula con los pesos de sus tareas', async () => {
  const ms = (await req('a', '/api/cc/milestones', { method: 'POST', body: { title: `T15 ${RUN}` } })).json.item;
  for (const [weight, status] of [[3, 'done'], [1, 'todo'], [4, 'doing']]) {
    await req('a', '/api/cc/tasks', { method: 'POST', body: { title: `T15 w${weight} ${RUN}`, milestone_id: ms.id, weight, status } });
  }
  const got = (await req('b', '/api/cc/milestones')).json.items.find((m) => m.id === ms.id);
  assert.equal(got.task_count, 3);
  assert.equal(got.progress, 38); // 3 / 8
});

test('T16 el buscador global encuentra tareas, incidencias y notas', async () => {
  const word = `zq${RUN}`;
  await req('a', '/api/cc/tasks', { method: 'POST', body: { title: `Tarea ${word}` } });
  await req('a', '/api/cc/incidents', { method: 'POST', body: { title: 'Incidencia', description: `con ${word}` } });
  await req('a', '/api/cc/notes', { method: 'POST', body: { title: 'Nota', body: `texto ${word}` } });
  const kinds = (await req('b', `/api/cc/search?q=${word}`)).json.results.map((r) => r.kind).sort();
  assert.deepEqual(kinds, ['incidents', 'notes', 'tasks']);
  assert.equal((await req('b', '/api/cc/search?q=%25')).json.results.length, 0);
});

test('T17 los filtros guardados son de cada persona', async () => {
  const f = await req('a', '/api/cc/filters', { method: 'POST', body: { name: `P0 abiertas ${RUN}`, view: 'kanban', query: { priority: 'P0' } } });
  assert.equal(f.status, 201);
  assert.ok((await req('a', '/api/cc/filters')).json.items.some((x) => x.id === f.json.item.id && x.query.priority === 'P0'));
  assert.ok(!(await req('b', '/api/cc/filters')).json.items.some((x) => x.id === f.json.item.id));
  assert.equal((await req('b', `/api/cc/filters/${f.json.item.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await req('a', `/api/cc/filters/${f.json.item.id}`, { method: 'DELETE' })).status, 200);
});

test('T18 comentarios en tareas y categorías editables', async () => {
  const id = (await req('a', '/api/cc/tasks', { method: 'POST', body: { title: `T18 ${RUN}` } })).json.item.id;
  assert.equal((await req('b', '/api/cc/comments', { method: 'POST', body: { entity_type: 'tasks', entity_id: id, body: 'Revisado' } })).status, 201);
  const cs = (await req('a', `/api/cc/comments?entity_type=tasks&entity_id=${id}`)).json.items;
  assert.equal(cs.length, 1);
  assert.equal(cs[0].author, users.b);
  const cat = (await req('a', '/api/cc/categories', { method: 'POST', body: { name: `Cat ${RUN}` } })).json.item;
  const ren = await req('b', `/api/cc/categories/${cat.id}`, { method: 'PATCH', body: { name: `Cat2 ${RUN}`, color: '#000000' } });
  assert.equal(ren.json.item.name, `Cat2 ${RUN}`);
  assert.equal((await req('a', '/api/cc/categories', { method: 'POST', body: { name: `Cat2 ${RUN}` } })).status, 409);
  assert.equal((await req('a', `/api/cc/categories/${cat.id}`, { method: 'DELETE' })).status, 200);
});

test('T19 los datos de otro entorno no se ven ni se pueden tocar', async () => {
  const id = `pre-${RUN}`;
  d1(`INSERT INTO cc_tasks (id, env, title, created_by, created_at, updated_at) VALUES ('${id}', 'pre', 'Solo en pre ${RUN}', '${users.a}', 0, 0)`);
  assert.ok(!(await req('a', '/api/cc/tasks')).json.items.some((t) => t.id === id));
  assert.equal((await req('a', `/api/cc/tasks/${id}`, { method: 'PATCH', body: { title: 'x' } })).status, 404);
  assert.equal((await req('a', `/api/cc/search?q=${encodeURIComponent(`Solo en pre ${RUN}`)}`)).json.results.length, 0);
  assert.equal(d1(`SELECT title FROM cc_tasks WHERE id = '${id}'`)[0].title, `Solo en pre ${RUN}`);
  d1(`DELETE FROM cc_tasks WHERE id = '${id}'`);
});

test('T20 importación idempotente sin tareas hechas y panel fuera del sitemap y de los enlaces públicos', async () => {
  const first = await req('a', '/api/cc/import', { method: 'POST' });
  assert.equal(first.status, 200);
  const second = await req('a', '/api/cc/import', { method: 'POST' });
  assert.equal(second.json.inserted, 0);
  const tasks = (await req('a', '/api/cc/tasks')).json.items.filter((t) => t.source_ref);
  assert.equal(tasks.length, first.json.tasks);
  for (const t of tasks) {
    assert.notEqual(t.status, 'done', t.source_ref);
    assert.equal(t.verified, 0);
    assert.equal(t.assignee, null);
    assert.ok(t.evidence && t.done_criteria, t.source_ref);
  }
  assert.equal(d1("SELECT COUNT(*) AS n FROM cc_incidents WHERE env = 'local' AND source_ref IS NOT NULL")[0].n, first.json.incidents);

  assert.ok(existsSync('dist/sitemap.xml'), 'falta dist/: ejecuta npm run build');
  assert.doesNotMatch(readFileSync('dist/sitemap.xml', 'utf8'), /control-center/);
  assert.doesNotMatch(readFileSync('dist/robots.txt', 'utf8'), /control-center/); // ni siquiera se anuncia
  assert.doesNotMatch(readFileSync('dist/control-center.html', 'utf8'), /cloudflareinsights/); // sin analítica en el panel
  const offenders = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html') && e.name !== 'control-center.html' && /control-center/.test(readFileSync(p, 'utf8'))) offenders.push(p);
    }
  };
  walk('dist');
  assert.deepEqual(offenders, []);
  const pub = await req(null, '/');
  assert.doesNotMatch(pub.text, /control-center/);
});
