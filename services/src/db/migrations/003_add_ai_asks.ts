import Database from 'better-sqlite3';
import { Migration } from './types';

export const migration003: Migration = {
  id: '003_add_ai_asks',
  apply: (db: Database.Database) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_asks (
        id                        INTEGER PRIMARY KEY AUTOINCREMENT,
        user                      TEXT,
        message                   TEXT NOT NULL,
        s3_bucket                 TEXT,
        s3_key                    TEXT,
        mime_type                 TEXT,
        ocr_text                  TEXT,
        answer                    TEXT,
        answer_model              TEXT,
        usage_prompt_tokens       INTEGER,
        usage_completion_tokens   INTEGER,
        created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_ai_asks_created_at ON ai_asks(created_at DESC);
    `);
  },
};

