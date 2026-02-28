type CharacterStageId = "egg" | "hatching" | "chick" | "rooster";

const CHARACTER_STAGES: { threshold: number; id: CharacterStageId; label: string }[] = [
  { threshold: 90, id: "rooster", label: "🐔" },
  { threshold: 30, id: "chick",   label: "🐥" },
  { threshold: 15, id: "hatching", label: "🐣" },
  { threshold: 0,  id: "egg",     label: "🥚" },
];

export function getCharacterStageId(points: number): CharacterStageId {
  return CHARACTER_STAGES.find((s) => points >= s.threshold)?.id ?? "egg";
}

export function getCharacterEmoji(points: number): string {
  return CHARACTER_STAGES.find((s) => points >= s.threshold)?.label ?? "🥚";
}
