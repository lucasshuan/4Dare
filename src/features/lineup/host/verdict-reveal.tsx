"use client";

// The verdict, and the show's last surprise: the winning board takes the
// screen with its stamp, then the camera pulls back and the picture shrinks
// into an old TV's glass. It all played on the presenter's TV. Then their
// face, and why they picked it.
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import type { Beat } from "@/game/types";
import { useDisplayName } from "@/lib/names";
import { BoardView, FitBoard } from "../board";
import { beatDelay, useBeatAgo, useLineup } from "../use-lineup";

export function VerdictReveal({ beat }: { beat: Beat }) {
  const t = useTranslations("lineup.host.reveal");
  const name = useDisplayName();
  const { lu, playerById } = useLineup();
  const still = useReducedMotion() ?? false;
  const ago = useBeatAgo(beat);
  const at = (frac: number) => beatDelay(beat, ago, frac);
  const long = (beat.until - beat.startsAt) / 1000;
  const result = lu.results.at(-1);
  const verdict = result?.verdict ?? lu.verdict;
  if (!verdict) return null;
  const host = playerById(verdict.by);
  const winner = playerById(verdict.for);
  const board = result?.boards[verdict.for] ?? lu.boards[verdict.for];
  const cards = result?.cards ?? lu.cards;
  const tags = result?.tags ?? lu.tags;
  const hostName = host ? name(host, host.isYou) : "";
  // the pull back starts a third of the way in
  const pull = still ? 0 : at(0.32);
  return (
    <div className="flex w-full flex-col items-center gap-6 text-chalk">
      <m.div
        className="relative"
        initial={{ scale: still ? 0.72 : 1 }}
        animate={{ scale: 0.72 }}
        transition={{ delay: pull, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* the TV's cabinet comes into view around the picture */}
        <m.span
          aria-hidden="true"
          className="absolute -inset-x-[26px] -top-[26px] -bottom-[64px] rounded-[34px] bg-[#2b2622] shadow-[0_18px_40px_rgba(18,14,10,0.45)]"
          initial={{ opacity: still ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: pull, duration: 0.5 }}
        >
          <span className="absolute right-8 bottom-5 flex gap-2.5">
            <i className="block size-5 rounded-pill bg-[#4a4039]" />
            <i className="block size-5 rounded-pill bg-[#4a4039]" />
          </span>
          <span className="absolute bottom-6 left-8 font-bold font-mono text-[11px] text-white/35 tracking-[0.2em]">
            4DARE
          </span>
        </m.span>
        <div className="relative w-[min(70vw,300px)] overflow-hidden rounded-[18px] bg-[#16302a] px-1.5 pt-1.5 pb-7">
          {board && winner ? (
            <FitBoard>
              <BoardView
                board={board}
                cards={cards}
                tags={tags}
                owner={winner}
              />
            </FitBoard>
          ) : null}
          <m.span
            className="pointer-events-none absolute top-[60%] left-1/2 z-[1] whitespace-nowrap rounded-[12px] border-[4px] border-butter px-4 py-1 font-bold font-chalk text-[clamp(38px,9vw,60px)] text-butter leading-none [text-shadow:0_3px_0_rgba(0,0,0,0.3)]"
            initial={{ opacity: 0, scale: 2.4, rotate: -20, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, rotate: -8, x: "-50%" }}
            transition={{
              delay: at(0.06),
              type: "spring",
              stiffness: 380,
              damping: 16,
            }}
          >
            {t("winner")}
          </m.span>
          {/* the glass: scan lines once it is a TV */}
          <m.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.14), transparent 55%)",
            }}
            initial={{ opacity: still ? 0.3 : 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: pull + 0.2, duration: 0.5 }}
          />
        </div>
      </m.div>
      <m.div
        className="flex max-w-[min(92vw,560px)] flex-col items-center gap-3 text-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: still ? 0 : pull + Math.min(1, long * 0.18) }}
      >
        <span className="font-bold font-chalk text-[clamp(20px,3vw,28px)] leading-tight">
          {host?.isYou ? t("twistYou") : t("twist", { name: hostName })}
        </span>
        <span className="inline-flex items-center gap-3 rounded-[22px] bg-black/25 py-2 pr-5 pl-2 text-left">
          {host ? (
            <Avatar avatar={host.avatar} size={48} seat={host.colorSlot} />
          ) : null}
          <span className="font-bold font-hand text-[clamp(20px,3vw,26px)] leading-tight">
            {verdict.why ? `“${verdict.why}”` : t("mute", { name: hostName })}
          </span>
        </span>
      </m.div>
    </div>
  );
}
