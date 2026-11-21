-- Anillero Control Center: backoffice privado.
-- Todas las tablas llevan `env` (production | pre | local): aunque producción y preproducción
-- compartieran base de datos, cada entorno solo ve sus filas (lo impone la API).

CREATE TABLE IF NOT EXISTS cc_categories (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_categories_name ON cc_categories(env, name);

CREATE TABLE IF NOT EXISTS cc_milestones (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'abierto',
  source_ref TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_milestones_ref ON cc_milestones(env, source_ref);

CREATE TABLE IF NOT EXISTS cc_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'P2',
  category_id TEXT REFERENCES cc_categories(id) ON DELETE SET NULL,
  assignee TEXT,
  suggested_assignee TEXT,
  visibility TEXT NOT NULL DEFAULT 'shared',
  due_date TEXT,
  milestone_id TEXT REFERENCES cc_milestones(id) ON DELETE SET NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  evidence TEXT NOT NULL DEFAULT '',
  done_criteria TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  source_ref TEXT,
  incident_id TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  sort REAL NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cc_tasks_env_status ON cc_tasks(env, status, sort);
CREATE INDEX IF NOT EXISTS idx_cc_tasks_assignee ON cc_tasks(env, assignee);
CREATE INDEX IF NOT EXISTS idx_cc_tasks_milestone ON cc_tasks(milestone_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_tasks_ref ON cc_tasks(env, source_ref);

CREATE TABLE IF NOT EXISTS cc_incidents (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'abierta',
  category_id TEXT REFERENCES cc_categories(id) ON DELETE SET NULL,
  evidence TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  source_ref TEXT,
  task_id TEXT REFERENCES cc_tasks(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cc_incidents_env ON cc_incidents(env, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_incidents_ref ON cc_incidents(env, source_ref);

CREATE TABLE IF NOT EXISTS cc_decisions (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  title TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'propuesta',
  decided_at TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cc_notes (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cc_comments (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cc_comments_entity ON cc_comments(env, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS cc_activity (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cc_activity_env ON cc_activity(env, created_at DESC);

CREATE TABLE IF NOT EXISTS cc_saved_filters (
  id TEXT PRIMARY KEY NOT NULL,
  env TEXT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  view TEXT NOT NULL DEFAULT 'list',
  query TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cc_filters_owner ON cc_saved_filters(env, owner);
