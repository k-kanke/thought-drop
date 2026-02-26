import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { MemoRequest } from '../types/memo';
import { sendToSlack } from '../services/slack';
import { createSignedObjectUrl, isS3UploadEnabled, uploadLocalFileToS3 } from '../services/s3';
import { feedCharacter } from '../services/character';
import db from '../db/client';

const router = Router();
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');
const TRUTHY_VALUES = new Set(['1', 'true']);
const FALSY_VALUES = new Set(['0', 'false']);
const ALLOWED_MODES = new Set(['instant', 'stockpile']);
const MAX_TAGS_PER_MEMO = 8;

type ScreenshotPayload = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

type QueryFilterInput = {
  status: string;
  resolved: number | undefined;
  from: string | null;
  to: string | null;
  tag: string;
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

function saveScreenshotAsset(
  memoId: number,
  dataUrl: string,
  timestamp: string,
): {
  id: number;
  urlPath: string;
  absolutePath: string;
  relativePath: string;
  filename: string;
  mimeType: string;
} {
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
    absolutePath,
    relativePath,
    filename,
    mimeType: parsed.mimeType,
  };
}

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
    if (isDateOnly) date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }

  if (isDateOnly) date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

function normalizeMode(mode: unknown): 'instant' | 'stockpile' {
  if (typeof mode !== 'string') return 'instant';
  const normalized = mode.trim().toLowerCase();
  if (normalized === 'ためる') return 'stockpile';
  return ALLOWED_MODES.has(normalized) ? (normalized as 'instant' | 'stockpile') : 'instant';
}

function normalizeStuckMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(24 * 60, Math.floor(value)));
}

function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase();
}

function extractHashTags(content: string): string[] {
  const hits = content.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return hits.map((tag) => normalizeTagName(tag));
}

function collectTags(content: string, tags: unknown): string[] {
  const manualTags = Array.isArray(tags)
    ? tags.filter((v): v is string => typeof v === 'string').map(normalizeTagName)
    : [];
  const hashTags = extractHashTags(content);
  const merged = [...manualTags, ...hashTags].filter((tag) => tag.length > 0 && tag.length <= 32);
  return [...new Set(merged)].slice(0, MAX_TAGS_PER_MEMO);
}

function toJstDateString(isoDate: string): string {
  const base = new Date(isoDate);
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  return new Date(base.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function updateDailyStats(dateJst: string, memoDelta: number, stuckDelta: number, resolvedDelta: number): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO daily_stats (date_jst, memo_count, stuck_count, resolved_count, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date_jst) DO UPDATE SET
      memo_count = memo_count + excluded.memo_count,
      stuck_count = stuck_count + excluded.stuck_count,
      resolved_count = resolved_count + excluded.resolved_count,
      updated_at = excluded.updated_at
  `).run(dateJst, memoDelta, stuckDelta, resolvedDelta, now);
}

function syncMemoTags(memoId: number, tags: string[]): void {
  db.prepare('DELETE FROM memo_tags WHERE memo_id = ?').run(memoId);
  if (tags.length === 0) return;

  const insertTag = db.prepare(`
    INSERT INTO tags (name)
    VALUES (?)
    ON CONFLICT(name) DO UPDATE SET name = excluded.name
  `);
  const selectTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const link = db.prepare(`
    INSERT OR IGNORE INTO memo_tags (memo_id, tag_id)
    VALUES (?, ?)
  `);

  for (const tag of tags) {
    insertTag.run(tag);
    const row = selectTag.get(tag) as { id: number } | undefined;
    if (!row) continue;
    link.run(memoId, row.id);
  }
}

function buildMemoFilters(input: QueryFilterInput): { whereSql: string; params: (string | number)[] } {
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (input.status) {
    whereClauses.push('m.status = ?');
    params.push(input.status);
  }

  if (input.resolved !== undefined) {
    whereClauses.push('m.resolved = ?');
    params.push(input.resolved);
  }

  if (input.from) {
    whereClauses.push('m.created_at >= ?');
    params.push(input.from);
  }

  if (input.to) {
    whereClauses.push('m.created_at <= ?');
    params.push(input.to);
  }

  if (input.tag) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM memo_tags mt
        INNER JOIN tags t ON t.id = mt.tag_id
        WHERE mt.memo_id = m.id AND t.name = ?
      )
    `);
    params.push(input.tag);
  }

  return {
    whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
    params,
  };
}

