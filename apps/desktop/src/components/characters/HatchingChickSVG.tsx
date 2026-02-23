import type { CharacterSVGProps } from "./CharacterStage";

export function HatchingChickSVG({ size = 44, className }: CharacterSVGProps) {
  return (
    <svg
      className={`character-svg hatching-svg ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label="孵化中のひよこ"
      role="img"
    >
      {/* --- ひよこ頭部 --- */}
      {/* Row 2 */}
      <rect x={7} y={2} width={2} height={1} fill="var(--px-chick-light)" />

      {/* Row 3 */}
      <rect x={6} y={3} width={4} height={1} fill="var(--px-chick-light)" />

      {/* Row 4 - 目のある行 */}
      <rect x={5} y={4} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={8} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-chick-light)" />

      {/* Row 5 - くちばし */}
      <rect x={5} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={5} width={2} height={1} fill="var(--px-beak)" />
      <rect x={9} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={5} width={1} height={1} fill="var(--px-chick-base)" />

      {/* Row 6 - 頭下部 + ほっぺ */}
      <rect x={6} y={6} width={1} height={1} fill="var(--px-blush)" />
      <rect x={7} y={6} width={2} height={1} fill="var(--px-chick-base)" />
      <rect x={9} y={6} width={1} height={1} fill="var(--px-blush)" />

      {/* --- たまご殻（下半分・ギザギザ） --- */}
      {/* Row 7 - ギザギザ上端 */}
      <rect x={4} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={6} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={8} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={10} y={7} width={1} height={1} fill="var(--px-shell-top)" />

      {/* Row 8 */}
      <rect x={3} y={8} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={4} y={8} width={8} height={1} fill="var(--px-shell-top)" />
      <rect x={12} y={8} width={1} height={1} fill="var(--px-shell-top)" />

      {/* Row 9 */}
      <rect x={3} y={9} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={4} y={9} width={8} height={1} fill="var(--px-shell-shadow)" />
      <rect x={12} y={9} width={1} height={1} fill="var(--px-shell-shadow)" />

      {/* Row 10 */}
      <rect x={3} y={10} width={1} height={1} fill="var(--px-shell-shadow)" />
      <rect x={4} y={10} width={8} height={1} fill="var(--px-shell-shadow)" />
      <rect x={12} y={10} width={1} height={1} fill="var(--px-shell-shadow)" />

      {/* Row 11 */}
      <rect x={4} y={11} width={8} height={1} fill="var(--px-shell-shadow)" />

      {/* Row 12 */}
      <rect x={5} y={12} width={6} height={1} fill="var(--px-shell-shadow)" />
    </svg>
  );
}
