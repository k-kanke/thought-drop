import type { CharacterSVGProps } from "./CharacterStage";

export function ChickSVG({ size = 44, className }: CharacterSVGProps) {
  return (
    <svg
      className={`character-svg chick-svg ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label="ひよこ"
      role="img"
    >
      {/* --- 頭部 --- */}
      {/* Row 1 */}
      <rect x={7} y={1} width={2} height={1} fill="var(--px-chick-light)" />

      {/* Row 2 */}
      <rect x={6} y={2} width={4} height={1} fill="var(--px-chick-light)" />

      {/* Row 3 */}
      <rect x={5} y={3} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={3} width={4} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={3} width={1} height={1} fill="var(--px-chick-light)" />

      {/* Row 4 - 目 */}
      <rect x={5} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={8} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-chick-base)" />

      {/* Row 5 - くちばし + ほっぺ */}
      <rect x={5} y={5} width={1} height={1} fill="var(--px-blush)" />
      <rect x={6} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={5} width={2} height={1} fill="var(--px-beak)" />
      <rect x={9} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={5} width={1} height={1} fill="var(--px-blush)" />

      {/* --- 体 --- */}
      {/* Row 6 */}
      <rect x={5} y={6} width={6} height={1} fill="var(--px-chick-base)" />

      {/* Row 7 - 羽つき */}
      <rect className="wing" x={4} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={5} y={7} width={6} height={1} fill="var(--px-chick-base)" />
      <rect className="wing" x={11} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />

      {/* Row 8 - 羽つき */}
      <rect className="wing" x={4} y={8} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={5} y={8} width={6} height={1} fill="var(--px-chick-base)" />
      <rect className="wing" x={11} y={8} width={1} height={1} fill="var(--px-chick-shadow)" />

      {/* Row 9 */}
      <rect x={5} y={9} width={6} height={1} fill="var(--px-chick-base)" />

      {/* Row 10 */}
      <rect x={5} y={10} width={6} height={1} fill="var(--px-chick-shadow)" />

      {/* Row 11 */}
      <rect x={6} y={11} width={4} height={1} fill="var(--px-chick-shadow)" />

      {/* --- 足 --- */}
      {/* Row 12 */}
      <rect x={6} y={12} width={1} height={1} fill="var(--px-feet)" />
      <rect x={9} y={12} width={1} height={1} fill="var(--px-feet)" />

      {/* Row 13 */}
      <rect x={5} y={13} width={2} height={1} fill="var(--px-feet)" />
      <rect x={9} y={13} width={2} height={1} fill="var(--px-feet)" />
    </svg>
  );
}
