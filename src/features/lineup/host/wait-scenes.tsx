"use client";

// What the players see while the presenter works, from inside the show
// (they don't know there is a TV until the verdict): the mission being
// written and sealed, the next lot under its cloth, the boards under a
// sweeping spotlight. Transforms, opacity and one gradient: cheap to draw.
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { BoardView, FitBoard } from "../board";
import { Envelope } from "../envelope";
import { useLineup } from "../use-lineup";

const loop = (duration: number, delay = 0) => ({
  duration,
  delay,
  repeat: Number.POSITIVE_INFINITY,
  ease: "easeInOut" as const,
});

/** The mission being written, line by line, then going into the envelope. */
export function SealScene() {
  const t = useTranslations("lineup.envelope");
  const still = useReducedMotion() ?? false;
  return (
    <div className="relative w-[min(72vw,320px)]" aria-hidden="true">
      <m.div
        className="relative z-[1] mx-[9%] flex flex-col gap-2.5 rounded-[10px] bg-[#fffdf6] px-[8%] pt-4 pb-12 shadow-[0_4px_12px_rgba(42,29,12,0.25)]"
        animate={still ? undefined : { y: [0, -4, 0] }}
        transition={loop(3)}
      >
        <small className="font-bold text-[12px] text-wax uppercase tracking-[0.1em]">
          {t("whatFor")}
        </small>
        {[0.92, 0.7, 0.82].map((w, k) => (
          <m.span
            // biome-ignore lint/suspicious/noArrayIndexKey: three fixed lines
            key={k}
            className="block h-[7px] origin-left rounded-pill bg-[#1e2433]/75"
            style={{ width: `${w * 100}%` }}
            initial={{ scaleX: still ? 1 : 0 }}
            animate={still ? { scaleX: 1 } : { scaleX: [0, 1, 1, 0] }}
            transition={loop(4.2, k * 0.9)}
          />
        ))}
        <m.span
          className="absolute top-[30%] left-[10%] text-[34px] leading-none"
          animate={
            still
              ? undefined
              : { x: [0, 150, 20, 170, 0], y: [0, 4, 18, 22, 0] }
          }
          transition={loop(4.2)}
        >
          ✒️
        </m.span>
      </m.div>
      <div className="relative z-[2] -mt-9">
        <Envelope sealed />
      </div>
    </div>
  );
}

/** The next lot, under its cloth on the stand: nobody knows who yet. */
export function CoveredLot() {
  const still = useReducedMotion() ?? false;
  return (
    <div className="flex flex-col items-center" aria-hidden="true">
      <m.div
        className="relative grid aspect-[4/5] w-[min(44vw,180px)] origin-bottom place-items-center rounded-t-[42%_24%] rounded-b-[10px] shadow-[0_14px_26px_rgba(42,29,12,0.35)]"
        style={{
          background:
            "linear-gradient(100deg, var(--kraft-deep) 0 8%, var(--kraft) 20% 46%, var(--kraft-deep) 52%, var(--kraft) 64% 88%, var(--kraft-deep))",
        }}
        animate={still ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
        transition={loop(2.6)}
      >
        <span className="font-display font-extrabold text-[clamp(56px,14vw,88px)] text-kraft-ink/70">
          ?
        </span>
        <span className="absolute -top-[6%] left-1/2 h-[12%] w-[18%] -translate-x-1/2 rounded-pill bg-kraft-deep" />
      </m.div>
      <span className="block h-3 w-[min(56vw,230px)] rounded-[4px] bg-gradient-to-b from-wood to-wood-deep shadow-[0_6px_10px_rgba(0,0,0,0.25)]" />
    </div>
  );
}

/** Every board in a row, a spotlight sweeping over them while the verdict waits. */
export function Spotlight() {
  const { lu } = useLineup();
  const still = useReducedMotion() ?? false;
  const owners = lu.dealtIds.filter((id) => lu.boards[id]);
  return (
    <m.div
      aria-hidden="true"
      className="relative flex w-full max-w-[900px] justify-center gap-3 overflow-hidden rounded-[22px] p-4 sm:gap-5"
      style={{ "--x": "50%" } as CSSProperties}
      animate={still ? undefined : { "--x": ["8%", "92%", "8%"] }}
      transition={loop(6)}
    >
      {owners.map((id) => {
        const board = lu.boards[id];
        return board ? (
          <div key={id} className="w-[min(26vw,170px)] shrink-0">
            <FitBoard>
              <BoardView board={board} cards={lu.cards} tags={lu.tags} />
            </FitBoard>
          </div>
        ) : null;
      })}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at var(--x) 45%, transparent 0 16%, rgba(20,16,10,0.55) 34%)",
        }}
      />
    </m.div>
  );
}
