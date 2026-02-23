import type { CharacterSVGProps } from "./CharacterStage";

export function EggSVG({ size = 44, className }: CharacterSVGProps) {
  return (
    <svg
      className={`character-svg egg-svg ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label="たまご"
      role="img"
    >
      {/* --- たまご本体（上部は細く、下部は丸く） --- */}
      {/* Row 2: top */}
      <rect x={7} y={2} width={2} height={1} fill="var(--px-egg-light)" />

      {/* Row 3 */}
      <rect x={6} y={3} width={4} height={1} fill="var(--px-egg-light)" />

      {/* Row 4 */}
      <rect x={5} y={4} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={6} y={4} width={4} height={1} fill="var(--px-egg-base)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-egg-light)" />

      {/* Row 5 */}
      <rect x={5} y={5} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={6} y={5} width={4} height={1} fill="var(--px-egg-base)" />
      <rect x={10} y={5} width={1} height={1} fill="var(--px-egg-base)" />

      {/* Row 6 */}
      <rect x={4} y={6} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={5} y={6} width={6} height={1} fill="var(--px-egg-base)" />
      <rect x={11} y={6} width={1} height={1} fill="var(--px-egg-base)" />

      {/* Row 7 */}
      <rect x={4} y={7} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={7} width={6} height={1} fill="var(--px-egg-base)" />
      <rect x={11} y={7} width={1} height={1} fill="var(--px-egg-shadow)" />

      {/* Row 8 - ひび入り */}
      <rect x={4} y={8} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={8} width={2} height={1} fill="var(--px-egg-base)" />
      <rect x={7} y={8} width={1} height={1} fill="var(--px-egg-crack)" />
      <rect x={8} y={8} width={3} height={1} fill="var(--px-egg-base)" />
      <rect x={11} y={8} width={1} height={1} fill="var(--px-egg-shadow)" />

      {/* Row 9 - ひび */}
      <rect x={4} y={9} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={9} width={3} height={1} fill="var(--px-egg-base)" />
      <rect x={8} y={9} width={1} height={1} fill="var(--px-egg-crack)" />
      <rect x={9} y={9} width={2} height={1} fill="var(--px-egg-shadow)" />
      <rect x={11} y={9} width={1} height={1} fill="var(--px-egg-shadow)" />

      {/* Row 10 */}
      <rect x={4} y={10} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={10} width={6} height={1} fill="var(--px-egg-shadow)" />
      <rect x={11} y={10} width={1} height={1} fill="var(--px-egg-shadow)" />

      {/* Row 11 */}
      <rect x={5} y={11} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={6} y={11} width={4} height={1} fill="var(--px-egg-shadow)" />
      <rect x={10} y={11} width={1} height={1} fill="var(--px-egg-shadow)" />

      {/* Row 12 */}
      <rect x={5} y={12} width={6} height={1} fill="var(--px-egg-shadow)" />

      {/* Row 13: bottom */}
      <rect x={6} y={13} width={4} height={1} fill="var(--px-egg-shadow)" />
    </svg>
  );
}
