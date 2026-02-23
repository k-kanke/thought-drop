import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { MemoRequest } from '../types/memo';
import { sendToSlack } from '../services/slack';
import db from '../db/client';

const router = Router();
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');

type ScreenshotPayload = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

function parseScreenshotDataUrl(dataUrl: string): ScreenshotPayload {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('Invalid screenshot data URL');
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = EXT_BY_MIME[mimeType];
  if (!extension) {
    throw new Error(`Unsupported screenshot mime type: ${mimeType}`);
  }

  return {
    buffer: Buffer.from(base64, 'base64'),
    mimeType,
    extension,
  };
}

function saveScreenshotAsset(memoId: number, dataUrl: string, timestamp: string): { id: number; urlPath: string } {
  const parsed = parseScreenshotDataUrl(dataUrl);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const filename = `memo_${memoId}_${Date.now()}.${parsed.extension}`;
  const relativePath = `uploads/${filename}`;
  const absolutePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(absolutePath, parsed.buffer);

  const insert = db.prepare(`
    INSERT INTO assets (memo_id, kind, local_path, mime_type, file_size, status, created_at, updated_at)
    VALUES (?, 'screenshot', ?, ?, ?, 'local', ?, ?)
  `);
  const result = insert.run(memoId, relativePath, parsed.mimeType, parsed.buffer.length, timestamp, timestamp);

  return {
    id: Number(result.lastInsertRowid),
    urlPath: `/${relativePath}`,
  };
}

// POST /api/memo - メモ保存 + Slack送信
router.post('/', async (req: Request, res: Response) => {
  const { content, status, user, timestamp, screenshotDataUrl }: MemoRequest = req.body;

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
  const memoId = Number(result.lastInsertRowid);
  let screenshotUrl: string | null = null;
  let screenshotError: string | null = null;

  if (screenshotDataUrl) {
    try {
      const saved = saveScreenshotAsset(memoId, screenshotDataUrl, createdAt);
      screenshotUrl = saved.urlPath;
    } catch (error) {
      console.error('[Route] Failed to save screenshot:', error);
      screenshotError = error instanceof Error ? error.message : String(error);
    }
  }

  // Slack送信
  let slackError: string | null = null;
  try {
    await sendToSlack({ content: trimmedContent, status, user, timestamp: createdAt });
    db.prepare('UPDATE memos SET sent_to_slack = 1 WHERE id = ?').run(memoId);
  } catch (error) {
    console.error('[Route] Failed to send memo to Slack:', error);
    slackError = error instanceof Error ? error.message : String(error);
  }

  if (!slackError && !screenshotError) {
    res.status(200).json({
      message: 'Memo saved successfully',
      id: memoId,
      screenshot_url: screenshotUrl,
    });
    return;
  }

  const problems: string[] = [];
  if (screenshotError) problems.push('screenshot save failed');
  if (slackError) problems.push('slack send failed');
  res.status(207).json({
    message: `Memo saved with partial failure: ${problems.join(', ')}`,
    id: memoId,
    screenshot_url: screenshotUrl,
  });
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
    SELECT id, content, status, sent_to_slack, resolved, created_at
    FROM memos
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.status(200).json({ memos: rows });
});

// PATCH /api/memo/:id/resolve - 解決済みフラグの切り替え
router.patch('/:id/resolve', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid memo id' });
    return;
  }

  const memo = db.prepare('SELECT id, resolved FROM memos WHERE id = ?').get(id) as
    | { id: number; resolved: number }
    | undefined;

  if (!memo) {
    res.status(404).json({ error: 'Memo not found' });
    return;
  }

  const newResolved = memo.resolved === 1 ? 0 : 1;
  db.prepare('UPDATE memos SET resolved = ? WHERE id = ?').run(newResolved, id);

  res.status(200).json({ id, resolved: newResolved });
});

export default router;