router.post('/', async (req: Request, res: Response) => {
  const { content, status, user, timestamp, screenshotDataUrl, mode, stuckMinutes, tags }: MemoRequest = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ error: 'content is required and must be a non-empty string' });
    return;
  }

  const trimmedContent = content.trim();
  const createdAt = timestamp ?? new Date().toISOString();
  const normalizedMode = normalizeMode(mode);
  const normalizedStuckMinutes = normalizeStuckMinutes(stuckMinutes);
  const normalizedTags = collectTags(trimmedContent, tags);

  const stmt = db.prepare(`
    INSERT INTO memos (content, status, sent_to_slack, created_at, mode, stuck_minutes)
    VALUES (?, ?, 0, ?, ?, ?)
  `);
  const result = stmt.run(
    trimmedContent,
    status ?? null,
    createdAt,
    normalizedMode,
    normalizedStuckMinutes,
  );
  const memoId = Number(result.lastInsertRowid);

  syncMemoTags(memoId, normalizedTags);
  updateDailyStats(toJstDateString(createdAt), 1, status === '詰まり' ? 1 : 0, 0);
  feedCharacter(3 + normalizedTags.length);

  let screenshotUrl: string | null = null;
  let screenshotError: string | null = null;
  if (screenshotDataUrl) {
    try {
      const saved = saveScreenshotAsset(memoId, screenshotDataUrl, createdAt);
      screenshotUrl = saved.urlPath;

      if (isS3UploadEnabled()) {
        try {
          db.prepare(`
            UPDATE assets
            SET status = 'uploading', updated_at = ?, error_message = NULL
            WHERE id = ?
          `).run(new Date().toISOString(), saved.id);

          const uploaded = await uploadLocalFileToS3({
            absolutePath: saved.absolutePath,
            filename: saved.filename,
            mimeType: saved.mimeType,
            memoId,
            createdAtIso: createdAt,
          });

          db.prepare(`
            UPDATE assets
            SET status = 'uploaded',
                s3_bucket = ?,
                s3_key = ?,
                s3_url = ?,
                uploaded_at = ?,
                updated_at = ?,
                error_message = NULL
            WHERE id = ?
          `).run(
            uploaded.bucket,
            uploaded.key,
            uploaded.url,
            createdAt,
            new Date().toISOString(),
            saved.id,
          );

          try {
            fs.unlinkSync(saved.absolutePath);
          } catch (cleanupError) {
            console.warn('[Route] Failed to cleanup local screenshot file:', cleanupError);
          }

          screenshotUrl = uploaded.url;
        } catch (error) {
          const uploadErr = error instanceof Error ? error.message : String(error);
          db.prepare(`
            UPDATE assets
            SET status = 'failed', error_message = ?, updated_at = ?
            WHERE id = ?
          `).run(uploadErr, new Date().toISOString(), saved.id);
          screenshotError = `s3 upload failed: ${uploadErr}`;
        }
      }
    } catch (error) {
      console.error('[Route] Failed to save screenshot:', error);
      screenshotError = error instanceof Error ? error.message : String(error);
    }
  }

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
      tags: normalizedTags,
      mode: normalizedMode,
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
    tags: normalizedTags,
    mode: normalizedMode,
  });
});

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

router.get('/:id/screenshot-url', async (req: Request, res: Response) => {
  const memoId = Number(req.params.id);
  if (!Number.isInteger(memoId) || memoId <= 0) {
    res.status(400).json({ error: 'Invalid memo id' });
    return;
  }

  const asset = db.prepare(`
    SELECT id, local_path, status, s3_bucket, s3_key
    FROM assets
    WHERE memo_id = ? AND kind = 'screenshot'
    ORDER BY id DESC
    LIMIT 1
  `).get(memoId) as
    | {
      id: number;
      local_path: string;
      status: string;
      s3_bucket: string | null;
      s3_key: string | null;
    }
    | undefined;

  if (!asset) {
    res.status(404).json({ error: 'Screenshot not found' });
    return;
  }

  if (asset.status === 'uploaded' && asset.s3_bucket && asset.s3_key) {
    try {
      const url = await createSignedObjectUrl({
        bucket: asset.s3_bucket,
        key: asset.s3_key,
      });
      res.status(200).json({ url, source: 's3' });
      return;
    } catch (error) {
      console.error('[Route] Failed to create signed screenshot URL:', error);
      res.status(500).json({ error: 'Failed to create signed URL' });
      return;
    }
  }

  res.status(200).json({ url: `/${asset.local_path}`, source: 'local' });
});

