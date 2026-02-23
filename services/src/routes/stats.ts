import { Router, Request, Response } from 'express';
import db from '../db/client';

const router = Router();

function parseDays(raw: unknown, defaultValue: number, maxValue: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return defaultValue;
  return Math.min(Math.max(Math.floor(value), 1), maxValue);
}

function buildDateRange(fromRaw: unknown, toRaw: unknown): { from: string; to: string } {
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const from = typeof fromRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : '';
  const to = typeof toRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : nowJst;
  const safeFrom = from || new Date((new Date(to).getTime()) - 119 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  return safeFrom <= to ? { from: safeFrom, to } : { from: to, to: safeFrom };
}

function backfillDailyStatsFromMemos(): void {
  db.exec(`
    INSERT INTO daily_stats (date_jst, memo_count, stuck_count, resolved_count, updated_at)
    SELECT
      date(datetime(created_at, '+9 hours')) AS date_jst,
      COUNT(*) AS memo_count,
      SUM(CASE WHEN status = '詰まり' THEN 1 ELSE 0 END) AS stuck_count,
      SUM(resolved) AS resolved_count,
      strftime('%Y-%m-%dT%H:%M:%SZ', 'now') AS updated_at
    FROM memos
    GROUP BY date(datetime(created_at, '+9 hours'))
    ON CONFLICT(date_jst) DO UPDATE SET
      memo_count = excluded.memo_count,
      stuck_count = excluded.stuck_count,
      resolved_count = excluded.resolved_count,
      updated_at = excluded.updated_at;
  `);
}

router.get('/daily', (req: Request, res: Response) => {
  const days = parseDays(req.query.days, 90, 365);
  const offsetDays = -(days - 1);

  const rows = db.prepare(`
    SELECT
      date(datetime(created_at, '+9 hours')) AS date,
      COUNT(*) AS total,
      SUM(CASE WHEN status = '詰まり' THEN 1 ELSE 0 END) AS stuck,
      SUM(resolved) AS resolved
    FROM memos
    WHERE date(datetime(created_at, '+9 hours')) >= date('now', '+9 hours', ? || ' days')
    GROUP BY date(datetime(created_at, '+9 hours'))
    ORDER BY date ASC
  `).all(offsetDays) as { date: string; total: number; stuck: number; resolved: number }[];

  res.status(200).json({ daily: rows });
});

router.get('/summary', (_req: Request, res: Response) => {
  const thisWeek = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = '詰まり' THEN 1 ELSE 0 END) AS stuck,
      SUM(resolved) AS resolved
    FROM memos
    WHERE date(datetime(created_at, '+9 hours')) >= date('now', '+9 hours', '-6 days')
  `).get() as { total: number | null; stuck: number | null; resolved: number | null };

  const topStuckRow = db.prepare(`
    SELECT content, created_at
    FROM memos
    WHERE status = '詰まり'
      AND date(datetime(created_at, '+9 hours')) >= date('now', '+9 hours', '-6 days')
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as { content: string; created_at: string } | undefined;

  res.status(200).json({
    week: {
      total: thisWeek.total ?? 0,
      stuck: thisWeek.stuck ?? 0,
      resolved: thisWeek.resolved ?? 0,
      top_stuck: topStuckRow ?? null,
    },
  });
});

router.get('/contributions', (req: Request, res: Response) => {
  const { from, to } = buildDateRange(req.query.from, req.query.to);
  let rows = db.prepare(`
    SELECT
      date_jst AS date,
      memo_count AS total,
      stuck_count AS stuck,
      resolved_count AS resolved
    FROM daily_stats
    WHERE date_jst BETWEEN ? AND ?
    ORDER BY date_jst ASC
  `).all(from, to) as Array<{ date: string; total: number; stuck: number; resolved: number }>;

  if (rows.length === 0) {
    const memoCount = db.prepare('SELECT COUNT(*) AS count FROM memos').get() as { count: number };
    if (memoCount.count > 0) {
      backfillDailyStatsFromMemos();
      rows = db.prepare(`
        SELECT
          date_jst AS date,
          memo_count AS total,
          stuck_count AS stuck,
          resolved_count AS resolved
        FROM daily_stats
        WHERE date_jst BETWEEN ? AND ?
        ORDER BY date_jst ASC
      `).all(from, to) as Array<{ date: string; total: number; stuck: number; resolved: number }>;
    }
  }

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const result: Array<{
    date: string;
    total: number;
    stuck: number;
    resolved: number;
    intensity: 0 | 1 | 2 | 3 | 4;
    condition: 'normal' | 'stuck';
  }> = [];

  const current = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const row = byDate.get(date) ?? { date, total: 0, stuck: 0, resolved: 0 };
    const intensity = row.total >= 8 ? 4 : row.total >= 5 ? 3 : row.total >= 3 ? 2 : row.total >= 1 ? 1 : 0;
    result.push({
      ...row,
      intensity,
      condition: row.stuck > 0 ? 'stuck' : 'normal',
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  res.status(200).json({
    from,
    to,
    contributions: result,
  });
});

export default router;
