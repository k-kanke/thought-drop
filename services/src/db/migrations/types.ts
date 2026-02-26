import Database from 'better-sqlite3';

export interface Migration {
  id: string;
  apply: (db: Database.Database) => void;
}