router.get('/timeline', (req: Request, res: Response) => {
  const view = typeof req.query.view === 'string' ? req.query.view : 'list';
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const resolved = parseResolvedQuery(req.query.resolved);
  const from = parseDateFilter(req.query.from, 'from');
  const to = parseDateFilter(req.query.to, 'to');
  const tag = typeof req.query.tag === 'string' ? normalizeTagName(req.query.tag) : '';

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

  const { whereSql, params } = buildMemoFilters({ status, resolved, from, to, tag });

  if (view === 'calendar') {
    const days = db.prepare(`
      SELECT
        date(datetime(m.created_at, '+9 hours')) AS date,
        COUNT(*) AS total,
        SUM(CASE WHEN m.status = '詰まり' THEN 1 ELSE 0 END) AS stuck,
        SUM(m.resolved) AS resolved
      FROM memos m
      ${whereSql}
      GROUP BY date(datetime(m.created_at, '+9 hours'))
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.status(200).json({ view: 'calendar', days });
    return;
  }

  const memos = db.prepare(`
    SELECT
      m.id, m.content, m.status, m.sent_to_slack, m.resolved, m.created_at, m.mode, m.stuck_minutes,
      COALESCE(GROUP_CONCAT(t.name, ' '), '') AS tags,
      (
        SELECT
          CASE
            WHEN a.status = 'uploaded' AND a.s3_url IS NOT NULL THEN a.s3_url
            ELSE '/' || a.local_path
          END
        FROM assets a
        WHERE a.memo_id = m.id AND a.kind = 'screenshot'
        ORDER BY a.id DESC
        LIMIT 1
      ) AS screenshot_url
    FROM memos m
    LEFT JOIN memo_tags mt ON mt.memo_id = m.id
    LEFT JOIN tags t ON t.id = mt.tag_id
    ${whereSql}
    GROUP BY m.id
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<{
    id: number;
    content: string;
    status: string | null;
    sent_to_slack: number;
    resolved: number;
    created_at: string;
    mode: string;
    stuck_minutes: number;
    tags: string;
    screenshot_url: string | null;
  }>;

  res.status(200).json({
    view: 'list',
    memos: memos.map((memo) => ({
      ...memo,
      tags: memo.tags ? memo.tags.split(' ').filter(Boolean) : [],
    })),
  });
});

router.get('/', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const resolved = parseResolvedQuery(req.query.resolved);
  const from = parseDateFilter(req.query.from, 'from');
  const to = parseDateFilter(req.query.to, 'to');
  const tag = typeof req.query.tag === 'string' ? normalizeTagName(req.query.tag) : '';

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

  const { whereSql, params } = buildMemoFilters({ status, resolved, from, to, tag });
  const rows = db.prepare(`
    SELECT
      m.id, m.content, m.status, m.sent_to_slack, m.resolved, m.created_at, m.mode, m.stuck_minutes,
      COALESCE(GROUP_CONCAT(t.name, ' '), '') AS tags
    FROM memos m
    LEFT JOIN memo_tags mt ON mt.memo_id = m.id
    LEFT JOIN tags t ON t.id = mt.tag_id
    ${whereSql}
    GROUP BY m.id
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<{
    id: number;
    content: string;
    status: string | null;
    sent_to_slack: number;
    resolved: number;
    created_at: string;
    mode: string;
    stuck_minutes: number;
    tags: string;
  }>;

  res.status(200).json({
    memos: rows.map((row) => ({
      ...row,
      tags: row.tags ? row.tags.split(' ').filter(Boolean) : [],
    })),
  });
});

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

  const memo = db.prepare(`
    SELECT id, resolved, created_at
    FROM memos
    WHERE id = ?
  `).get(id) as { id: number; resolved: number; created_at: string } | undefined;

  if (!memo) {
    res.status(404).json({ error: 'Memo not found' });
    return;
  }

  const nextResolved = resolved ? 1 : 0;
  db.prepare('UPDATE memos SET resolved = ?, updated_at = ? WHERE id = ?').run(
    nextResolved,
    new Date().toISOString(),
    id,
  );

  if (memo.resolved !== nextResolved) {
    const delta = nextResolved === 1 ? 1 : -1;
    updateDailyStats(toJstDateString(memo.created_at), 0, 0, delta);
    feedCharacter(nextResolved === 1 ? 2 : 0);
  }

  res.status(200).json({ id, resolved: nextResolved });
});

router.post('/:id/tags', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid memo id' });
    return;
  }

  const memo = db.prepare('SELECT id, content FROM memos WHERE id = ?').get(id) as
    | { id: number; content: string }
    | undefined;
  if (!memo) {
    res.status(404).json({ error: 'Memo not found' });
    return;
  }

  const { tags } = req.body as { tags?: unknown };
  const normalizedTags = collectTags(memo.content, tags);
  syncMemoTags(id, normalizedTags);
  feedCharacter(1 + normalizedTags.length);

  res.status(200).json({ id, tags: normalizedTags });
});

export default router;
