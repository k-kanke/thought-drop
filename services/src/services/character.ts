import db from '../db/client';

const MAX_FEED_POINTS = 50;

export type CharacterStateResponse = {
  level: number;
  points: number;
  hunger_score: number;
  evolution_path: string;
  last_fed_at: string;
  updated_at: string;
  hunger_level: number;
  mood: 'hungry' | 'normal' | 'energized';
  items: Array<{
    code: string;
    display_name: string;
    unlocked: boolean;
    unlocked_at: string | null;
  }>;
};

export function getCharacterState(): CharacterStateResponse {
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

export function feedCharacter(pointsDelta: number): CharacterStateResponse {
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

  return getCharacterState();
}

export function setCharacterEvolution(path: string): CharacterStateResponse {
  db.prepare(`
    UPDATE character_state
    SET evolution_path = ?, updated_at = ?
    WHERE id = 1
  `).run(path, new Date().toISOString());

  return getCharacterState();
}
