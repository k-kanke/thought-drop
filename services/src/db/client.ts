import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from './migrate';
import { createInitialSchema } from './schema';

function resolveDbPath(): string {
  // Allow override via env var to support container platforms (e.g., Render persistent disk)
  // Prefer DB_DIR (directory) or DB_PATH (full path). Fallback to dist-relative ../../data
  const envDir = (process.env.DB_DIR || '').trim();
  const envPath = (process.env.DB_PATH || '').trim();
  if (envPath) return envPath;
  const dir = envDir || path.join(__dirname, '../../data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'memos.db');
}

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

createInitialSchema(db);
runMigrations(db);

export default db;
