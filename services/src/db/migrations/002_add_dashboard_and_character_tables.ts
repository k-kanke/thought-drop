import Database from 'better-sqlite3';
import { Migration } from './types';

type TableInfoRow = {
  name: string;
};

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfoRow[];
  return rows.some((row) => row.name === column);
}

export const migration002: Migration = {
  id: '002_add_dashboard_and_character_tables',
  apply: (db) => {
    if (!hasColumn(db, 'memos', 'mode')) {
      db.exec(`
        ALTER TABLE memos
        ADD COLUMN mode TEXT NOT NULL DEFAULT 'instant'
      `);
    }

    if (!hasColumn(db, 'memos', 'stuck_minutes')) {
      db.exec(`
        ALTER TABLE memos
        ADD COLUMN stuck_minutes INTEGER NOT NULL DEFAULT 0
      `);
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS memo_tags (
        memo_id INTEGER NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
        tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (memo_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS character_state (
        id             INTEGER PRIMARY KEY CHECK (id = 1),
        level          INTEGER NOT NULL DEFAULT 1,
        points         INTEGER NOT NULL DEFAULT 0,
        hunger_score   INTEGER NOT NULL DEFAULT 0,
        evolution_path TEXT NOT NULL DEFAULT 'generalist',
        last_fed_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS character_items (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        code          TEXT NOT NULL UNIQUE,
        display_name  TEXT NOT NULL,
        unlocked      INTEGER NOT NULL DEFAULT 0,
        unlocked_at   TEXT,
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS daily_stats (
        date_jst       TEXT PRIMARY KEY,
        memo_count     INTEGER NOT NULL DEFAULT 0,
        stuck_count    INTEGER NOT NULL DEFAULT 0,
        resolved_count INTEGER NOT NULL DEFAULT 0,
        updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
      CREATE INDEX IF NOT EXISTS idx_memo_tags_tag_id ON memo_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_memo_tags_memo_id ON memo_tags(memo_id);
      CREATE INDEX IF NOT EXISTS idx_memos_mode_created_at ON memos(mode, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_daily_stats_updated_at ON daily_stats(updated_at DESC);
    `);

    db.exec(`
      INSERT OR IGNORE INTO character_state (id, level, points, hunger_score, evolution_path)
      VALUES (1, 1, 0, 0, 'generalist');
    `);

    db.exec(`
      INSERT OR IGNORE INTO character_items (code, display_name, unlocked)
      VALUES
      ('aws-cloud-hat', 'AWSの雲の帽子', 0),
      ('go-gopher-glasses', 'Goのゴーファー風メガネ', 0),
      ('terraform-cape', 'Terraformケープ', 0);
    `);
  },
};
