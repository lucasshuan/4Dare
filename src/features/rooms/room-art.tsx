import { QUESTION } from "@/components/ui/logo";
import type { GameKey } from "@/game/games";

// One still, wide scene per game (400×96, kept to the right) for the head of a
// room card, drawn from the game's thumbnail. Walls follow the theme
// (--scn-*); objects keep their colours.

/** The logo's "?" at (x, y), scaled and turned. */
function Q({
  x,
  y,
  s,
  fill,
  rot = 0,
}: {
  x: number;
  y: number;
  s: number;
  fill: string;
  rot?: number;
}) {
  return (
    <path
      d={QUESTION}
      fill={fill}
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-490 -400)`}
    />
  );
}

/** Who am I?: a card held up for the others, a face on it. */
function Held({
  x,
  y,
  tilt,
  pastel,
  face,
}: {
  x: number;
  y: number;
  tilt: number;
  pastel: string;
  face: string;
}) {
  const w = 46;
  const h = 64;
  const cx = x + w / 2;
  const cy = y + 4 + h * 0.36;
  const r = w * 0.24;
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}>
      <rect x={x} y={y} width={w} height={h} rx={7} fill="#fff" />
      <rect
        x={x + 4}
        y={y + 4}
        width={w - 8}
        height={h * 0.62}
        rx={5}
        fill={pastel}
      />
      <circle cx={cx} cy={cy} r={r} fill={face} />
      <circle cx={cx - r * 0.38} cy={cy - r * 0.32} r={r * 0.26} fill="#fff" />
      <circle cx={cx + r * 0.38} cy={cy - r * 0.32} r={r * 0.26} fill="#fff" />
      <rect
        x={x + 7}
        y={y + h * 0.74}
        width={w * 0.56}
        height={3.4}
        rx={1.7}
        fill="#d3d9e4"
      />
    </g>
  );
}

function WhoAmI() {
  return (
    <>
      <rect width={400} height={96} fill="var(--scn-who)" />
      <Q x={132} y={30} s={0.07} fill="var(--scn-who-q)" rot={-14} />
      <Q x={104} y={74} s={0.05} fill="var(--scn-who-q)" rot={12} />
      <Held x={150} y={44} tilt={-14} pastel="#fde2c8" face="#f4a06b" />
      <Held x={196} y={30} tilt={-6} pastel="#cdeee9" face="#5fb8ad" />
      <Held x={318} y={30} tilt={7} pastel="#e3dcfb" face="#a5b4fc" />
      <Held x={364} y={44} tilt={15} pastel="#ffd9e8" face="#f08cc8" />
      <g transform="rotate(3 275 92)">
        <rect x={246} y={12} width={58} height={84} rx={8} fill="#f6e3a1" />
        <Q x={275} y={50} s={0.085} fill="#2b69c8" />
      </g>
      <g transform="translate(306 10)">
        <rect width={36} height={14} rx={7} fill="#0b7a75" />
        <circle cx={8} cy={7} r={2.6} fill="#fff" />
        <rect
          x={14}
          y={5.6}
          width={15}
          height={2.8}
          rx={1.4}
          fill="#fff"
          opacity={0.9}
        />
      </g>
    </>
  );
}

/** Impostor: a card in the police lineup; the odd one is pink. */
function Suspect({ x, tilt, odd }: { x: number; tilt: number; odd: boolean }) {
  const w = 35;
  const h = 50;
  const y = 40;
  const fig = odd ? "#ffd1e6" : "#2b69c8";
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={odd ? "#c03d8a" : "#fff"}
      />
      <circle cx={x + w / 2} cy={y + 20} r={8.5} fill={fig} />
      <path
        d={`M${x + 6} ${y + 45}c0-7.5 5-11 11.5-11s11.5 3.5 11.5 11z`}
        fill={fig}
      />
    </g>
  );
}

const LINEUP_ROWS = [14, 26, 38, 50, 62, 74, 86];

function Impostor() {
  return (
    <>
      <rect width={400} height={96} fill="var(--scn-imp)" />
      {LINEUP_ROWS.map((y) => (
        <g key={y}>
          <path
            d={`M118 ${y}H400`}
            stroke="#fff"
            strokeOpacity={y % 24 === 14 ? 0.09 : 0.05}
            strokeWidth={1}
          />
          <path
            d={`M118 ${y}h${y % 24 === 14 ? 10 : 5}`}
            stroke="#fff"
            strokeOpacity={0.22}
            strokeWidth={1.2}
          />
        </g>
      ))}
      <path d="M283 -4h22l58 104H225z" fill="#f6e3a1" opacity={0.16} />
      <ellipse cx={294} cy={91} rx={30} ry={4} fill="#f6e3a1" opacity={0.22} />
      <Suspect x={146} tilt={-7} odd={false} />
      <Suspect x={188} tilt={-3} odd={false} />
      <Suspect x={230} tilt={2} odd={false} />
      <Suspect x={276} tilt={0} odd />
      <Suspect x={320} tilt={3} odd={false} />
      <Suspect x={362} tilt={7} odd={false} />
    </>
  );
}

/** What for?: a photo taped on the board, its price tag under it. */
function Photo({
  x,
  y,
  tilt,
  pastel,
  fig,
  price,
}: {
  x: number;
  y: number;
  tilt: number;
  pastel: string;
  fig: string;
  price: number;
}) {
  return (
    <g transform={`rotate(${tilt} ${x + 15} ${y + 19})`}>
      <rect x={x} y={y} width={30} height={38} rx={2} fill="#fff" />
      <rect x={x + 2.8} y={y + 2.8} width={24.4} height={30.5} fill={pastel} />
      <circle cx={x + 15} cy={y + 15.6} r={6} fill={fig} />
      <path
        d={`M${x + 6.9} ${y + 33.3}c0-6.2 3.6-9.5 8.1-9.5s8.1 3.3 8.1 9.5z`}
        fill={fig}
      />
      <rect
        x={x + 8.7}
        y={y - 3.8}
        width={12.5}
        height={6.2}
        fill="#f6e3a1"
        opacity={0.85}
      />
      <rect
        x={x + 18.7}
        y={y + 31}
        width={15}
        height={9}
        rx={2}
        fill="#d8b07a"
      />
      <text
        x={x + 26.2}
        y={y + 35.8}
        fontSize={6.8}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#2a1d0c"
        fontFamily="var(--font-mono)"
      >
        {price}
      </text>
    </g>
  );
}

/** A stack of coins standing at (x, y). */
function Coins({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const t = y - i * 2.8;
        const dx = [0, 0.9, -0.6, 0.4][i % 4];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack
          <g key={i} transform={`translate(${dx} 0)`}>
            <path
              d={`M${x} ${t}v3.2a8.8 1.8 0 0 0 17.6 0v-3.2z`}
              fill="#b58a1e"
            />
            <ellipse cx={x + 8.8} cy={t} rx={8.8} ry={1.8} fill="#e7b94a" />
          </g>
        );
      })}
    </>
  );
}

function Lineup() {
  return (
    <>
      <rect width={400} height={96} fill="var(--scn-lin)" />
      {/* the board runs past the bottom: taller than the strip, so it isn't a wide sliver */}
      <rect x={128} y={4} width={300} height={150} rx={7} fill="#b07a48" />
      <rect x={135} y={11} width={300} height={136} rx={4} fill="#2c4a3e" />
      <g fill="none" stroke="#eef2e6" strokeOpacity={0.2} strokeWidth={1.2}>
        <rect x={141} y={17} width={300} height={124} rx={3} />
        <path d="M282 17v124" />
        <circle cx={282} cy={79} r={16} />
        <path d="M141 52h22v54h-22" />
        <path d="M141 66h9v26h-9" />
      </g>
      <path
        d="M150 26h36"
        stroke="#eef2e6"
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={0.85}
      />
      <Photo
        x={150}
        y={38}
        tilt={-5}
        pastel="#fde2c8"
        fig="#e9852e"
        price={5}
      />
      <Photo x={194} y={44} tilt={4} pastel="#cdeee9" fig="#2f7f86" price={1} />
      <Photo
        x={240}
        y={36}
        tilt={-3}
        pastel="#ffd1e6"
        fig="#c03d8a"
        price={3}
      />
      <Photo x={300} y={44} tilt={5} pastel="#dbe4fb" fig="#2b69c8" price={1} />
      <Coins x={344} y={84} n={3} />
      <Coins x={366} y={88} n={2} />
      <g transform="rotate(10 368 20)">
        <rect x={348} y={6} width={40} height={26} rx={3} fill="#d8b07a" />
        <path
          d="M348 7.5l20 13.5 20-13.5"
          fill="none"
          stroke="#b88a52"
          strokeWidth={1.6}
        />
        <circle cx={368} cy={21} r={5.2} fill="#b8322a" />
      </g>
    </>
  );
}

const ART: Record<GameKey, () => React.JSX.Element> = {
  "who-am-i": WhoAmI,
  impostor: Impostor,
  lineup: Lineup,
};

/** The head of a room card for `game`; it fills its box (cover, kept to the right). */
export function RoomArt({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const Art = ART[game];
  return (
    <svg
      viewBox="0 0 400 96"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <Art />
    </svg>
  );
}
