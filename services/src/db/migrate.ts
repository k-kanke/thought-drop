import Database from 'better-sqlite3';
import { migrations } from './migrations';

type AppliedMigrationRow = {
  id: string;
};

function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);
}

export function runMigrations(db: Database.Database): void {
  ensureMigrationsTable(db);

  const appliedRows = db.prepare('SELECT id FROM schema_migrations').all() as AppliedMigrationRow[];
  const appliedIds = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue;
    }

    const tx = db.transaction(() => {
      migration.apply(db);
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
    });

    tx();
  }
}
