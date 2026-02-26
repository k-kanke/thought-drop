import { Router, Request, Response } from 'express';
import { feedCharacter, getCharacterState, setCharacterEvolution } from '../services/character';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(getCharacterState());
});

router.post('/feed', (req: Request, res: Response) => {
  const body = req.body as { points?: unknown };
  const rawPoints = typeof body.points === 'number' && Number.isFinite(body.points) ? body.points : 3;
  res.status(200).json(feedCharacter(rawPoints));
});

router.post('/evolve', (req: Request, res: Response) => {
  const body = req.body as { path?: unknown };
  const path = typeof body.path === 'string' ? body.path.trim().toLowerCase() : '';
  const allowed = new Set(['generalist', 'backend', 'infrastructure', 'frontend']);
  if (!allowed.has(path)) {
    res.status(400).json({ error: 'path must be one of generalist/backend/infrastructure/frontend' });
    return;
  }

  res.status(200).json(setCharacterEvolution(path));
});

export default router;
