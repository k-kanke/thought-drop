import { Router, Request, Response } from 'express';
import db from '../db/client';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const tags = db.prepare(`
    SELECT
      t.id,
      t.name,
      COUNT(mt.memo_id) AS usage_count
    FROM tags t
    LEFT JOIN memo_tags mt ON mt.tag_id = t.id
    GROUP BY t.id
    ORDER BY usage_count DESC, t.name ASC
  `).all() as Array<{ id: number; name: string; usage_count: number }>;

  res.status(200).json({ tags });
});

export default router;
