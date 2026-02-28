import type { CharacterSVGProps } from "./CharacterStage";

/* パターン1: ノーマルたまご（ひび入り） */
function EggV1() {
  return (
    <>
      <rect x={7} y={2} width={2} height={1} fill="var(--px-egg-light)" />
      <rect x={6} y={3} width={4} height={1} fill="var(--px-egg-light)" />
      <rect x={5} y={4} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={6} y={4} width={4} height={1} fill="var(--px-egg-base)" />
      <rect x={10} y={4} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={5} y={5} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={6} y={5} width={4} height={1} fill="var(--px-egg-base)" />
      <rect x={10} y={5} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={4} y={6} width={1} height={1} fill="var(--px-egg-light)" />
      <rect x={5} y={6} width={6} height={1} fill="var(--px-egg-base)" />
      <rect x={11} y={6} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={4} y={7} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={7} width={6} height={1} fill="var(--px-egg-base)" />
      <rect x={11} y={7} width={1} height={1} fill="var(--px-egg-shadow)" />
      <rect x={4} y={8} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={8} width={2} height={1} fill="var(--px-egg-base)" />
      <rect x={7} y={8} width={1} height={1} fill="var(--px-egg-crack)" />
      <rect x={8} y={8} width={3} height={1} fill="var(--px-egg-base)" />
      <rect x={11} y={8} width={1} height={1} fill="var(--px-egg-shadow)" />
      <rect x={4} y={9} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={9} width={3} height={1} fill="var(--px-egg-base)" />
      <rect x={8} y={9} width={1} height={1} fill="var(--px-egg-crack)" />
      <rect x={9} y={9} width={2} height={1} fill="var(--px-egg-shadow)" />
      <rect x={11} y={9} width={1} height={1} fill="var(--px-egg-shadow)" />
      <rect x={4} y={10} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={5} y={10} width={6} height={1} fill="var(--px-egg-shadow)" />
      <rect x={11} y={10} width={1} height={1} fill="var(--px-egg-shadow)" />
      <rect x={5} y={11} width={1} height={1} fill="var(--px-egg-base)" />
      <rect x={6} y={11} width={4} height={1} fill="var(--px-egg-shadow)" />
      <rect x={10} y={11} width={1} height={1} fill="var(--px-egg-shadow)" />
      <rect x={5} y={12} width={6} height={1} fill="var(--px-egg-shadow)" />
      <rect x={6} y={13} width={4} height={1} fill="var(--px-egg-shadow)" />
    </>
  );
}

/* パターン2: 水玉模様たまご */
function EggV2() {
  return (
    <>
      <rect x={7} y={2} width={2} height={1} fill="#E8F5E9" />
      <rect x={6} y={3} width={4} height={1} fill="#E8F5E9" />
      <rect x={5} y={4} width={1} height={1} fill="#E8F5E9" />
      <rect x={6} y={4} width={1} height={1} fill="#A5D6A7" />
      <rect x={7} y={4} width={2} height={1} fill="#C8E6C9" />
      <rect x={9} y={4} width={1} height={1} fill="#A5D6A7" />
      <rect x={10} y={4} width={1} height={1} fill="#E8F5E9" />
      <rect x={5} y={5} width={1} height={1} fill="#C8E6C9" />
      <rect x={6} y={5} width={4} height={1} fill="#C8E6C9" />
      <rect x={10} y={5} width={1} height={1} fill="#C8E6C9" />
      <rect x={4} y={6} width={1} height={1} fill="#E8F5E9" />
      <rect x={5} y={6} width={1} height={1} fill="#C8E6C9" />
      <rect x={6} y={6} width={1} height={1} fill="#FFF9C4" />
      <rect x={7} y={6} width={2} height={1} fill="#C8E6C9" />
      <rect x={9} y={6} width={1} height={1} fill="#FFF9C4" />
      <rect x={10} y={6} width={1} height={1} fill="#C8E6C9" />
      <rect x={11} y={6} width={1} height={1} fill="#C8E6C9" />
      <rect x={4} y={7} width={1} height={1} fill="#C8E6C9" />
      <rect x={5} y={7} width={6} height={1} fill="#C8E6C9" />
      <rect x={11} y={7} width={1} height={1} fill="#A5D6A7" />
      <rect x={4} y={8} width={1} height={1} fill="#C8E6C9" />
      <rect x={5} y={8} width={2} height={1} fill="#C8E6C9" />
      <rect x={7} y={8} width={1} height={1} fill="#FFF9C4" />
      <rect x={8} y={8} width={3} height={1} fill="#C8E6C9" />
      <rect x={11} y={8} width={1} height={1} fill="#A5D6A7" />
      <rect x={4} y={9} width={1} height={1} fill="#C8E6C9" />
      <rect x={5} y={9} width={1} height={1} fill="#FFF9C4" />
      <rect x={6} y={9} width={4} height={1} fill="#A5D6A7" />
      <rect x={10} y={9} width={1} height={1} fill="#FFF9C4" />
      <rect x={11} y={9} width={1} height={1} fill="#A5D6A7" />
      <rect x={4} y={10} width={1} height={1} fill="#A5D6A7" />
      <rect x={5} y={10} width={6} height={1} fill="#A5D6A7" />
      <rect x={11} y={10} width={1} height={1} fill="#81C784" />
      <rect x={5} y={11} width={6} height={1} fill="#A5D6A7" />
      <rect x={5} y={12} width={6} height={1} fill="#81C784" />
      <rect x={6} y={13} width={4} height={1} fill="#81C784" />
    </>
  );
}

