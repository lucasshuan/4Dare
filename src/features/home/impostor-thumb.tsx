/** A card at the table: the crew's are white with a blue figure, the impostor's pink. */
function Card({
  x,
  tilt,
  odd = false,
}: {
  x: number;
  tilt: number;
  odd?: boolean;
}) {
  const figure = odd ? "#ffd1e6" : "#2b69c8";
  return (
    <g transform={`rotate(${tilt} ${x + 14} 62)`}>
      <rect
        x={x}
        y={40}
        width={28}
        height={40}
        rx={5}
        fill={odd ? "#c03d8a" : "#ffffff"}
      />
      <circle cx={x + 14} cy={56} r={7} fill={figure} />
      <path d={`M${x + 5} 76c0-6 4-9 9-9s9 3 9 9z`} fill={figure} />
    </g>
  );
}

/**
 * The Impostor thumbnail: four same cards and one off, under a spotlight.
 * Built in a 160×100 box; it fills its box.
 */
export function ImpostorThumb() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <rect width={160} height={100} fill="#1b2334" />
      <path d="M58 0h44l40 100H18z" fill="#f6e3a1" opacity={0.16} />
      <Card x={8} tilt={-12} />
      <Card x={38} tilt={-5} />
      <Card x={66} tilt={0} odd />
      <Card x={94} tilt={5} />
      <Card x={124} tilt={12} />
    </svg>
  );
}
