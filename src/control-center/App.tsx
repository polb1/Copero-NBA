import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRIORITY, TASK_STATUS, SEVERITY, INCIDENT_STATUS, DECISION_STATUS } from './logic';

type Row = Record<string, any>;
type Me = { user: { email: string; name: string }; env: string; members: string[] };
type Filters = { q: string; status: string; priority: string; category_id: string; assignee: string; milestone_id: string };

const STATUS_LABEL: Record<string, string> = { backlog: 'Backlog', todo: 'Por hacer', doing: 'En curso', review: 'En revisión', done: 'Hecho' };
const NO_FILTERS: Filters = { q: '', status: '', priority: '', category_id: '', assignee: '', milestone_id: '' };
const VIEWS: [string, string][] = [
  ['dashboard', 'Dashboard'], ['mine', 'Mi trabajo'], ['shared', 'Trabajo compartido'], ['kanban', 'Kanban'], ['list', 'Lista'],
  ['calendar', 'Calendario'], ['people', 'Por persona'], ['priorities', 'Por prioridad'], ['incidents', 'Incidencias'],
  ['milestones', 'Hitos'], ['decisions', 'Decisiones'], ['notes', 'Notas'], ['activity', 'Actividad'], ['categories', 'Categorías'],
];

async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/cc/${path}`, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data;
}

const viewFromHash = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
const who = (email?: string | null) => (email ? email.split('@')[0] : 'Sin asignar');

export function applyFilters(tasks: Row[], f: Filters): Row[] {
  const q = f.q.trim().toLowerCase();
  return tasks.filter((t) =>
    (!q || `${t.title} ${t.description} ${t.evidence}`.toLowerCase().includes(q)) &&
    (!f.status || t.status === f.status) && (!f.priority || t.priority === f.priority) &&
    (!f.category_id || t.category_id === f.category_id) && (!f.milestone_id || t.milestone_id === f.milestone_id) &&
    (!f.assignee || (f.assignee === '__none' ? !t.assignee : t.assignee === f.assignee)));
}

export function ControlCenter() {
  const [me, setMe] = useState<Me | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [view, setView] = useState(viewFromHash());
  const [tasks, setTasks] = useState<Row[]>([]);
  const [cats, setCats] = useState<Row[]>([]);
  const [milestones, setMilestones] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [open, setOpen] = useState<Row | null>(null);
  const [toast, setToast] = useState('');

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const reload = useCallback(async () => {
    const [t, c, m, i] = await Promise.all([api('tasks'), api('categories'), api('milestones'), api('incidents')]);
    setTasks(t.items); setCats(c.items); setMilestones(m.items); setIncidents(i.items);
  }, []);

  useEffect(() => {
    api<Me>('me').then((m) => { setMe(m); return reload(); }).catch((e) => setFatal(e.status === 401 ? 'login' : e.status === 403 ? 'Tu cuenta no tiene acceso al Control Center.' : e.message));
    const onHash = () => setView(viewFromHash());
    // Al volver a la pestaña se recargan los datos: así se ven los cambios de la otra persona.
    const onFocus = () => { reload().catch(() => {}); };
    addEventListener('hashchange', onHash);
    addEventListener('focus', onFocus);
    return () => { removeEventListener('hashchange', onHash); removeEventListener('focus', onFocus); };
  }, [reload]);

  const saveTask = async (id: string | null, patch: Row) => {
    try {
      const r = id ? await api(`tasks/${id}`, 'PATCH', patch) : await api('tasks', 'POST', patch);
      await reload();
      return r.item as Row;
    } catch (e) { say((e as Error).message); return null; }
  };

  if (fatal === 'login') return <div className="cc-center"><p>Necesitas iniciar sesión.</p><a className="cc-btn" href="/auth/login">Iniciar sesión</a></div>;
  if (fatal) return <div className="cc-center"><p>{fatal}</p></div>;
  if (!me) return <div className="cc-center"><p>Cargando…</p></div>;

  const catName = (id: string | null) => cats.find((c) => c.id === id);
  const filtered = applyFilters(tasks, filters);
  const ctx = { me, tasks, filtered, cats, milestones, incidents, catName, openTask: setOpen, saveTask, reload, say };
  const taskViews = ['mine', 'shared', 'kanban', 'list', 'calendar', 'people', 'priorities'];

  return (
    <div className="cc">
      <aside className="cc-side">
        <div className="cc-brand"><strong>ANILLERO</strong> CONTROL CENTER<small>Your project. Your team. Your progress.</small></div>
        <nav>{VIEWS.map(([k, label]) => <a key={k} href={`#/${k}`} className={view === k ? 'on' : ''} aria-current={view === k ? 'page' : undefined}>{label}</a>)}</nav>
        <div className="cc-envtag" data-env={me.env}>Entorno: {me.env}</div>
        <div className="cc-who">{me.user.email}</div>
      </aside>
      <main className="cc-main">
        <header className="cc-top">
          <GlobalSearch onOpen={async (r) => {
            if (r.kind === 'tasks') setOpen(tasks.find((t) => t.id === r.id) ?? null);
            else location.hash = `#/${r.kind}`;
          }} />
          <button className="cc-btn" onClick={() => setOpen({ status: 'todo', priority: 'P2', visibility: 'shared', weight: 1 })}>+ Tarea</button>
        </header>
        {taskViews.includes(view) && <FilterBar filters={filters} setFilters={setFilters} ctx={ctx} view={view} />}
        <section className="cc-view">
          {view === 'dashboard' && <Dashboard ctx={ctx} />}
          {view === 'mine' && <TaskTable rows={filtered.filter((t) => t.assignee === me.user.email || (t.visibility === 'private' && t.created_by === me.user.email))} ctx={ctx} />}
          {view === 'shared' && <TaskTable rows={filtered.filter((t) => t.visibility === 'shared')} ctx={ctx} />}
          {view === 'kanban' && <Kanban ctx={ctx} />}
          {view === 'list' && <TaskTable rows={filtered} ctx={ctx} />}
          {view === 'calendar' && <Calendar ctx={ctx} />}
          {view === 'people' && <Grouped ctx={ctx} groups={[...me.members, ''].map((m) => [m ? who(m) : 'Sin asignar', filtered.filter((t) => (t.assignee ?? '') === m)])} />}
          {view === 'priorities' && <Grouped ctx={ctx} groups={PRIORITY.map((p) => [p, filtered.filter((t) => t.priority === p && t.status !== 'done')])} />}
          {view === 'incidents' && <Incidents ctx={ctx} />}
          {view === 'milestones' && <Milestones ctx={ctx} />}
          {view === 'decisions' && <SimpleCrud kind="decisions" fields={[['title', 'Título'], ['context', 'Contexto', 'area'], ['decision', 'Decisión', 'area'], ['status', 'Estado', DECISION_STATUS], ['decided_at', 'Fecha', 'date']]} ctx={ctx} />}
          {view === 'notes' && <SimpleCrud kind="notes" fields={[['title', 'Título'], ['body', 'Nota', 'area']]} ctx={ctx} />}
          {view === 'activity' && <Activity />}
          {view === 'categories' && <Categories ctx={ctx} />}
        </section>
      </main>
      {open && <TaskDrawer task={open} ctx={ctx} onClose={() => setOpen(null)} />}
      {toast && <div className="cc-toast" role="status">{toast}</div>}
    </div>
  );
}

