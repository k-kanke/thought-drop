import type { CharacterSVGProps } from "./CharacterStage";

/* パターン1: ノーマル孵化（黄色ひよこ + 白い殻） */
function HatchingV1() {
  return (
    <>
      <rect x={7} y={2} width={2} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={3} width={4} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={4} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={6} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={8} y={4} width={1} height={1} fill="var(--px-chick-base)" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-chick-light)" />
      <rect x={5} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={7} y={5} width={2} height={1} fill="var(--px-beak)" />
      <rect x={9} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={10} y={5} width={1} height={1} fill="var(--px-chick-base)" />
      <rect x={6} y={6} width={1} height={1} fill="var(--px-blush)" />
      <rect x={7} y={6} width={2} height={1} fill="var(--px-chick-base)" />
      <rect x={9} y={6} width={1} height={1} fill="var(--px-blush)" />
      <rect x={4} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={6} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={8} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={10} y={7} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={3} y={8} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={4} y={8} width={8} height={1} fill="var(--px-shell-top)" />
      <rect x={12} y={8} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={3} y={9} width={1} height={1} fill="var(--px-shell-top)" />
      <rect x={4} y={9} width={8} height={1} fill="var(--px-shell-shadow)" />
      <rect x={12} y={9} width={1} height={1} fill="var(--px-shell-shadow)" />
      <rect x={3} y={10} width={1} height={1} fill="var(--px-shell-shadow)" />
      <rect x={4} y={10} width={8} height={1} fill="var(--px-shell-shadow)" />
      <rect x={12} y={10} width={1} height={1} fill="var(--px-shell-shadow)" />
      <rect x={4} y={11} width={8} height={1} fill="var(--px-shell-shadow)" />
      <rect x={5} y={12} width={6} height={1} fill="var(--px-shell-shadow)" />
    </>
  );
}

/* パターン2: 水玉殻から出てくるひよこ（ウインク） */
function HatchingV2() {
  return (
    <>
      <rect x={7} y={2} width={2} height={1} fill="#FFF9C4" />
      <rect x={6} y={3} width={4} height={1} fill="#FFF9C4" />
      <rect x={5} y={4} width={1} height={1} fill="#FFF9C4" />
      <rect x={6} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={8} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={9} y={4} width={1} height={1} fill="#FFD54F" />
      <rect x={10} y={4} width={1} height={1} fill="#FFF9C4" />
      <rect x={5} y={5} width={1} height={1} fill="#FFAB91" />
      <rect x={6} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={7} y={5} width={2} height={1} fill="var(--px-beak)" />
      <rect x={9} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={10} y={5} width={1} height={1} fill="#FFAB91" />
      <rect x={6} y={6} width={4} height={1} fill="#FFD54F" />
      <rect x={4} y={7} width={1} height={1} fill="#E8F5E9" />
      <rect x={6} y={7} width={1} height={1} fill="#E8F5E9" />
      <rect x={9} y={7} width={1} height={1} fill="#E8F5E9" />
      <rect x={11} y={7} width={1} height={1} fill="#E8F5E9" />
      <rect x={3} y={8} width={1} height={1} fill="#C8E6C9" />
      <rect x={4} y={8} width={1} height={1} fill="#E8F5E9" />
      <rect x={5} y={8} width={1} height={1} fill="#A5D6A7" />
      <rect x={6} y={8} width={2} height={1} fill="#E8F5E9" />
      <rect x={8} y={8} width={1} height={1} fill="#A5D6A7" />
      <rect x={9} y={8} width={2} height={1} fill="#E8F5E9" />
      <rect x={11} y={8} width={1} height={1} fill="#A5D6A7" />
      <rect x={12} y={8} width={1} height={1} fill="#C8E6C9" />
      <rect x={3} y={9} width={1} height={1} fill="#A5D6A7" />
      <rect x={4} y={9} width={8} height={1} fill="#C8E6C9" />
      <rect x={12} y={9} width={1} height={1} fill="#A5D6A7" />
      <rect x={3} y={10} width={1} height={1} fill="#81C784" />
      <rect x={4} y={10} width={8} height={1} fill="#A5D6A7" />
      <rect x={12} y={10} width={1} height={1} fill="#81C784" />
      <rect x={4} y={11} width={8} height={1} fill="#81C784" />
      <rect x={5} y={12} width={6} height={1} fill="#81C784" />
    </>
  );
}

/* パターン3: ピンク殻から出るひよこ（ハート付き） */
function HatchingV3() {
  return (
    <>
      <rect x={7} y={2} width={2} height={1} fill="#FFF9C4" />
      <rect x={6} y={3} width={4} height={1} fill="#FFF9C4" />
      <rect x={5} y={4} width={1} height={1} fill="#FFF9C4" />
      <rect x={6} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye" x={7} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={8} y={4} width={1} height={1} fill="#FFD54F" />
      <rect className="eye eye-pair-right" x={9} y={4} width={1} height={1} fill="var(--px-eye)" />
      <rect x={10} y={4} width={1} height={1} fill="#FFF9C4" />
      <rect x={12} y={2} width={1} height={1} fill="#E91E63" />
      <rect x={14} y={2} width={1} height={1} fill="#E91E63" />
      <rect x={12} y={3} width={3} height={1} fill="#F48FB1" />
      <rect x={13} y={4} width={1} height={1} fill="#E91E63" />
      <rect x={5} y={5} width={1} height={1} fill="#FFAB91" />
      <rect x={6} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={7} y={5} width={2} height={1} fill="var(--px-beak)" />
      <rect x={9} y={5} width={1} height={1} fill="#FFD54F" />
      <rect x={10} y={5} width={1} height={1} fill="#FFAB91" />
      <rect x={6} y={6} width={4} height={1} fill="#FFD54F" />
      <rect x={4} y={7} width={1} height={1} fill="#FCE4EC" />
      <rect x={6} y={7} width={1} height={1} fill="#FCE4EC" />
      <rect x={8} y={7} width={1} height={1} fill="#FCE4EC" />
      <rect x={10} y={7} width={1} height={1} fill="#FCE4EC" />
      <rect x={3} y={8} width={1} height={1} fill="#F8BBD0" />
      <rect x={4} y={8} width={8} height={1} fill="#FCE4EC" />
      <rect x={12} y={8} width={1} height={1} fill="#F8BBD0" />
      <rect x={3} y={9} width={1} height={1} fill="#F48FB1" />
      <rect x={4} y={9} width={8} height={1} fill="#F8BBD0" />
      <rect x={12} y={9} width={1} height={1} fill="#F48FB1" />
      <rect x={3} y={10} width={1} height={1} fill="#EC407A" />
      <rect x={4} y={10} width={8} height={1} fill="#F48FB1" />
      <rect x={12} y={10} width={1} height={1} fill="#EC407A" />
      <rect x={4} y={11} width={8} height={1} fill="#EC407A" />
      <rect x={5} y={12} width={6} height={1} fill="#EC407A" />
    </>
  );
}

export function HatchingChickSVG({ size = 44, className, variant = 1 }: CharacterSVGProps) {
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
      {variant === 1 && <HatchingV1 />}
      {variant === 2 && <HatchingV2 />}
      {variant === 3 && <HatchingV3 />}
    </svg>
  );
}
