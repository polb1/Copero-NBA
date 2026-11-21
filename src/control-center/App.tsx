import { useCallback, useEffect, useState, type ReactNode } from 'react';

type Row = Record<string, any>;
type Me = { user: { email: string; name: string }; env: string; members: string[]; names: Record<string, string> };

// Tres columnas. Los estados intermedios de la base (backlog, review) se agrupan aquí.
export const COLUMNS = [
  { key: 'todo', label: 'Por hacer', statuses: ['backlog', 'todo'] },
  { key: 'doing', label: 'En curso', statuses: ['doing', 'review'] },
  { key: 'done', label: 'Hecho', statuses: ['done'] },
] as const;
const PRIO: Record<string, string> = { P0: 'Urgente', P1: 'Importante', P2: 'Normal', P3: 'Cuando se pueda' };

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

/** Filtro de la barra: persona ('' = todas, '__none' = sin asignar) y texto. Orden: prioridad y luego el orden del tablero. */
export function visibleTasks(tasks: Row[], person: string, q: string): Row[] {
  const text = q.trim().toLowerCase();
  return tasks
    .filter((t) => !person || (person === '__none' ? !t.assignee : t.assignee === person))
    .filter((t) => !text || `${t.title} ${t.description}`.toLowerCase().includes(text))
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.sort - b.sort);
}

