"use client";

// The board standing up: a slate in a wooden frame, the team's photos taped
// on and the owner's chalk words. Drawn at its own size (400 × 600, the slate
// 372 × 572 inside, the units every saved board uses) and scaled to the room
// it gets, so a board looks the same on every screen.
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { SLATE } from "@/game/lineup/rules";
import type { LuBoard, LuCard, LuTag } from "@/game/lineup/types";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { onSeat, seatColor } from "@/lib/seats";
import { Sticker } from "./card";

export const BOARD = { w: 400, h: 600, inset: 14 } as const;

/** The scale that fits `w` units into the element's width, kept up to date. */
export function useFitScale(ref: RefObject<HTMLElement | null>, w: number) {
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, w]);
  return scale;
}

/**
 * A box as wide as it is given, 2:3, with the board scaled into it. Hidden
 * until it knows its width, so it never flashes at the wrong size.
 */
export function FitBoard({
  className,
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useFitScale(ref, BOARD.w);
  return (
    <div
      ref={ref}
      className={cn("relative aspect-[2/3] w-full", className)}
      style={style}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: BOARD.w,
          height: BOARD.h,
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The chalk lines of a pitch, faint on the slate. */
function Lines() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SLATE.w} ${SLATE.h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <g
        fill="none"
        stroke="rgba(238,242,230,0.16)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="14" y="14" width="344" height="544" rx="6" />
        <path d="M14 286h344" />
        <circle cx="186" cy="286" r="40" />
        <path d="M120 14v44h132V14M120 558v-44h132v44" />
      </g>
    </svg>
  );
}

/** The wooden frame and the slate, at the board's own size; what goes on it comes as children. */
export function BoardShell({
  children,
  outside,
  className,
  glow,
}: {
  children?: ReactNode;
  /** On the frame, outside the slate (the owner's pill, a tally). */
  outside?: ReactNode;
  className?: string;
  /** A soft glow under the board in this colour (your vote). */
  glow?: string | null;
}) {
  return (
    <div
      className={cn("relative rounded-[22px]", className)}
      style={{
        width: BOARD.w,
        height: BOARD.h,
        background: "linear-gradient(150deg, var(--wood), var(--wood-deep))",
        boxShadow: `inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(0,0,0,0.2), ${
          glow
            ? `0 34px 60px -6px color-mix(in oklab, ${glow} 75%, transparent)`
            : "0 18px 40px rgba(18,22,31,0.3)"
        }`,
      }}
    >
      <div
        className="absolute overflow-hidden rounded-[12px] text-chalk"
        style={{
          inset: BOARD.inset,
          background:
            "radial-gradient(60% 40% at 25% 15%, rgba(255,255,255,0.07), transparent), radial-gradient(40% 30% at 80% 90%, rgba(255,255,255,0.05), transparent), linear-gradient(170deg, var(--board-hi), var(--board) 45%, var(--board-deep))",
          boxShadow:
            "inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 6px 18px rgba(0,0,0,0.35)",
        }}
      >
        <Lines />
        {children}
      </div>
      {outside}
    </div>
  );
}

/** A photo's place on the slate: its centre and width give its box (the white border adds 12). */
export const stickerBox = (x: number, y: number, w: number) => ({
  left: x - (w + 12) / 2,
  top: y - (w * 1.25 + 12) / 2,
});

/** The team's name, chalked across the top. */
export function TeamName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute top-[18px] right-[22px] left-[22px] min-h-8 truncate text-center font-bold font-chalk text-[28px] leading-[1.1]",
        className,
      )}
    >
      {name}
    </div>
  );
}

/** Chalk words on the slate: the box sits on their point, the words turn around it. */
export function ChalkText({
  t,
  x,
  y,
  s,
  r,
}: {
  t: string;
  x: number;
  y: number;
  s: number;
  r: number;
}) {
  return (
    <div className="absolute size-0" style={{ left: x, top: y }}>
      <span
        className="absolute top-0 left-0 whitespace-pre text-center font-bold font-hand leading-[1.02]"
        style={{
          fontSize: s,
          transform: `translate(-50%, -50%) rotate(${r}deg)`,
        }}
      >
        {t}
      </span>
    </div>
  );
}

/** The owner's pill under the board, in their colour. */
export function OwnerPill({ player }: { player: PlayerView }) {
  const name = useDisplayName();
  return (
    <div
      className="absolute -bottom-[18px] left-5 inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-pill pr-3.5 pl-1.5 font-extrabold text-[17px] shadow-[0_6px_14px_rgba(18,22,31,0.25)]"
      style={{
        background: seatColor(player.colorSlot),
        color: onSeat(player.colorSlot),
      }}
    >
      <Avatar avatar={player.avatar} size={28} />
      {name(player, player.isYou)}
    </div>
  );
}

/**
 * A team's board as its owner laid it out (a saved board always lists every
 * card it holds, see boardOf). Read-only: the editor draws its own.
 */
export function BoardView({
  board,
  cards,
  tags,
  owner,
  glow,
  hot,
  children,
}: {
  board: LuBoard;
  cards: Record<number, LuCard>;
  tags?: Record<number, LuTag>;
  owner?: PlayerView;
  glow?: string | null;
  /** The card in the spotlight (on stage, each pulses in turn). */
  hot?: number | null;
  /** Over the slate (a pin, a stamp). */
  children?: ReactNode;
}) {
  return (
    <BoardShell
      glow={glow}
      outside={owner ? <OwnerPill player={owner} /> : null}
    >
      {board.name ? <TeamName name={board.name} /> : null}
      {board.stickers.map((s) => {
        const card = cards[s.c];
        if (!card) return null;
        return (
          <div
            key={s.c}
            className={cn(
              "absolute transition-[scale] duration-300 ease-soft",
              hot === s.c && "z-[1] scale-[1.08]",
            )}
            style={{ ...stickerBox(s.x, s.y, s.w), width: s.w + 12 }}
          >
            <Sticker
              card={card}
              width={s.w}
              tilt={s.r}
              price={tags?.[s.c]?.price}
            />
          </div>
        );
      })}
      {board.texts.map((t, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a board's words keep their order
        <ChalkText key={i} {...t} />
      ))}
      {children}
    </BoardShell>
  );
}
