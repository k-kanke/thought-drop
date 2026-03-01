/* Simple pixel-art golem (16x16 grid). Scales cleanly with crisp edges. */
export function GolemPixel({ size = 48 }: { size?: number }) {
  // Colors
  const base = "#8aa0a8"; // stone
  const dark = "#586874"; // outline/shadow
  const light = "#cfd8dd"; // highlight

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {/* Outline (dark) */}
      {/* head outline */}
      <rect x="4" y="1" width="8" height="1" fill={dark} />
      <rect x="3" y="2" width="1" height="4" fill={dark} />
      <rect x="12" y="2" width="1" height="4" fill={dark} />
      <rect x="4" y="6" width="8" height="1" fill={dark} />
      {/* body outline */}
      <rect x="3" y="7" width="10" height="1" fill={dark} />
      <rect x="2" y="8" width="1" height="4" fill={dark} />
      <rect x="13" y="8" width="1" height="4" fill={dark} />
      {/* raised arm outlines (hands up) */}
      <rect x="2" y="5" width="1" height="3" fill={dark} />
      <rect x="1" y="5" width="1" height="3" fill={dark} />
      <rect x="1" y="4" width="1" height="1" fill={dark} />
      <rect x="2" y="4" width="1" height="1" fill={dark} />
      <rect x="13" y="5" width="1" height="3" fill={dark} />
      <rect x="14" y="5" width="1" height="3" fill={dark} />
      <rect x="14" y="4" width="1" height="1" fill={dark} />
      <rect x="13" y="4" width="1" height="1" fill={dark} />
      <rect x="3" y="12" width="10" height="1" fill={dark} />
      {/* legs outline */}
      <rect x="4" y="13" width="3" height="1" fill={dark} />
      <rect x="9" y="13" width="3" height="1" fill={dark} />
      <rect x="4" y="14" width="1" height="1" fill={dark} />
      <rect x="6" y="14" width="1" height="1" fill={dark} />
      <rect x="9" y="14" width="1" height="1" fill={dark} />
      <rect x="11" y="14" width="1" height="1" fill={dark} />

      {/* Fill head (base) */}
      <rect x="4" y="2" width="8" height="4" fill={base} />
      {/* Eyes (dark) */}
      <rect x="6" y="3" width="1" height="1" fill={dark} />
      <rect x="9" y="3" width="1" height="1" fill={dark} />
      {/* Head highlight */}
      <rect x="5" y="2" width="1" height="1" fill={light} />
      <rect x="7" y="2" width="1" height="1" fill={light} />

      {/* Torso (base) */}
      <rect x="3" y="8" width="10" height="4" fill={base} />
      {/* Arms (base) */}
      {/* Raised arms (hands up) */}
      <rect x="2" y="5" width="1" height="3" fill={base} />
      <rect x="1" y="5" width="1" height="3" fill={base} />
      <rect x="1" y="4" width="1" height="1" fill={base} />
      <rect x="2" y="4" width="1" height="1" fill={base} />
      <rect x="13" y="5" width="1" height="3" fill={base} />
      <rect x="14" y="5" width="1" height="3" fill={base} />
      <rect x="14" y="4" width="1" height="1" fill={base} />
      <rect x="13" y="4" width="1" height="1" fill={base} />
      {/* Chest highlight */}
      <rect x="5" y="9" width="2" height="1" fill={light} />
      <rect x="8" y="10" width="1" height="1" fill={light} />

      {/* Legs (base) */}
      <rect x="4" y="13" width="3" height="1" fill={base} />
      <rect x="9" y="13" width="3" height="1" fill={base} />
      {/* Feet (light) */}
      <rect x="4" y="14" width="1" height="1" fill={light} />
      <rect x="6" y="14" width="1" height="1" fill={light} />
      <rect x="9" y="14" width="1" height="1" fill={light} />
      <rect x="11" y="14" width="1" height="1" fill={light} />
    </svg>
  )
}
