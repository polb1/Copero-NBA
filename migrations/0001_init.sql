-- Anillero · esquema inicial (D1 / SQLite)
-- Aplicar con: npx wrangler d1 execute anillero --file=migrations/0001_init.sql --remote

CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  nickname    TEXT,
  country     TEXT
);

CREATE TABLE IF NOT EXISTS careers (
  id           TEXT PRIMARY KEY,
  player_id    TEXT NOT NULL,
  seed         INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  finished_at  INTEGER,
  legacy_score INTEGER NOT NULL DEFAULT 0,
  titles       INTEGER NOT NULL DEFAULT 0,
  tier         TEXT,
  payload      TEXT
);

CREATE INDEX IF NOT EXISTS idx_careers_player ON careers(player_id);
CREATE INDEX IF NOT EXISTS idx_careers_score ON careers(legacy_score DESC);

CREATE TABLE IF NOT EXISTS daily_results (
  day          TEXT NOT NULL,
  player_id    TEXT NOT NULL,
  goal_id      TEXT NOT NULL DEFAULT '',
  done         INTEGER NOT NULL DEFAULT 0,
  progress_a   INTEGER NOT NULL DEFAULT 0,
  progress_b   INTEGER NOT NULL DEFAULT 0,
  legacy_score INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (day, player_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_day ON daily_results(day, legacy_score DESC);

CREATE TABLE IF NOT EXISTS daily_streaks (
  player_id  TEXT PRIMARY KEY,
  streak     INTEGER NOT NULL DEFAULT 0,
  best       INTEGER NOT NULL DEFAULT 0,
  last_day   TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_streaks_best ON daily_streaks(best DESC);

CREATE TABLE IF NOT EXISTS shares (
  id          TEXT PRIMARY KEY,
  career_id   TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  views       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_shares_career ON shares(career_id);
