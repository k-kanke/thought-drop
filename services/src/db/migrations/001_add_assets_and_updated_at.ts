import Database from 'better-sqlite3';
import { Migration } from './types';

type TableInfoRow = {
  name: string;
};

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfoRow[];
  return rows.some((row) => row.name === column);
}

export const migration001: Migration = {
  id: '001_add_assets_and_updated_at',
  apply: (db) => {
    if (!hasColumn(db, 'memos', 'updated_at')) {
      db.exec(`
        ALTER TABLE memos
        ADD COLUMN updated_at TEXT
      `);
      db.exec(`
        UPDATE memos
        SET updated_at = COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        WHERE updated_at IS NULL
      `);
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        memo_id        INTEGER NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
        kind           TEXT    NOT NULL DEFAULT 'screenshot',
        local_path     TEXT    NOT NULL,
        mime_type      TEXT    NOT NULL DEFAULT 'image/png',
        file_size      INTEGER,
        sha256         TEXT,
        status         TEXT    NOT NULL DEFAULT 'local',
        s3_bucket      TEXT,
        s3_key         TEXT,
        s3_url         TEXT,
        uploaded_at    TEXT,
        error_message  TEXT,
        created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_assets_memo_id ON assets(memo_id);
      CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    `);
  },
};
