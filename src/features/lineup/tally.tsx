"use client";

// The tally, back on the slate: the votes fall one by one under the board
// each went to, with the voter's face (secret was only the voting), then the
// stamp: the winner, winners tied, or a tie that goes to a tiebreak.
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import type { ShowView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { BoardView, FitBoard } from "./board";
import { beatDelay, useBeatAgo, useLineup } from "./use-lineup";

export function TallyScene({ show }: { show: ShowView }) {
  const t = useTranslations("lineup.tally");
  const name = useDisplayName();
  const { lu, view, playerById } = useLineup();
  const votesBeat = show.beats.find((b) => b.kind === "votes") ?? show.beats[0];
  const stampBeat = show.beats.find((b) => b.kind === "stamp") ?? null;
  const ago = useBeatAgo(votesBeat);
  const stampAgo = useBeatAgo(stampBeat);
  // the tiebreak's tally shows its votes on top of the first ones
  const second = view.phase === "scoring" && !!lu.tie?.votes;
  const firstVotes = Object.entries(lu.vote?.votes ?? {});
  const tieVotes = second ? Object.entries(lu.tie?.votes ?? {}) : [];
  const falling = second ? tieVotes : firstVotes;
  const result = view.phase === "scoring" ? lu.results.at(-1) : null;
  const winners = result?.winners ?? [];
  const tied = view.phase === "tiebreak" ? (lu.tie?.among ?? []) : [];
  const owners = lu.dealtIds.filter((id) => (lu.hands[id]?.length ?? 0) > 0);
  const stamp =
    view.phase === "tiebreak"
      ? t("tie")
      : winners.length > 1
        ? t("tiedWin")
        : winners.length
          ? t("winner")
          : t("nobody");

  return (
    <div className="flex w-full flex-col items-center gap-4 text-chalk">
      <h2 className="m-0 font-bold font-chalk text-[clamp(28px,4.6vw,44px)]">
        {second ? t("tieTitle") : t("title")}
      </h2>
      <div
        className={cn(
          "grid w-full max-w-[1000px] grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-3 gap-y-5 sm:gap-x-5",
          owners.length > 2 ? "max-sm:grid-cols-3" : "max-sm:grid-cols-2",
        )}
        style={
          {
            "--cols": Math.min(4, Math.max(2, owners.length)),
          } as React.CSSProperties
        }
      >
        {owners.map((id) => {
          const owner = playerById(id);
          const board = lu.boards[id];
          if (!owner || !board) return null;
          const lit =
            winners.includes(id) ||
            tied.includes(id) ||
            (!winners.length && !tied.length);
          const kept = second ? firstVotes.filter(([, to]) => to === id) : [];
          const mine = falling.filter(([, to]) => to === id);
          return (
            <div key={id} className="flex min-w-0 flex-col items-center gap-2">
              <m.div
                className="relative w-full max-w-[230px]"
                animate={{ opacity: stampBeat && !lit ? 0.4 : 1 }}
                transition={{
                  delay: stampBeat ? beatDelay(stampBeat, stampAgo, 0) : 0,
                }}
              >
                <FitBoard>
                  <BoardView board={board} cards={lu.cards} tags={lu.tags} />
                </FitBoard>
                {stampBeat && lit && (winners.length || tied.length) ? (
                  <m.span
                    className="pointer-events-none absolute top-[38%] left-1/2 whitespace-nowrap font-bold font-chalk text-[clamp(18px,3.4vw,40px)] text-butter [text-shadow:0_4px_0_rgba(0,0,0,0.3)]"
                    initial={{ opacity: 0, scale: 2.4, rotate: -20, x: "-50%" }}
                    animate={{ opacity: 1, scale: 1, rotate: -8, x: "-50%" }}
                    transition={{
                      delay: beatDelay(stampBeat, stampAgo, 0.05),
                      type: "spring",
                      stiffness: 380,
                      damping: 16,
                    }}
                  >
                    {stamp}
                  </m.span>
                ) : null}
              </m.div>
              <span className="max-w-full truncate font-bold text-[12px] sm:text-[15px]">
                {board.name || name(owner, owner.isYou)}
              </span>
              <div className="flex min-h-8 flex-wrap items-center justify-center">
                {kept.map(([by]) => {
                  const p = playerById(by);
                  return p ? (
                    <span key={`k-${by}`} className="-mr-1.5 opacity-60">
                      <Avatar avatar={p.avatar} size={24} seat={p.colorSlot} />
                    </span>
                  ) : null;
                })}
                {mine.map(([by]) => {
                  const p = playerById(by);
                  if (!p) return null;
                  const k = falling.findIndex(([v]) => v === by);
                  return (
                    <m.span
                      key={by}
                      className="-mr-1.5"
                      initial={{ y: -40, opacity: 0, scale: 0.5 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{
                        delay: beatDelay(
                          votesBeat,
                          ago,
                          0.1 + (0.8 * k) / Math.max(1, falling.length),
                        ),
                        type: "spring",
                        stiffness: 420,
                        damping: 18,
                      }}
                    >
                      <Avatar avatar={p.avatar} size={26} seat={p.colorSlot} />
                    </m.span>
                  );
                })}
                <b className="ml-3 font-medium font-mono text-[18px] sm:ml-4 sm:text-[20px]">
                  {kept.length + mine.length || ""}
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
