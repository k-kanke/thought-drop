import { Router, Request, Response } from 'express';
import db from '../db/client';

const router = Router();
const MAX_FEED_POINTS = 50;

function getCharacterState() {
  const state = db.prepare(`
    SELECT level, points, hunger_score, evolution_path, last_fed_at, updated_at
    FROM character_state
    WHERE id = 1
  `).get() as
    | {
        level: number;
        points: number;
        hunger_score: number;
        evolution_path: string;
        last_fed_at: string;
        updated_at: string;
      }
    | undefined;

  if (!state) {
    throw new Error('character_state is not initialized');
  }

  const items = db.prepare(`
    SELECT code, display_name, unlocked, unlocked_at
    FROM character_items
    ORDER BY id ASC
  `).all() as Array<{
    code: string;
    display_name: string;
    unlocked: number;
    unlocked_at: string | null;
  }>;

  const lastFedAtMs = new Date(state.last_fed_at).getTime();
  const elapsedMin = Number.isFinite(lastFedAtMs)
    ? Math.floor((Date.now() - lastFedAtMs) / (60 * 1000))
    : 0;
  const hungerLevel = Math.min(100, Math.max(0, state.hunger_score + Math.floor(elapsedMin / 30)));

  return {
    ...state,
    hunger_level: hungerLevel,
    mood: hungerLevel >= 75 ? 'hungry' : hungerLevel >= 40 ? 'normal' : 'energized',
    items: items.map((item) => ({
      ...item,
      unlocked: item.unlocked === 1,
    })),
  };
}

function updateProgress(pointsDelta: number): void {
  const now = new Date().toISOString();
  const state = db.prepare(`
    SELECT level, points, hunger_score
    FROM character_state
    WHERE id = 1
  `).get() as { level: number; points: number; hunger_score: number };

  const delta = Math.max(0, Math.min(MAX_FEED_POINTS, Math.floor(pointsDelta)));
  const nextPoints = state.points + delta;
  const nextLevel = Math.max(1, Math.floor(nextPoints / 20) + 1);
  const nextHunger = Math.max(0, state.hunger_score - Math.max(1, Math.floor(delta / 2)));

  db.prepare(`
    UPDATE character_state
    SET level = ?, points = ?, hunger_score = ?, last_fed_at = ?, updated_at = ?
    WHERE id = 1
  `).run(nextLevel, nextPoints, nextHunger, now, now);

  const unlockRules = [
    { threshold: 20, code: 'aws-cloud-hat' },
    { threshold: 45, code: 'go-gopher-glasses' },
    { threshold: 80, code: 'terraform-cape' },
  ];
  for (const rule of unlockRules) {
    if (nextPoints >= rule.threshold) {
      db.prepare(`
        UPDATE character_items
        SET unlocked = 1, unlocked_at = COALESCE(unlocked_at, ?)
        WHERE code = ?
      `).run(now, rule.code);
    }
  }
}

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(getCharacterState());
});

router.post('/feed', (req: Request, res: Response) => {
  const body = req.body as { points?: unknown };
  const rawPoints = typeof body.points === 'number' && Number.isFinite(body.points) ? body.points : 3;
  updateProgress(rawPoints);
  res.status(200).json(getCharacterState());
});

router.post('/evolve', (req: Request, res: Response) => {
  const body = req.body as { path?: unknown };
  const path = typeof body.path === 'string' ? body.path.trim().toLowerCase() : '';
  const allowed = new Set(['generalist', 'backend', 'infrastructure', 'frontend']);
  if (!allowed.has(path)) {
    res.status(400).json({ error: 'path must be one of generalist/backend/infrastructure/frontend' });
    return;
  }

  db.prepare(`
    UPDATE character_state
    SET evolution_path = ?, updated_at = ?
    WHERE id = 1
  `).run(path, new Date().toISOString());

  res.status(200).json(getCharacterState());
});

export default router;