export function ControlCenter() {
  const [me, setMe] = useState<Me | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [cats, setCats] = useState<Row[]>([]);
  const [person, setPerson] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Row | null>(null);
  const [over, setOver] = useState('');
  const [toast, setToast] = useState('');

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const reload = useCallback(async () => {
    const [t, c] = await Promise.all([api('tasks'), api('categories')]);
    setTasks(t.items); setCats(c.items);
  }, []);

  useEffect(() => {
    api<Me>('me').then((m) => { setMe(m); return reload(); })
      .catch((e) => setFatal(e.status === 401 ? 'login' : e.status === 403 ? 'Tu cuenta no tiene acceso.' : e.message));
    // Al volver a la pestaña se recargan los datos: así se ven los cambios de la otra persona.
    const onFocus = () => { reload().catch(() => {}); };
    addEventListener('focus', onFocus);
    return () => removeEventListener('focus', onFocus);
  }, [reload]);

  const save = async (id: string | null, patch: Row) => {
    try {
      await (id ? api(`tasks/${id}`, 'PATCH', patch) : api('tasks', 'POST', patch));
      await reload();
      return true;
    } catch (e) { say((e as Error).message); return false; }
  };

  if (fatal === 'login') return <div className="cc-center"><p>Necesitas iniciar sesión.</p><a className="cc-btn" href="/auth/login">Iniciar sesión</a></div>;
  if (fatal) return <div className="cc-center"><p>{fatal}</p></div>;
  if (!me) return <div className="cc-center"><p>Cargando…</p></div>;

  const name = (email?: string | null) => (email ? me.names[email] ?? email.split('@')[0] : 'Sin asignar');
  const shown = visibleTasks(tasks, person, q);
  const move = async (id: string, col: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || (COLUMNS.find((c) => c.key === col)!.statuses as readonly string[]).includes(t.status)) return;
    await save(id, { status: col, sort: Date.now() / 1000 });
  };
  const people: [string, string][] = [['', 'Todas'], [me.user.email, 'Mías'], ...me.members.filter((m) => m !== me.user.email).map((m): [string, string] => [m, name(m)]), ['__none', 'Sin asignar']];

  return (
    <div className="cc">
      <header className="cc-top">
        <div className="cc-brand"><strong>Anillero</strong> · Tareas {me.env !== 'production' && <span className="cc-env">{me.env}</span>}</div>
        <input className="cc-q" type="search" placeholder="Buscar tarea…" aria-label="Buscar tarea" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="cc-btn" onClick={() => setOpen({ status: 'todo', priority: 'P2', assignee: me.user.email })}>+ Nueva tarea</button>
      </header>

      <nav className="cc-people" aria-label="Filtrar por persona">
        {people.map(([k, label]) => <button key={k || 'all'} className={person === k ? 'on' : ''} aria-pressed={person === k} onClick={() => setPerson(k)}>{label}</button>)}
      </nav>

      {!tasks.length && <p className="cc-empty">No hay tareas todavía. Crea la primera con «+ Nueva tarea».</p>}

      <main className="cc-board">
        {COLUMNS.map((col) => {
          const rows = shown.filter((t) => (col.statuses as readonly string[]).includes(t.status));
          return (
            <section key={col.key} className={`cc-col ${over === col.key ? 'over' : ''}`} aria-label={col.label}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key); }} onDragLeave={() => setOver('')}
              onDrop={(e) => { e.preventDefault(); setOver(''); move(e.dataTransfer.getData('text/plain'), col.key); }}>
              <h2>{col.label} <span>{rows.length}</span></h2>
              {rows.map((t) => (
                <article key={t.id} className={`cc-card p-${t.priority}`} draggable tabIndex={0}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                  onClick={() => setOpen(t)} onKeyDown={(e) => e.key === 'Enter' && setOpen(t)}>
                  <div className="cc-card-title">{t.title}</div>
                  <div className="cc-card-meta">
                    <span className="cc-prio">{PRIO[t.priority]}</span>
                    <span>{name(t.assignee)}</span>
                    {t.due_date && <span>📅 {t.due_date}</span>}
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </main>

      {open && <TaskPanel task={open} me={me} cats={cats} name={name} onClose={() => setOpen(null)} onSave={save} onDeleted={reload} />}
      {toast && <div className="cc-toast" role="status">{toast}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="cc-field"><span>{label}</span>{children}</label>;
}

function TaskPanel({ task, me, cats, name, onClose, onSave, onDeleted }: {
  task: Row; me: Me; cats: Row[]; name: (e?: string | null) => string; onClose: () => void;
  onSave: (id: string | null, patch: Row) => Promise<boolean>; onDeleted: () => Promise<void>;
}) {
  const [t, setT] = useState<Row>(task);
  const set = (k: string) => (e: { target: { value: string } }) => setT({ ...t, [k]: e.target.value || null });
  const status = COLUMNS.find((c) => (c.statuses as readonly string[]).includes(t.status))?.key ?? 'todo';
  const submit = async () => {
    const keys = ['title', 'description', 'done_criteria', 'status', 'priority', 'assignee', 'due_date', 'category_id'];
    const patch = Object.fromEntries(keys.filter((k) => t[k] !== task[k] && !(t[k] == null && !task.id)).map((k) => [k, t[k] ?? null]));
    if (task.id && !Object.keys(patch).length) return onClose();
    if (await onSave(task.id ?? null, patch)) onClose();
  };
  return (
    <div className="cc-overlay" onClick={onClose}>
      <aside className="cc-panel" role="dialog" aria-modal="true" aria-label={task.id ? 'Tarea' : 'Nueva tarea'}
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="cc-panel-head"><h2>{task.id ? 'Tarea' : 'Nueva tarea'}</h2><button className="cc-x" onClick={onClose} aria-label="Cerrar">✕</button></div>
        <Field label="Título"><input value={t.title ?? ''} onChange={set('title')} autoFocus /></Field>
        <Field label="Qué hay que hacer"><textarea rows={4} value={t.description ?? ''} onChange={set('description')} /></Field>
        <Field label="Está hecho cuando…"><textarea rows={3} value={t.done_criteria ?? ''} onChange={set('done_criteria')} /></Field>
        <div className="cc-grid">
          <Field label="Estado"><select value={status} onChange={set('status')}>{COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
          <Field label="Prioridad"><select value={t.priority} onChange={set('priority')}>{Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Quién"><select value={t.assignee ?? ''} onChange={set('assignee')}><option value="">Sin asignar</option>{me.members.map((m) => <option key={m} value={m}>{name(m)}</option>)}</select></Field>
          <Field label="Para cuándo"><input type="date" value={t.due_date ?? ''} onChange={set('due_date')} /></Field>
          <Field label="Tema"><select value={t.category_id ?? ''} onChange={set('category_id')}><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        </div>
        {task.evidence && <details className="cc-why"><summary>Por qué (de dónde sale)</summary><p>{task.evidence}</p></details>}
        <div className="cc-actions">
          <button className="cc-btn" onClick={submit}>Guardar</button>
          {task.id && <button className="cc-del" onClick={async () => { if (confirm('¿Borrar esta tarea?')) { await api(`tasks/${task.id}`, 'DELETE'); await onDeleted(); onClose(); } }}>Borrar</button>}
        </div>
        {task.id && <Comments id={task.id} name={name} />}
      </aside>
    </div>
  );
}

function Comments({ id, name }: { id: string; name: (e?: string | null) => string }) {
  const [items, setItems] = useState<Row[]>([]);
  const [body, setBody] = useState('');
  const load = useCallback(() => api(`comments?entity_type=tasks&entity_id=${id}`).then((r) => setItems(r.items)).catch(() => {}), [id]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="cc-comments"><h3>Comentarios</h3>
      {items.map((c) => <div key={c.id} className="cc-comment"><b>{name(c.author)}</b> <small>{new Date(c.created_at).toLocaleString('es-ES')}</small><p>{c.body}</p></div>)}
      <form onSubmit={async (e) => { e.preventDefault(); if (!body.trim()) return; await api('comments', 'POST', { entity_type: 'tasks', entity_id: id, body }); setBody(''); load(); }}>
        <textarea aria-label="Nuevo comentario" placeholder="Escribe un comentario…" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
        <button className="cc-btn">Enviar</button>
      </form>
    </div>
  );
}
