import type { CharacterSVGProps } from "./CharacterStage";

/* パターン1: ノーマルひよこ */
function ChickV1() {
  return (
    <>
      <rect x={7} y={1} width={2} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={2} width={4} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={3} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={3} width={4} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={3} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={8} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={5} y={5} width={1} height={1} fill="var(--px-blush)" />
      <rect x={6} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={5} width={2} height={1} fill="var(--px-beak)" />
      <rect x={9} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={5} width={1} height={1} fill="var(--px-blush)" />
      <rect x={5} y={6} width={6} height={1} fill="var(--px-chick-base)" />
      <rect className="wing" x={4} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={5} y={7} width={6} height={1} fill="var(--px-chick-base)" />
      <rect className="wing" x={11} y={7} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect className="wing" x={4} y={8} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={5} y={8} width={6} height={1} fill="var(--px-chick-base)" />
      <rect className="wing" x={11} y={8} width={1} height={1} fill="var(--px-chick-shadow)" />
      <rect x={5} y={9} width={6} height={1} fill="var(--px-chick-base)" />
      <rect x={5} y={10} width={6} height={1} fill="var(--px-chick-shadow)" />
      <rect x={6} y={11} width={4} height={1} fill="var(--px-chick-shadow)" />
      <rect x={6} y={12} width={1} height={1} fill="var(--px-feet)" />
      <rect x={9} y={12} width={1} height={1} fill="var(--px-feet)" />
      <rect x={5} y={13} width={2} height={1} fill="var(--px-feet)" />
      <rect x={9} y={13} width={2} height={1} fill="var(--px-feet)" />
    </>
  );
}

/* パターン2: おしゃれひよこ（リボン付き） */
function ChickV2() {
  return (
    <>
      {/* リボン */}
      <rect x={5} y={1} width={1} height={1} fill="#E91E63" />
      <rect x={6} y={1} width={1} height={1} fill="#F48FB1" />
      <rect x={7} y={1} width={2} height={1} fill="#FFF9C4" />
      <rect x={6} y={2} width={4} height={1} fill="#FFF9C4" />
      <rect x={5} y={3} width={1} height={1} fill="#FFF9C4" />
      <rect x={6} y={3} width={4} height={1} fill="#FFD54F" />
      <rect x={10} y={3} width={1} height={1} fill="#FFF9C4" />
      {/* 目（まつ毛付き） */}
      <rect x={5} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={6} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="#212121" />
      <rect x={8} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="#212121" />
      <rect x={10} y={4} width={1} height={1} fill="#FFD54F" />
      {/* まつ毛 */}
      <rect x={7} y={3} width={1} height={1} fill="#424242" />
      <rect x={9} y={3} width={1} height={1} fill="#424242" />
      {/* ほっぺ + くちばし */}
      <rect x={5} y={5} width={1} height={1} fill="#FFAB91" />
      <rect x={6} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={7} y={5} width={2} height={1} fill="#FF8F00" />
      <rect x={9} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={10} y={5} width={1} height={1} fill="#FFAB91" />
      {/* 体 */}
      <rect x={5} y={6} width={6} height={1} fill="#FFD54F" />
      <rect className="wing" x={4} y={7} width={1} height={1} fill="#FFB300" />
      <rect x={5} y={7} width={6} height={1} fill="#FFD54F" />
      <rect className="wing" x={11} y={7} width={1} height={1} fill="#FFB300" />
      <rect className="wing" x={4} y={8} width={1} height={1} fill="#FFB300" />
      <rect x={5} y={8} width={6} height={1} fill="#FFD54F" />
      <rect className="wing" x={11} y={8} width={1} height={1} fill="#FFB300" />
      <rect x={5} y={9} width={6} height={1} fill="#FFD54F" />
      <rect x={5} y={10} width={6} height={1} fill="#FFB300" />
      <rect x={6} y={11} width={4} height={1} fill="#FFB300" />
      {/* 足 */}
      <rect x={6} y={12} width={1} height={1} fill="#FF8F00" />
      <rect x={9} y={12} width={1} height={1} fill="#FF8F00" />
      <rect x={5} y={13} width={2} height={1} fill="#FF8F00" />
      <rect x={9} y={13} width={2} height={1} fill="#FF8F00" />
    </>
  );
}

/* パターン3: 冒険ひよこ（バンダナ付き） */
function ChickV3() {
  return (
    <>
      {/* バンダナ */}
      <rect x={6} y={1} width={4} height={1} fill="#1565C0" />
      <rect x={5} y={2} width={1} height={1} fill="#1565C0" />
      <rect x={6} y={2} width={4} height={1} fill="#1E88E5" />
      <rect x={10} y={2} width={1} height={1} fill="#1565C0" />
      <rect x={11} y={2} width={1} height={1} fill="#1565C0" />
      <rect x={12} y={3} width={1} height={1} fill="#1565C0" />
      {/* 頭 */}
      <rect x={5} y={3} width={1} height={1} fill="#FFF9C4" />
      <rect x={6} y={3} width={4} height={1} fill="#FFD54F" />
      <rect x={10} y={3} width={1} height={1} fill="#FFF9C4" />
      {/* 目（きりっとした目） */}
      <rect x={5} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={6} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="#212121" />
      <rect x={8} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="#212121" />
      <rect x={10} y={4} width={1} height={1} fill="#FFD54F" />
      {/* くちばし（にやり） */}
      <rect x={5} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={6} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={7} y={5} width={1} height={1} fill="#FF8F00" />
      <rect x={8} y={5} width={1} height={1} fill="#E65100" />
      <rect x={9} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={10} y={5} width={1} height={1} fill="#FFD54F" />
      {/* 体 */}
      <rect x={5} y={6} width={6} height={1} fill="#FFD54F" />
      <rect className="wing" x={4} y={7} width={1} height={1} fill="#FFB300" />
      <rect x={5} y={7} width={6} height={1} fill="#FFD54F" />
      <rect className="wing" x={11} y={7} width={1} height={1} fill="#FFB300" />
      <rect className="wing" x={4} y={8} width={1} height={1} fill="#FFB300" />
      <rect x={5} y={8} width={6} height={1} fill="#FFD54F" />
      <rect className="wing" x={11} y={8} width={1} height={1} fill="#FFB300" />
      <rect x={5} y={9} width={6} height={1} fill="#FFD54F" />
      <rect x={5} y={10} width={6} height={1} fill="#FFB300" />
      <rect x={6} y={11} width={4} height={1} fill="#FFB300" />
      {/* 足 */}
      <rect x={6} y={12} width={1} height={1} fill="#FF8F00" />
      <rect x={9} y={12} width={1} height={1} fill="#FF8F00" />
      <rect x={5} y={13} width={2} height={1} fill="#FF8F00" />
      <rect x={9} y={13} width={2} height={1} fill="#FF8F00" />
    </>
  );
}

export function ChickSVG({ size = 44, className, variant = 1 }: CharacterSVGProps) {
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
      {variant === 1 && <ChickV1 />}
      {variant === 2 && <ChickV2 />}
      {variant === 3 && <ChickV3 />}
    </svg>
  );
}