type Ctx = {
  me: Me; tasks: Row[]; filtered: Row[]; cats: Row[]; milestones: Row[]; incidents: Row[];
  catName: (id: string | null) => Row | undefined; openTask: (t: Row) => void;
  saveTask: (id: string | null, patch: Row) => Promise<Row | null>; reload: () => Promise<void>; say: (m: string) => void;
};

function GlobalSearch({ onOpen }: { onOpen: (r: Row) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Row[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const h = setTimeout(() => api(`search?q=${encodeURIComponent(q)}`).then((r) => setRes(r.results)).catch(() => {}), 200);
    return () => clearTimeout(h);
  }, [q]);
  return (
    <div className="cc-search">
      <input type="search" placeholder="Buscar en todo (tareas, incidencias, hitos, notas…)" aria-label="Buscador global" value={q} onChange={(e) => setQ(e.target.value)} />
      {res.length > 0 && <ul className="cc-results">{res.map((r) => (
        <li key={r.kind + r.id}><button onClick={() => { onOpen(r); setQ(''); }}><span className="cc-pill">{r.kind}</span> {r.title}</button></li>
      ))}</ul>}
    </div>
  );
}

function FilterBar({ filters, setFilters, ctx, view }: { filters: Filters; setFilters: (f: Filters) => void; ctx: Ctx; view: string }) {
  const [saved, setSaved] = useState<Row[]>([]);
  const load = () => api('filters').then((r) => setSaved(r.items)).catch(() => {});
  useEffect(() => { load(); }, []);
  const set = (k: keyof Filters) => (e: { target: { value: string } }) => setFilters({ ...filters, [k]: e.target.value });
  return (
    <div className="cc-filters">
      <input placeholder="Filtrar…" aria-label="Filtrar texto" value={filters.q} onChange={set('q')} />
      <select aria-label="Estado" value={filters.status} onChange={set('status')}><option value="">Estado</option>{TASK_STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
      <select aria-label="Prioridad" value={filters.priority} onChange={set('priority')}><option value="">Prioridad</option>{PRIORITY.map((p) => <option key={p}>{p}</option>)}</select>
      <select aria-label="Categoría" value={filters.category_id} onChange={set('category_id')}><option value="">Categoría</option>{ctx.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select aria-label="Responsable" value={filters.assignee} onChange={set('assignee')}><option value="">Responsable</option><option value="__none">Sin asignar</option>{ctx.me.members.map((m) => <option key={m} value={m}>{who(m)}</option>)}</select>
      <select aria-label="Hito" value={filters.milestone_id} onChange={set('milestone_id')}><option value="">Hito</option>{ctx.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
      <button className="cc-link" onClick={() => setFilters(NO_FILTERS)}>Limpiar</button>
      <select aria-label="Filtros guardados" value="" onChange={(e) => { const f = saved.find((s) => s.id === e.target.value); if (f) { setFilters({ ...NO_FILTERS, ...f.query }); location.hash = `#/${f.view}`; } }}>
        <option value="">Filtros guardados…</option>{saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button className="cc-link" onClick={async () => {
        const name = prompt('Nombre del filtro');
        if (name) { await api('filters', 'POST', { name, view, query: filters }).catch((e) => ctx.say(e.message)); load(); }
      }}>Guardar filtro</button>
      {saved.length > 0 && <button className="cc-link" onClick={async () => {
        const name = prompt(`Borrar filtro (escribe su nombre): ${saved.map((s) => s.name).join(', ')}`);
        const f = saved.find((s) => s.name === name);
        if (f) { await api(`filters/${f.id}`, 'DELETE'); load(); }
      }}>Borrar filtro</button>}
    </div>
  );
}

function Chip({ cat }: { cat?: Row }) {
  return cat ? <span className="cc-chip" style={{ borderColor: cat.color, color: cat.color }}>{cat.name}</span> : null;
}

function TaskTable({ rows, ctx }: { rows: Row[]; ctx: Ctx }) {
  const [sort, setSort] = useState<[string, 1 | -1]>(['priority', 1]);
  const sorted = useMemo(() => [...rows].sort((a, b) => String(a[sort[0]] ?? '~').localeCompare(String(b[sort[0]] ?? '~')) * sort[1]), [rows, sort]);
  const th = (k: string, label: string) => (
    <th aria-sort={sort[0] === k ? (sort[1] === 1 ? 'ascending' : 'descending') : undefined}>
      <button onClick={() => setSort([k, sort[0] === k ? (sort[1] === 1 ? -1 : 1) : 1])}>{label}{sort[0] === k ? (sort[1] === 1 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  );
  if (!rows.length) return <p className="cc-empty">No hay tareas con estos filtros.</p>;
  return (
    <table className="cc-table">
      <thead><tr>{th('title', 'Tarea')}{th('status', 'Estado')}{th('priority', 'Prioridad')}{th('category_id', 'Categoría')}{th('assignee', 'Responsable')}{th('due_date', 'Fecha')}</tr></thead>
      <tbody>{sorted.map((t) => (
        <tr key={t.id} onClick={() => ctx.openTask(t)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && ctx.openTask(t)}>
          <td>{t.title}{t.visibility === 'private' && <span className="cc-pill">privada</span>}{t.incident_id && <span className="cc-pill">incidencia</span>}</td>
          <td>{STATUS_LABEL[t.status]}</td><td><span className={`cc-prio ${t.priority}`}>{t.priority}</span></td>
          <td><Chip cat={ctx.catName(t.category_id)} /></td>
          <td>{t.assignee ? who(t.assignee) : <span className="cc-dim">Sin asignar{t.suggested_assignee ? ` (sugerido: ${t.suggested_assignee})` : ''}</span>}</td>
          <td>{t.due_date ?? '—'}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function Card({ t, ctx, drag }: { t: Row; ctx: Ctx; drag?: boolean }) {
  return (
    <div className="cc-card" draggable={drag} onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)} onClick={() => ctx.openTask(t)}
      tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && ctx.openTask(t)}>
      <div className="cc-card-title">{t.title}</div>
      <div className="cc-card-meta"><span className={`cc-prio ${t.priority}`}>{t.priority}</span><Chip cat={ctx.catName(t.category_id)} /><span className="cc-dim">{who(t.assignee)}</span>{t.due_date && <span className="cc-dim">📅 {t.due_date}</span>}</div>
    </div>
  );
}

function Kanban({ ctx }: { ctx: Ctx }) {
  const [over, setOver] = useState('');
  const drop = async (status: string, e: React.DragEvent) => {
    e.preventDefault(); setOver('');
    const tid = e.dataTransfer.getData('text/plain');
    const t = ctx.tasks.find((x) => x.id === tid);
    if (!t || t.status === status) return;
    const col = ctx.tasks.filter((x) => x.status === status);
    await ctx.saveTask(tid, { status, sort: (col.length ? Math.max(...col.map((x) => x.sort)) : 0) + 1 });
  };
  return (
    <div className="cc-kanban">{TASK_STATUS.map((s) => {
      const col = ctx.filtered.filter((t) => t.status === s);
      return (
        <div key={s} className={`cc-col ${over === s ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver('')} onDrop={(e) => drop(s, e)}>
          <h3>{STATUS_LABEL[s]} <span className="cc-dim">{col.length}</span></h3>
          {col.map((t) => <Card key={t.id} t={t} ctx={ctx} drag />)}
        </div>
      );
    })}</div>
  );
}

function Calendar({ ctx }: { ctx: Ctx }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // lunes primero
  const shift = (d: number) => setMonth(new Date(Date.UTC(y, m - 1 + d, 1)).toISOString().slice(0, 7));
  const undated = ctx.filtered.filter((t) => !t.due_date && t.status !== 'done').length;
  return (
    <div>
      <div className="cc-calhead"><button className="cc-link" onClick={() => shift(-1)}>‹</button><strong>{first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong><button className="cc-link" onClick={() => shift(1)}>›</button><span className="cc-dim">{undated} tareas abiertas sin fecha</span></div>
      <div className="cc-cal">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <div key={d} className="cc-calh">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          return <div key={date} className="cc-day"><span className="cc-dim">{i + 1}</span>{ctx.filtered.filter((t) => t.due_date === date).map((t) => (
            <button key={t.id} className={`cc-calitem ${t.status === 'done' ? 'done' : ''}`} onClick={() => ctx.openTask(t)}>{t.title}</button>
          ))}</div>;
        })}
      </div>
    </div>
  );
}

function Grouped({ groups, ctx }: { groups: [string, Row[]][]; ctx: Ctx }) {
  return <div className="cc-groups">{groups.map(([name, rows]) => (
    <div key={name} className="cc-col"><h3>{name} <span className="cc-dim">{rows.length}</span></h3>{rows.map((t) => <Card key={t.id} t={t} ctx={ctx} />)}</div>
  ))}</div>;
}

function Dashboard({ ctx }: { ctx: Ctx }) {
  const [d, setD] = useState<Row | null>(null);
  useEffect(() => { api('dashboard').then(setD).catch(() => {}); }, [ctx.tasks]);
  const count = (arr: Row[] | undefined, k: string, v: string) => arr?.find((r) => r[k] === v)?.n ?? 0;
  return (
    <div className="cc-dash">
      {!ctx.tasks.length && (
        <div className="cc-panel"><p>Aún no hay tareas en este entorno. Puedes importar las de las auditorías (tareas, incidencias e hitos con evidencia y criterios de terminado; ninguna marcada como hecha).</p>
          <button className="cc-btn" onClick={async () => { const r = await api('import', 'POST'); ctx.say(`Importados ${r.inserted} elementos`); ctx.reload(); }}>Importar desde auditorías</button></div>
      )}
      <div className="cc-stats">
        {TASK_STATUS.map((s) => <div key={s} className="cc-stat"><b>{count(d?.byStatus, 'status', s)}</b>{STATUS_LABEL[s]}</div>)}
        <div className="cc-stat"><b>{d?.mine ?? 0}</b>Mis abiertas</div>
        <div className="cc-stat warn"><b>{d?.overdue ?? 0}</b>Vencidas</div>
        <div className="cc-stat"><b>{count(d?.incidents, 'status', 'abierta')}</b>Incidencias abiertas</div>
      </div>
      <div className="cc-two">
        <div className="cc-panel"><h3>Abiertas por prioridad</h3>{PRIORITY.map((p) => <div key={p} className="cc-row"><span className={`cc-prio ${p}`}>{p}</span> {count(d?.byPriority, 'priority', p)}</div>)}</div>
        <div className="cc-panel"><h3>Hitos</h3>{ctx.milestones.map((m) => <Progress key={m.id} label={m.title} value={m.progress} />)}</div>
      </div>
      <div className="cc-panel"><h3>Actividad reciente</h3><ActivityList items={d?.activity ?? []} /></div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="cc-progress"><span>{label}</span><div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>;
}

function ActivityList({ items }: { items: Row[] }) {
  if (!items.length) return <p className="cc-empty">Sin actividad.</p>;
  return <ul className="cc-activity">{items.map((a) => <li key={a.id}><span className="cc-dim">{new Date(a.created_at).toLocaleString('es-ES')}</span> <b>{who(a.actor)}</b> {a.action} <span className="cc-pill">{a.entity_type}</span> {a.summary}</li>)}</ul>;
}

function Activity() {
  const [items, setItems] = useState<Row[]>([]);
  useEffect(() => { api('activity').then((r) => setItems(r.items)).catch(() => {}); }, []);
  return <ActivityList items={items} />;
}

function Comments({ type, id }: { type: string; id: string }) {
  const [items, setItems] = useState<Row[]>([]);
  const [body, setBody] = useState('');
  const load = useCallback(() => api(`comments?entity_type=${type}&entity_id=${id}`).then((r) => setItems(r.items)).catch(() => {}), [type, id]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="cc-comments"><h4>Comentarios</h4>
      {items.map((c) => <div key={c.id} className="cc-comment"><b>{who(c.author)}</b> <span className="cc-dim">{new Date(c.created_at).toLocaleString('es-ES')}</span><p>{c.body}</p></div>)}
      <form onSubmit={async (e) => { e.preventDefault(); if (!body.trim()) return; await api('comments', 'POST', { entity_type: type, entity_id: id, body }); setBody(''); load(); }}>
        <textarea aria-label="Nuevo comentario" value={body} onChange={(e) => setBody(e.target.value)} rows={2} /><button className="cc-btn">Comentar</button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="cc-field"><span>{label}</span>{children}</label>;
}

function TaskDrawer({ task, ctx, onClose }: { task: Row; ctx: Ctx; onClose: () => void }) {
  const [t, setT] = useState<Row>(task);
  const set = (k: string, num = false) => (e: { target: { value: string } }) => setT({ ...t, [k]: num ? Number(e.target.value) : e.target.value || null });
  const incident = ctx.incidents.find((i) => i.id === t.incident_id);
  const save = async () => {
    const keys = ['title', 'description', 'status', 'priority', 'category_id', 'assignee', 'visibility', 'due_date', 'milestone_id', 'weight', 'evidence', 'done_criteria', 'verified'];
    const patch = Object.fromEntries(keys.filter((k) => !task.id || t[k] !== task[k]).filter((k) => t[k] !== undefined).map((k) => [k, t[k] ?? null]));
    if (!task.id) for (const k of ['description', 'evidence', 'done_criteria']) if (patch[k] == null) delete patch[k];
    if (task.id && !Object.keys(patch).length) return onClose();
    const saved = await ctx.saveTask(task.id ?? null, patch);
    if (saved) onClose();
  };
  return (
    <div className="cc-overlay" onClick={onClose}>
      <aside className="cc-drawer" role="dialog" aria-modal="true" aria-label="Tarea" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="cc-drawer-head"><h2>{task.id ? 'Tarea' : 'Nueva tarea'}</h2><button className="cc-link" onClick={onClose} aria-label="Cerrar">✕</button></div>
        <Field label="Título"><input value={t.title ?? ''} onChange={set('title')} autoFocus /></Field>
        <div className="cc-grid">
          <Field label="Estado"><select value={t.status} onChange={set('status')}>{TASK_STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Prioridad"><select value={t.priority} onChange={set('priority')}>{PRIORITY.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Categoría"><select value={t.category_id ?? ''} onChange={set('category_id')}><option value="">—</option>{ctx.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Responsable"><select value={t.assignee ?? ''} onChange={set('assignee')}><option value="">Sin asignar</option>{ctx.me.members.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
          <Field label="Visibilidad"><select value={t.visibility} onChange={set('visibility')}><option value="shared">Compartida</option><option value="private">Privada (solo yo)</option></select></Field>
          <Field label="Fecha límite"><input type="date" value={t.due_date ?? ''} onChange={set('due_date')} /></Field>
          <Field label="Hito"><select value={t.milestone_id ?? ''} onChange={set('milestone_id')}><option value="">—</option>{ctx.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>
          <Field label="Peso en el hito"><input type="number" min={0} max={100} value={t.weight ?? 1} onChange={set('weight', true)} /></Field>
        </div>
        {t.suggested_assignee && !t.assignee && <p className="cc-dim">Responsable sugerido: {t.suggested_assignee}</p>}
        <Field label="Descripción"><textarea rows={3} value={t.description ?? ''} onChange={set('description')} /></Field>
        <Field label="Evidencia"><textarea rows={3} value={t.evidence ?? ''} onChange={set('evidence')} /></Field>
        <Field label="Criterios de terminado"><textarea rows={3} value={t.done_criteria ?? ''} onChange={set('done_criteria')} /></Field>
        <label className="cc-check"><input type="checkbox" checked={!!t.verified} onChange={(e) => setT({ ...t, verified: e.target.checked ? 1 : 0 })} /> Verificado (los criterios se han comprobado)</label>
        {t.source && <p className="cc-dim">Origen: {t.source}</p>}
        {incident && <p>Viene de la incidencia: <a href="#/incidents" onClick={onClose}>{incident.title}</a></p>}
        <div className="cc-actions">
          <button className="cc-btn" onClick={save}>Guardar</button>
          {task.id && <button className="cc-btn danger" onClick={async () => { if (confirm('¿Borrar esta tarea?')) { await api(`tasks/${task.id}`, 'DELETE'); await ctx.reload(); onClose(); } }}>Borrar</button>}
        </div>
        {task.id && <Comments type="tasks" id={task.id} />}
      </aside>
    </div>
  );
}

function Incidents({ ctx }: { ctx: Ctx }) {
  const [draft, setDraft] = useState<Row>({ title: '', severity: 'media' });
  const convert = async (i: Row) => {
    const r = await api(`incidents/${i.id}/to-task`, 'POST').catch((e) => { ctx.say(e.message); return null; });
    if (!r) return;
    await ctx.reload();
    ctx.say(r.existing ? 'Ya tenía tarea: abierta' : 'Tarea creada y vinculada');
    ctx.openTask(r.item);
  };
  return (
    <div>
      <form className="cc-inline" onSubmit={async (e) => { e.preventDefault(); await api('incidents', 'POST', draft).catch((er) => ctx.say(er.message)); setDraft({ title: '', severity: 'media' }); ctx.reload(); }}>
        <input placeholder="Nueva incidencia" aria-label="Título de la incidencia" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
        <select aria-label="Gravedad" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>{SEVERITY.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Categoría" value={draft.category_id ?? ''} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || undefined })}><option value="">Categoría</option>{ctx.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="cc-btn">Añadir</button>
      </form>
      <table className="cc-table">
        <thead><tr><th>Incidencia</th><th>Gravedad</th><th>Estado</th><th>Categoría</th><th>Evidencia</th><th /></tr></thead>
        <tbody>{ctx.incidents.map((i) => {
          const task = ctx.tasks.find((t) => t.id === i.task_id);
          return (
            <tr key={i.id}>
              <td><b>{i.title}</b><div className="cc-dim">{i.description}</div></td>
              <td>{i.severity}</td>
              <td><select aria-label="Estado de la incidencia" value={i.status} onChange={async (e) => { await api(`incidents/${i.id}`, 'PATCH', { status: e.target.value }); ctx.reload(); }}>{INCIDENT_STATUS.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><Chip cat={ctx.catName(i.category_id)} /></td>
              <td className="cc-dim cc-small">{i.evidence}</td>
              <td>{task ? <button className="cc-link" onClick={() => ctx.openTask(task)}>Ver tarea</button> : <button className="cc-btn" onClick={() => convert(i)}>Convertir en tarea</button>}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function Milestones({ ctx }: { ctx: Ctx }) {
  return (
    <div>
      <SimpleCrud kind="milestones" fields={[['title', 'Título'], ['description', 'Descripción', 'area'], ['due_date', 'Fecha', 'date'], ['status', 'Estado', ['abierto', 'cerrado']]]} ctx={ctx}
        extra={(m) => {
          const full = ctx.milestones.find((x) => x.id === m.id);
          return full ? <><Progress label={`${full.task_count} tareas`} value={full.progress} /></> : null;
        }} />
      <p className="cc-dim">El progreso es la suma de los pesos de las tareas en «Hecho» dividida entre la suma de los pesos de todas las tareas del hito.</p>
    </div>
  );
}

type FieldDef = [string, string, ('area' | 'date' | readonly string[])?];

function SimpleCrud({ kind, fields, ctx, extra }: { kind: string; fields: FieldDef[]; ctx: Ctx; extra?: (r: Row) => ReactNode }) {
  const [items, setItems] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const load = useCallback(() => api(kind).then((r) => setItems(r.items)).catch(() => {}), [kind]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!edit) return;
    const body = Object.fromEntries(fields.map(([k]) => [k, edit[k] === '' ? null : edit[k]]).filter(([, v]) => v !== undefined && !(v === null && !edit.id)));
    try {
      await (edit.id ? api(`${kind}/${edit.id}`, 'PATCH', body) : api(kind, 'POST', body));
      setEdit(null); load(); ctx.reload();
    } catch (e) { ctx.say((e as Error).message); }
  };
  return (
    <div>
      <button className="cc-btn" onClick={() => setEdit({})}>+ Añadir</button>
      {edit && (
        <div className="cc-panel">
          {fields.map(([k, label, type]) => (
            <Field key={k} label={label}>
              {type === 'area' ? <textarea rows={4} value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                : type === 'date' ? <input type="date" value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                  : Array.isArray(type) ? <select value={edit[k] ?? type[0]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}>{type.map((o) => <option key={o}>{o}</option>)}</select>
                    : <input value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />}
            </Field>
          ))}
          <div className="cc-actions"><button className="cc-btn" onClick={save}>Guardar</button><button className="cc-link" onClick={() => setEdit(null)}>Cancelar</button></div>
          {edit.id && <Comments type={kind} id={edit.id} />}
        </div>
      )}
      <div className="cc-cards">{items.map((r) => (
        <div key={r.id} className="cc-panel">
          <h3>{r.title}</h3>
          {fields.slice(1).map(([k, label]) => r[k] ? <p key={k}><span className="cc-dim">{label}:</span> {String(r[k])}</p> : null)}
          {extra?.(r)}
          <div className="cc-actions">
            <button className="cc-link" onClick={() => setEdit(r)}>Editar</button>
            <button className="cc-link danger" onClick={async () => { if (confirm('¿Borrar?')) { await api(`${kind}/${r.id}`, 'DELETE'); load(); ctx.reload(); } }}>Borrar</button>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

function Categories({ ctx }: { ctx: Ctx }) {
  const [name, setName] = useState('');
  const patch = async (id: string, body: Row) => { await api(`categories/${id}`, 'PATCH', body).catch((e) => ctx.say(e.message)); ctx.reload(); };
  return (
    <div>
      <form className="cc-inline" onSubmit={async (e) => { e.preventDefault(); await api('categories', 'POST', { name, sort: ctx.cats.length }).catch((er) => ctx.say(er.message)); setName(''); ctx.reload(); }}>
        <input placeholder="Nueva categoría" aria-label="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} required /><button className="cc-btn">Añadir</button>
      </form>
      <table className="cc-table"><tbody>{ctx.cats.map((c) => (
        <tr key={c.id}>
          <td><input type="color" aria-label={`Color de ${c.name}`} value={c.color} onChange={(e) => patch(c.id, { color: e.target.value })} /></td>
          <td><input aria-label="Nombre" defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })} /></td>
          <td className="cc-dim">{ctx.tasks.filter((t) => t.category_id === c.id).length} tareas</td>
          <td><button className="cc-link danger" onClick={async () => { if (confirm(`¿Borrar ${c.name}? Sus tareas quedan sin categoría.`)) { await api(`categories/${c.id}`, 'DELETE'); ctx.reload(); } }}>Borrar</button></td>
        </tr>
      ))}</tbody></table>
    </div>
  );
}
