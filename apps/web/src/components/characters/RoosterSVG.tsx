import type { CharacterSVGProps } from "./CharacterStage";

/* パターン1: ノーマルにわとり（赤とさか + カラフル尾羽） */
function RoosterV1() {
  return (
    <>
      <rect x={7} y={0} width={1} height={1} fill="var(--px-comb)" />
      <rect x={9} y={0} width={1} height={1} fill="var(--px-comb)" />
      <rect x={6} y={1} width={1} height={1} fill="var(--px-comb)" />
      <rect x={7} y={1} width={1} height={1} fill="var(--px-comb-shadow)" />
      <rect x={8} y={1} width={1} height={1} fill="var(--px-comb)" />
      <rect x={9} y={1} width={1} height={1} fill="var(--px-comb-shadow)" />
      <rect x={6} y={2} width={5} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={3} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={3} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={3} width={1} height={1} fill="var(--px-eye-highlight)" />
      <rect className="eye" x={7} y={3} width={1} height={1} fill="var(--px-eye)" opacity={0.85} />
      <rect x={8} y={3} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={9} y={3} width={1} height={1} fill="var(--px-eye-highlight)" />
      <rect className="eye eye-pair-right" x={9} y={3} width={1} height={1} fill="var(--px-eye)" opacity={0.85} />
      <rect x={10} y={3} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={4} width={1} height={1} fill="var(--px-beak)" />
      <rect x={8} y={4} width={1} height={1} fill="var(--px-beak-shadow)" />
      <rect x={9} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={4} width={1} height={1} fill="var(--px-beak)" />
      <rect x={4} y={5} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={5} width={6} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="wing" x={3} y={6} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={4} y={6} width={7} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={6} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={6} width={1} height={1} fill="var(--px-tail-1)" />
      <rect className="wing" x={3} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={4} y={7} width={7} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={7} width={1} height={1} fill="var(--px-tail-2)" />
      <rect x={13} y={7} width={1} height={1} fill="var(--px-tail-1)" />
      <rect x={4} y={8} width={7} height={1} fill="var(--px-chick-base)" />
      <rect x={11} y={8} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={8} width={1} height={1} fill="var(--px-tail-3)" />
      <rect x={13} y={8} width={1} height={1} fill="var(--px-tail-2)" />
      <rect x={4} y={9} width={7} height={1} fill="var(--px-chick-shadow)" />
      <rect x={11} y={9} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={12} y={9} width={1} height={1} fill="var(--px-tail-1)" />
      <rect x={5} y={10} width={6} height={1} fill="var(--px-chick-shadow)" />
      <rect x={6} y={11} width={1} height={1} fill="var(--px-feet)" />
      <rect x={9} y={11} width={1} height={1} fill="var(--px-feet)" />
      <rect x={5} y={12} width={2} height={1} fill="var(--px-feet)" />
      <rect x={9} y={12} width={2} height={1} fill="var(--px-feet)" />
    </>
  );
}

/* パターン2: 王冠にわとり（ゴールド系） */
function RoosterV2() {
  return (
    <>
      <rect x={6} y={0} width={1} height={1} fill="#FDD835" />
      <rect x={8} y={0} width={1} height={1} fill="#FDD835" />
      <rect x={10} y={0} width={1} height={1} fill="#FDD835" />
      <rect x={6} y={1} width={5} height={1} fill="#FFB300" />
      <rect x={7} y={0} width={1} height={1} fill="#FFB300" />
      <rect x={9} y={0} width={1} height={1} fill="#FFB300" />
      <rect x={8} y={1} width={1} height={1} fill="#E53935" />
      <rect x={6} y={2} width={5} height={1} fill="#FFF9C4" />
      <rect x={5} y={3} width={1} height={1} fill="#FFF9C4" />
      <rect x={6} y={3} width={1} height={1} fill="#FFD54F" />
      <rect className="eye" x={7} y={3} width={1} height={1} fill="#212121" />
      <rect x={8} y={3} width={1} height={1} fill="#FFD54F" />
      <rect className="eye eye-pair-right" x={9} y={3} width={1} height={1} fill="#212121" />
      <rect x={10} y={3} width={1} height={1} fill="#FFF9C4" />
      <rect x={5} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={6} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={7} y={4} width={1} height={1} fill="#FF8F00" />
      <rect x={8} y={4} width={1} height={1} fill="#E65100" />
      <rect x={9} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={10} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={11} y={4} width={1} height={1} fill="#FF8F00" />
      <rect x={4} y={5} width={1} height={1} fill="#FFFDE7" />
      <rect x={5} y={5} width={6} height={1} fill="#FFF9C4" />
      <rect x={11} y={5} width={1} height={1} fill="#FFF9C4" />
      <rect className="wing" x={3} y={6} width={1} height={1} fill="#FFB300" />
      <rect x={4} y={6} width={7} height={1} fill="#FFF9C4" />
      <rect x={11} y={6} width={1} height={1} fill="#FFD54F" />
      <rect x={12} y={6} width={1} height={1} fill="#FFB300" />
      <rect className="wing" x={3} y={7} width={1} height={1} fill="#FFB300" />
      <rect x={4} y={7} width={7} height={1} fill="#FFF9C4" />
      <rect x={11} y={7} width={1} height={1} fill="#FFD54F" />
      <rect x={12} y={7} width={1} height={1} fill="#FDD835" />
      <rect x={13} y={7} width={1} height={1} fill="#FFB300" />
      <rect x={4} y={8} width={7} height={1} fill="#FFD54F" />
      <rect x={11} y={8} width={1} height={1} fill="#FFB300" />
      <rect x={12} y={8} width={1} height={1} fill="#FF8F00" />
      <rect x={13} y={8} width={1} height={1} fill="#FDD835" />
      <rect x={4} y={9} width={7} height={1} fill="#FFB300" />
      <rect x={11} y={9} width={1} height={1} fill="#FFB300" />
      <rect x={12} y={9} width={1} height={1} fill="#FDD835" />
      <rect x={5} y={10} width={6} height={1} fill="#FFB300" />
      <rect x={6} y={11} width={1} height={1} fill="#FF8F00" />
      <rect x={9} y={11} width={1} height={1} fill="#FF8F00" />
      <rect x={5} y={12} width={2} height={1} fill="#FF8F00" />
      <rect x={9} y={12} width={2} height={1} fill="#FF8F00" />
    </>
  );
}

