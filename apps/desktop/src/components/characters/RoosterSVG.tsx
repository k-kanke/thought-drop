import type { CharacterSVGProps } from "./CharacterStage";

export function RoosterSVG({ size = 44, className }: CharacterSVGProps) {
  return (
    <svg
      className={`character-svg rooster-svg ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label="にわとり"
      role="img"
    >
      {/* --- とさか --- */}
      <rect x={7} y={0} width={1} height={1} fill="var(--px-comb)" />
      <rect x={9} y={0} width={1} height={1} fill="var(--px-comb)" />
      <rect x={6} y={1} width={1} height={1} fill="var(--px-comb)" />
      <rect x={7} y={1} width={1} height={1} fill="var(--px-comb-shadow)" />
      <rect x={8} y={1} width={1} height={1} fill="var(--px-comb)" />
      <rect x={9} y={1} width={1} height={1} fill="var(--px-comb-shadow)" />

      {/* --- 頭部 --- */}
      {/* Row 2 */}
      <rect x={6} y={2} width={5} height={1} fill="var(--px-chick-light)" />

      {/* Row 3 - 目 */}
      <rect x={5} y={3} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={3} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={3} width={1} height={1} fill="var(--px-eye-highlight)" />
      <rect className="eye" x={7} y={3} width={1} height={1} fill="var(--px-eye)" opacity={0.85} />
      <rect x={8} y={3} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={9} y={3} width={1} height={1} fill="var(--px-eye-highlight)" />
      <rect className="eye eye-pair-right" x={9} y={3} width={1} height={1} fill="var(--px-eye)" opacity={0.85} />
      <rect x={10} y={3} width={1} height={1} fill="var(--px-chick-light)" />

      {/* Row 4 - くちばし */}
      <rect x={5} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={4} width={1} height={1} fill="var(--px-beak)" />
      <rect x={8} y={4} width={1} height={1} fill="var(--px-beak-shadow)" />
      <rect x={9} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      {/* くちばし先端 */}
      <rect x={11} y={4} width={1} height={1} fill="var(--px-beak)" />

      {/* --- 体 --- */}
      {/* Row 5 */}
      <rect x={4} y={5} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={5} width={6} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={5} width={1} height={1} fill="var(--px-chick-base)" />

      {/* Row 6 - 羽 + 尾羽開始 */}
      <rect className="wing" x={3} y={6} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={4} y={6} width={7} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={6} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={6} width={1} height={1} fill="var(--px-tail-1)" />

      {/* Row 7 - 羽 + 尾羽 */}
      <rect className="wing" x={3} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={4} y={7} width={7} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={7} width={1} height={1} fill="var(--px-tail-2)" />
      <rect x={13} y={7} width={1} height={1} fill="var(--px-tail-1)" />

      {/* Row 8 - 尾羽 */}
      <rect x={4} y={8} width={7} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={8} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={8} width={1} height={1} fill="var(--px-tail-3)" />
      <rect x={13} y={8} width={1} height={1} fill="var(--px-tail-2)" />

      {/* Row 9 */}
      <rect x={4} y={9} width={7} height={1} fill="var(--px-chick-shadow)" />
      <rect x={11} y={9} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={9} width={1} height={1} fill="var(--px-tail-1)" />

      {/* Row 10 */}
      <rect x={5} y={10} width={6} height={1} fill="var(--px-chick-shadow)" />

      {/* --- 足 --- */}
      {/* Row 11 */}
      <rect x={6} y={11} width={1} height={1} fill="var(--px-feet)" />
      <rect x={9} y={11} width={1} height={1} fill="var(--px-feet)" />

      {/* Row 12 */}
      <rect x={5} y={12} width={2} height={1} fill="var(--px-feet)" />
      <rect x={9} y={12} width={2} height={1} fill="var(--px-feet)" />
    </svg>
  );
}
