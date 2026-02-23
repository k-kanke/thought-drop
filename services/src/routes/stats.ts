import { Router, Request, Response } from 'express';
import db from '../db/client';

const router = Router();

// GET /api/stats/daily - 日別集計（草グラフ用）
// ?days=N で過去N日分を返す（デフォルト90日）
router.get('/daily', (_req: Request, res: Response) => {
  const rawDays = Number(_req.query.days);
  const days = Number.isFinite(rawDays)
    ? Math.min(Math.max(Math.floor(rawDays), 1), 365)
    : 90;
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

// GET /api/stats/summary - 週次サマリー（Insight Card用）
router.get('/summary', (_req: Request, res: Response) => {
  const thisWeek = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = '詰まり' THEN 1 ELSE 0 END) AS stuck,
      SUM(resolved) AS resolved
    FROM memos
    WHERE date(datetime(created_at, '+9 hours')) >= date('now', '+9 hours', '-6 days')
  `).get() as { total: number; stuck: number; resolved: number };

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
      total: thisWeek.total,
      stuck: thisWeek.stuck,
      resolved: thisWeek.resolved,
      top_stuck: topStuckRow ?? null,
    },
  });
});

export default router;
