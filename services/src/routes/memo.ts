import { Router, Request, Response } from 'express';
import { MemoRequest } from '../types/memo';
import { sendToSlack } from '../services/slack';
import db from '../db/client';

const router = Router();
const TRUTHY_VALUES = new Set(['1', 'true']);
const FALSY_VALUES = new Set(['0', 'false']);

function parseResolvedQuery(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') {
    if (value === 1) return 1;
    if (value === 0) return 0;
    return null;
  }
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) return 1;
  if (FALSY_VALUES.has(normalized)) return 0;
  return null;
}

function parseDateFilter(value: unknown, label: 'from' | 'to'): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  if (label === 'from') {
    if (isDateOnly) {
      date.setUTCHours(0, 0, 0, 0);
    }
    return date.toISOString();
  }

  if (isDateOnly) {
    date.setUTCHours(23, 59, 59, 999);
    return date.toISOString();
  }
  return date.toISOString();
}

// POST /api/memo - メモ保存 + Slack送信
router.post('/', async (req: Request, res: Response) => {
  const { content, status, user, timestamp }: MemoRequest = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ error: 'content is required and must be a non-empty string' });
    return;
  }

  const trimmedContent = content.trim();
  const createdAt = timestamp ?? new Date().toISOString();

  // DB保存
  const stmt = db.prepare(`
    INSERT INTO memos (content, status, sent_to_slack, created_at)
    VALUES (?, ?, 0, ?)
  `);
  const result = stmt.run(trimmedContent, status ?? null, createdAt);
  const memoId = result.lastInsertRowid;

  // Slack送信
  try {
    await sendToSlack({ content: trimmedContent, status, user, timestamp: createdAt });
    db.prepare('UPDATE memos SET sent_to_slack = 1 WHERE id = ?').run(memoId);
    res.status(200).json({ message: 'Memo sent to Slack successfully', id: memoId });
  } catch (error) {
    console.error('[Route] Failed to send memo to Slack:', error);
    // DB保存は成功しているのでSlack失敗は警告扱い
    res.status(207).json({ message: 'Memo saved but failed to send to Slack', id: memoId });
  }
});

// GET /api/memo/last - 最終メモ時刻を返す（声かけ判定用）
router.get('/last', (_req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT created_at FROM memos ORDER BY created_at DESC LIMIT 1
  `).get() as { created_at: string } | undefined;

  if (!row) {
    res.status(200).json({ last_memo_at: null });
    return;
  }

  res.status(200).json({ last_memo_at: row.created_at });
});

// GET /api/memo - 履歴一覧
router.get('/', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const resolved = parseResolvedQuery(req.query.resolved);
  const from = parseDateFilter(req.query.from, 'from');
  const to = parseDateFilter(req.query.to, 'to');

  if (resolved === null) {
    res.status(400).json({ error: 'resolved must be one of 0, 1, true, false' });
    return;
  }

  if (req.query.from !== undefined && from === null) {
    res.status(400).json({ error: 'from must be a valid date string' });
    return;
  }

  if (req.query.to !== undefined && to === null) {
    res.status(400).json({ error: 'to must be a valid date string' });
    return;
  }

  if (from && to && from > to) {
    res.status(400).json({ error: 'from must be less than or equal to to' });
    return;
  }

  const whereClauses: string[] = [];
  const queryParams: (string | number)[] = [];

  if (status) {
    whereClauses.push('status = ?');
    queryParams.push(status);
  }

  if (resolved !== undefined) {
    whereClauses.push('resolved = ?');
    queryParams.push(resolved);
  }

  if (from) {
    whereClauses.push('created_at >= ?');
    queryParams.push(from);
  }

  if (to) {
    whereClauses.push('created_at <= ?');
    queryParams.push(to);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  queryParams.push(limit, offset);

  const rows = db.prepare(`
    SELECT id, content, status, sent_to_slack, resolved, created_at
    FROM memos
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...queryParams);

  res.status(200).json({ memos: rows });
});

// PATCH /api/memo/:id/resolve - 解決済みフラグの更新
router.patch('/:id/resolve', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid memo id' });
    return;
  }

  const { resolved } = req.body as { resolved?: unknown };
  if (typeof resolved !== 'boolean') {
    res.status(400).json({ error: 'resolved must be boolean' });
    return;
  }

  const memo = db.prepare('SELECT id FROM memos WHERE id = ?').get(id) as { id: number } | undefined;

  if (!memo) {
    res.status(404).json({ error: 'Memo not found' });
    return;
  }

  const newResolved = resolved ? 1 : 0;
  db.prepare('UPDATE memos SET resolved = ? WHERE id = ?').run(newResolved, id);

  res.status(200).json({ id, resolved: newResolved });
});

export default router;
