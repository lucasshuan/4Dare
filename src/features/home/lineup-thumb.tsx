import { type Figure, figureUri } from "@/lib/figures";

/** A 4:5 photo taped on the board, with its price tag. */
function Photo({
  x,
  y,
  tilt,
  figure,
  price,
}: {
  x: number;
  y: number;
  tilt: number;
  figure: Figure;
  price: number;
}) {
  const id = `lineup-photo-${figure}`;
  return (
    <g transform={`rotate(${tilt} ${x + 12} ${y + 15})`}>
      <rect x={x} y={y} width={24} height={30} rx={1.5} fill="#ffffff" />
      <clipPath id={id}>
        <rect x={x + 2.2} y={y + 2.2} width={19.6} height={24.5} />
      </clipPath>
      <image
        href={figureUri(figure)}
        x={x + 2.2}
        y={y + 2.2}
        width={19.6}
        height={24.5}
        clipPath={`url(#${id})`}
      />
      <rect
        x={x + 7}
        y={y - 3}
        width={10}
        height={5}
        fill="#f6e3a1"
        opacity={0.85}
      />
      <rect
        x={x + 15}
        y={y + 25}
        width={12}
        height={7}
        rx={1.5}
        fill="var(--kraft)"
      />
      <text
        x={x + 21}
        y={y + 29}
        fontSize={5.5}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--kraft-ink)"
        className="font-mono"
      >
        {price}
      </text>
    </g>
  );
}

/** A small stack of coins seen from the side, `n` high. */
function Coins({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const top = y - i * 2.2;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack
          <g key={i} transform={`translate(${[0, 0.7, -0.5, 0.3][i % 4]} 0)`}>
            <path
              d={`M${x} ${top}v2.6a7 1.4 0 0 0 14 0v-2.6z`}
              fill="var(--gold-deep)"
            />
            <ellipse cx={x + 7} cy={top} rx={7} ry={1.4} fill="var(--gold)" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * The What for? thumbnail: the board lying down, four taped photos with their
 * prices, coins on the frame and the sealed envelope. Built in a 160×100 box;
 * it fills its box.
 */
export function LineupThumb() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <rect width={160} height={100} fill="var(--wood)" />
      <rect x={6} y={8} width={148} height={84} rx={5} fill="var(--board)" />
      <g
        fill="none"
        stroke="var(--chalk)"
        strokeOpacity={0.22}
        strokeWidth={1.1}
      >
        <rect x={11} y={13} width={138} height={74} rx={3} />
        <path d="M80 13v74" />
        <circle cx={80} cy={50} r={10} />
      </g>
      <path
        d="M18 22h46"
        stroke="var(--chalk)"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.85}
      />
      <Photo x={18} y={34} tilt={-5} figure="cat" price={5} />
      <Photo x={52} y={40} tilt={4} figure="owl" price={1} />
      <Photo x={86} y={34} tilt={-3} figure="king" price={3} />
      <Photo x={120} y={40} tilt={5} figure="lady" price={1} />
      <Coins x={124} y={84} n={3} />
      <Coins x={140} y={88} n={2} />
      <g transform="rotate(10 132 18)">
        <rect
          x={116}
          y={6}
          width={32}
          height={21}
          rx={2.5}
          fill="var(--kraft)"
        />
        <path
          d="M116 7l16 11 16-11"
          fill="none"
          stroke="var(--kraft-deep)"
          strokeWidth={1.3}
        />
        <circle cx={132} cy={18} r={4.2} fill="var(--wax)" />
      </g>
    </svg>
  );
}