/* パターン3: ピンクストライプたまご */
function EggV3() {
  return (
    <>
      <rect x={7} y={2} width={2} height={1} fill="#FCE4EC" />
      <rect x={6} y={3} width={4} height={1} fill="#FCE4EC" />
      <rect x={5} y={4} width={1} height={1} fill="#FCE4EC" />
      <rect x={6} y={4} width={4} height={1} fill="#F8BBD0" />
      <rect x={10} y={4} width={1} height={1} fill="#FCE4EC" />
      <rect x={5} y={5} width={1} height={1} fill="#F8BBD0" />
      <rect x={6} y={5} width={4} height={1} fill="#FCE4EC" />
      <rect x={10} y={5} width={1} height={1} fill="#F8BBD0" />
      <rect x={4} y={6} width={1} height={1} fill="#FCE4EC" />
      <rect x={5} y={6} width={6} height={1} fill="#F48FB1" />
      <rect x={11} y={6} width={1} height={1} fill="#FCE4EC" />
      <rect x={4} y={7} width={1} height={1} fill="#F8BBD0" />
      <rect x={5} y={7} width={6} height={1} fill="#FCE4EC" />
      <rect x={11} y={7} width={1} height={1} fill="#F8BBD0" />
      <rect x={4} y={8} width={1} height={1} fill="#F8BBD0" />
      <rect x={5} y={8} width={6} height={1} fill="#F48FB1" />
      <rect x={11} y={8} width={1} height={1} fill="#F48FB1" />
      <rect x={4} y={9} width={1} height={1} fill="#F48FB1" />
      <rect x={5} y={9} width={6} height={1} fill="#FCE4EC" />
      <rect x={11} y={9} width={1} height={1} fill="#F48FB1" />
      <rect x={4} y={10} width={1} height={1} fill="#F48FB1" />
      <rect x={5} y={10} width={6} height={1} fill="#F48FB1" />
      <rect x={11} y={10} width={1} height={1} fill="#EC407A" />
      <rect x={3} y={7} width={1} height={1} fill="#E91E63" />
      <rect x={12} y={7} width={1} height={1} fill="#E91E63" />
      <rect x={5} y={11} width={6} height={1} fill="#F48FB1" />
      <rect x={5} y={12} width={6} height={1} fill="#EC407A" />
      <rect x={6} y={13} width={4} height={1} fill="#EC407A" />
    </>
  );
}

export function EggSVG({ size = 44, className, variant = 1 }: CharacterSVGProps) {
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
      {variant === 1 && <EggV1 />}
      {variant === 2 && <EggV2 />}
      {variant === 3 && <EggV3 />}
    </svg>
  );
}
