import Database from 'better-sqlite3';
import path from 'path';
import { createTable } from './schema';

const DB_PATH = path.join(__dirname, '../../data/memos.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

createTable(db);

export default db;
