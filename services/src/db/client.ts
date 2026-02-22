import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { createTable } from './schema';

const DB_PATH = path.join(__dirname, '../../data/memos.db');
const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

createTable(db);

export default db;
