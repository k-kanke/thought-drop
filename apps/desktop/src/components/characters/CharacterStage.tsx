import { EggSVG } from "./EggSVG";
import { HatchingChickSVG } from "./HatchingChickSVG";
import { ChickSVG } from "./ChickSVG";
import { RoosterSVG } from "./RoosterSVG";
import "./characters.css";

export interface CharacterSVGProps {
  size?: number;
  className?: string;
  variant?: 1 | 2 | 3;
}

type CharacterStageId = "egg" | "hatching" | "chick" | "rooster";

export const VARIANT_COUNT = 3;

const CHARACTER_STAGES: { threshold: number; id: CharacterStageId; label: string }[] = [
  { threshold: 30, id: "rooster", label: "🐔" },
  { threshold: 10, id: "chick", label: "🐥" },
  { threshold: 5, id: "hatching", label: "🐣" },
  { threshold: 0, id: "egg", label: "🥚" },
];

const SVG_MAP: Record<CharacterStageId, React.FC<CharacterSVGProps>> = {
  egg: EggSVG,
  hatching: HatchingChickSVG,
  chick: ChickSVG,
  rooster: RoosterSVG,
};

export function getCharacterStageId(count: number): CharacterStageId {
  return CHARACTER_STAGES.find((s) => count >= s.threshold)?.id ?? "egg";
}

export function getCharacterEmoji(count: number): string {
  return CHARACTER_STAGES.find((s) => count >= s.threshold)?.label ?? "🥚";
}

export function CharacterStage({
  count,
  size,
  className,
  variant = 1,
}: { count: number } & CharacterSVGProps) {
  const stageId = getCharacterStageId(count);
  const Component = SVG_MAP[stageId];
  return <Component size={size} className={className} variant={variant} />;
}
