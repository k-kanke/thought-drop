import Database from 'better-sqlite3';

export function createTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      content      TEXT    NOT NULL,
      status       TEXT,
      sent_to_slack INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);
}