/* パターン3: 忍者にわとり（黒装束 + 赤スカーフ） */
function RoosterV3() {
  return (
    <>
      <rect x={6} y={0} width={5} height={1} fill="#37474F" />
      <rect x={5} y={1} width={7} height={1} fill="#455A64" />
      <rect x={5} y={2} width={1} height={1} fill="#455A64" />
      <rect x={6} y={2} width={5} height={1} fill="#FFD54F" />
      <rect x={11} y={2} width={1} height={1} fill="#455A64" />
      <rect x={5} y={3} width={1} height={1} fill="#FFD54F" />
      <rect x={6} y={3} width={1} height={1} fill="#FFD54F" />
      <rect className="eye" x={7} y={3} width={1} height={1} fill="#F44336" />
      <rect x={8} y={3} width={1} height={1} fill="#FFD54F" />
      <rect className="eye eye-pair-right" x={9} y={3} width={1} height={1} fill="#F44336" />
      <rect x={10} y={3} width={1} height={1} fill="#FFD54F" />
      <rect x={5} y={4} width={1} height={1} fill="#455A64" />
      <rect x={6} y={4} width={1} height={1} fill="#455A64" />
      <rect x={7} y={4} width={1} height={1} fill="#FF8F00" />
      <rect x={8} y={4} width={1} height={1} fill="#E65100" />
      <rect x={9} y={4} width={1} height={1} fill="#455A64" />
      <rect x={10} y={4} width={1} height={1} fill="#455A64" />
      <rect x={4} y={5} width={1} height={1} fill="#E53935" />
      <rect x={5} y={5} width={6} height={1} fill="#E53935" />
      <rect x={11} y={5} width={1} height={1} fill="#E53935" />
      <rect x={3} y={6} width={1} height={1} fill="#C62828" />
      <rect className="wing" x={3} y={6} width={1} height={1} fill="#37474F" />
      <rect x={4} y={6} width={7} height={1} fill="#455A64" />
      <rect x={11} y={6} width={1} height={1} fill="#37474F" />
      <rect className="wing" x={3} y={7} width={1} height={1} fill="#37474F" />
      <rect x={4} y={7} width={7} height={1} fill="#546E7A" />
      <rect x={11} y={7} width={1} height={1} fill="#37474F" />
      <rect x={12} y={6} width={1} height={1} fill="#B0BEC5" />
      <rect x={13} y={7} width={1} height={1} fill="#B0BEC5" />
      <rect x={12} y={7} width={1} height={1} fill="#78909C" />
      <rect x={12} y={8} width={1} height={1} fill="#B0BEC5" />
      <rect x={4} y={8} width={7} height={1} fill="#455A64" />
      <rect x={11} y={8} width={1} height={1} fill="#37474F" />
      <rect x={4} y={9} width={7} height={1} fill="#37474F" />
      <rect x={11} y={9} width={1} height={1} fill="#263238" />
      <rect x={5} y={10} width={6} height={1} fill="#263238" />
      <rect x={6} y={11} width={1} height={1} fill="#FF8F00" />
      <rect x={9} y={11} width={1} height={1} fill="#FF8F00" />
      <rect x={5} y={12} width={2} height={1} fill="#FF8F00" />
      <rect x={9} y={12} width={2} height={1} fill="#FF8F00" />
    </>
  );
}

export function RoosterSVG({ size = 44, className, variant = 1 }: CharacterSVGProps) {
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
      {variant === 1 && <RoosterV1 />}
      {variant === 2 && <RoosterV2 />}
      {variant === 3 && <RoosterV3 />}
    </svg>
  );
}
