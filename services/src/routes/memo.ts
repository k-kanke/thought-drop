import { Router, Request, Response } from 'express';
import { MemoRequest } from '../types/memo';
import { sendToSlack } from '../services/slack';
import db from '../db/client';

const router = Router();

// POST /api/memo - メモ保存 + Slack送信
router.post('/', async (req: Request, res: Response) => {
  const { content, status, timestamp }: MemoRequest = req.body;

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
    await sendToSlack({ content: trimmedContent, status, timestamp: createdAt });
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

  const rows = db.prepare(`
    SELECT id, content, status, sent_to_slack, created_at
    FROM memos
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.status(200).json({ memos: rows });
});

export default router;
