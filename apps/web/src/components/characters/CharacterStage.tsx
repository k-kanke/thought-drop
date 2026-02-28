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

const CHARACTER_STAGES: { threshold: number; id: CharacterStageId }[] = [
  { threshold: 90, id: "rooster" },
  { threshold: 30, id: "chick" },
  { threshold: 15, id: "hatching" },
  { threshold: 0,  id: "egg" },
];

const SVG_MAP: Record<CharacterStageId, React.FC<CharacterSVGProps>> = {
  egg: EggSVG,
  hatching: HatchingChickSVG,
  chick: ChickSVG,
  rooster: RoosterSVG,
};

export function CharacterStage({
  count,
  size,
  className,
  variant = 1,
  decayLevel = 0,
}: { count: number; decayLevel?: number } & CharacterSVGProps) {
  const baseIndex = CHARACTER_STAGES.findIndex((s) => count >= s.threshold);
  const idx = baseIndex === -1 ? CHARACTER_STAGES.length - 1 : baseIndex;
  const decayedIndex = Math.min(CHARACTER_STAGES.length - 1, idx + decayLevel);
  const stageId = CHARACTER_STAGES[decayedIndex].id;
  const Component = SVG_MAP[stageId];
  return <Component size={size} className={className} variant={variant} />;
}
