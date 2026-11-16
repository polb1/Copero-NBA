-- The active career belongs to the authenticated account, not to a browser/device.
CREATE TABLE IF NOT EXISTS account_careers (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  career_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_careers_updated ON account_careers(updated_at);
