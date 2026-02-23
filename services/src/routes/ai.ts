import { Router, Request, Response } from 'express';
import db from '../db/client';

const router = Router();

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  return value;
}

function formatJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16);
}

router.post('/blog-draft', (req: Request, res: Response) => {
  const body = req.body as {
    from?: unknown;
    to?: unknown;
    tag?: unknown;
    mode?: unknown;
    title?: unknown;
  };
  const from = normalizeDate(body.from);
  const to = normalizeDate(body.to);
  if (!from || !to || from > to) {
    res.status(400).json({ error: 'from/to must be valid dates and from <= to' });
    return;
  }

  const tag = typeof body.tag === 'string' ? body.tag.trim().replace(/^#/, '').toLowerCase() : '';
  const mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '技術ログ振り返り';

  const whereClauses = [
    "date(datetime(m.created_at, '+9 hours')) BETWEEN ? AND ?",
  ];
  const params: (string | number)[] = [from, to];

  if (mode) {
    whereClauses.push('m.mode = ?');
    params.push(mode);
  }
  if (tag) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM memo_tags mt
        INNER JOIN tags t ON t.id = mt.tag_id
        WHERE mt.memo_id = m.id AND t.name = ?
      )
    `);
    params.push(tag);
  }

  const memos = db.prepare(`
    SELECT m.id, m.content, m.status, m.created_at, m.mode, m.stuck_minutes
    FROM memos m
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY m.created_at ASC
    LIMIT 200
  `).all(...params) as Array<{
    id: number;
    content: string;
    status: string | null;
    created_at: string;
    mode: string;
    stuck_minutes: number;
  }>;

  if (memos.length === 0) {
    res.status(200).json({
      title,
      range: { from, to },
      draft: `# ${title}\n\n対象期間のログがないため下書きを生成できませんでした。`,
      sections: [],
    });
    return;
  }

  const intro = `対象期間（${from} 〜 ${to}）で${memos.length}件のログを振り返りました。`;
  const stuckItems = memos.filter((memo) => memo.status === '詰まり');
  const solvedItems = memos.filter((memo) => memo.status !== '詰まり');

  const topProblems = stuckItems.slice(0, 5).map((memo) => `- ${memo.content}`);
  const solutions = solvedItems.slice(-5).map((memo) => `- ${memo.content}`);
  const timeline = memos.slice(0, 10).map((memo) => `- ${formatJst(memo.created_at)}: ${memo.content}`);

  const sections = [
    { title: '導入', body: intro },
    {
      title: '課題',
      body: topProblems.length > 0
        ? `特に詰まりが多かった論点:\n${topProblems.join('\n')}`
        : '期間内で大きな詰まりは発生しませんでした。',
    },
    {
      title: '解決策',
      body: solutions.length > 0
        ? `解決に向けて実施したこと:\n${solutions.join('\n')}`
        : '解決策として整理できるログが不足しています。',
    },
    {
      title: 'まとめ',
      body: `次回に向けて、以下の論点を継続監視します。\n${timeline.join('\n')}`,
    },
  ];

  const draft = [
    `# ${title}`,
    '',
    `## 導入`,
    sections[0].body,
    '',
    `## 課題`,
    sections[1].body,
    '',
    `## 解決策`,
    sections[2].body,
    '',
    `## まとめ`,
    sections[3].body,
  ].join('\n');

  res.status(200).json({
    title,
    range: { from, to },
    count: memos.length,
    draft,
    sections,
  });
});

export default router;
