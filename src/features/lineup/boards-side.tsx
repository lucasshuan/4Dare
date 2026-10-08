"use client";

// Every team side by side: halfway through the auction (the break, with the
// coins each one still has and the lots left), and when it is over (who got
// how many, what was left over).
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { keyClass } from "@/components/ui/button";
import { boardOf } from "@/game/lineup/rules";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { markDone } from "@/server/actions";
import { BoardView, FitBoard } from "./board";
import { CoinTower } from "./coin";
import { useLineup, useLuAction } from "./use-lineup";

/** The boards in a grid that keeps them readable: up to three across on a phone, four wider. */
function BoardsGrid({
  players,
  note,
}: {
  players: PlayerView[];
  note: (p: PlayerView) => React.ReactNode;
}) {
  const { lu } = useLineup();
  const name = useDisplayName();
  return (
    <div
      className={cn(
        "grid w-full max-w-[1000px] grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-6",
        players.length > 2 ? "max-sm:grid-cols-3" : "max-sm:grid-cols-2",
      )}
      style={
        {
          "--cols": Math.min(4, Math.max(2, players.length)),
        } as React.CSSProperties
      }
    >
      {players.map((p, k) => (
        <m.div
          key={p.id}
          className="flex min-w-0 flex-col items-center gap-2.5"
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.08 * k,
            type: "spring",
            stiffness: 260,
            damping: 22,
          }}
        >
          <FitBoard className="max-w-[230px]">
            <BoardView
              board={boardOf(undefined, lu.hands[p.id] ?? [])}
              cards={lu.cards}
              tags={lu.tags}
            />
          </FitBoard>
          <span className="inline-flex max-w-full items-center gap-1.5 font-bold text-[12px] sm:text-[15px]">
            <Avatar avatar={p.avatar} size={20} seat={p.colorSlot} />
            <span className="truncate">{name(p, p.isYou)}</span>
          </span>
          {note(p)}
        </m.div>
      ))}
    </div>
  );
}

/** The coins someone has left, stacked on a little plank (the planks line up). */
function Pile({ coins }: { coins: number }) {
  return (
    <span className="mt-auto flex flex-col items-center">
      {coins > 0 ? (
        <CoinTower count={coins} className="w-[30px] sm:w-[38px]" />
      ) : null}
      <span className="mt-[-1px] block h-1.5 w-11 rounded-[3px] bg-gradient-to-b from-wood to-wood-deep sm:w-14" />
      <span className="mt-1 font-mono text-[13px] opacity-85">{coins}</span>
    </span>
  );
}

/** Halfway: the boards, the purses and the lots left; "Continue" cuts the clock. */
export function BreakScreen() {
  const t = useTranslations("lineup.break");
  const { lu, players, me, code } = useLineup();
  const { run, pending } = useLuAction();
  const left = lu.lots - (lu.lot ? lu.lot.i + 1 : 0);
  const done = lu.doneIds.includes(me.id);
  const inPlay = lu.dealtIds.includes(me.id) && !me.away;
  return (
    <div className="flex w-full flex-col items-center gap-5 text-chalk">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-bold text-[13px] uppercase tracking-[0.08em] opacity-80">
          {t("kicker")}
        </span>
        <h2 className="m-0 font-bold font-chalk text-[clamp(30px,5vw,48px)] leading-tight">
          {t("title")}
        </h2>
        <span className="inline-flex items-center gap-2 font-semibold">
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: Math.min(left, 12) }, (_, k) => (
              <i
                // biome-ignore lint/suspicious/noArrayIndexKey: face-down lots
                key={k}
                className="block h-5 w-3.5 rounded-[3px] bg-[repeating-linear-gradient(45deg,var(--kraft)_0_4px,var(--kraft-deep)_4px_8px)] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
              />
            ))}
          </span>
          {t("left", { n: left })}
        </span>
      </div>
      <BoardsGrid
        players={players}
        note={(p) => <Pile coins={lu.coins[p.id] ?? 0} />}
      />
      {inPlay ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markDone(code, !done))}
          className={keyClass(done ? "sky" : "yes", {
            pressed: done,
            className: "h-14 px-8 text-lg",
          })}
        >
          {done
            ? t("waiting", { n: lu.doneIds.length, of: lu.dealtIds.length })
            : t("go")}
        </button>
      ) : null}
    </div>
  );
}

/** The auction is over: every team, the coins left, the leftovers handed out. */
export function WrapScene() {
  const t = useTranslations("lineup.wrap");
  const { lu, players } = useLineup();
  const freebies = Object.entries(lu.tags).filter(([, tag]) => tag.by === null);
  return (
    <div className="flex w-full flex-col items-center gap-5 text-chalk">
      <h2 className="m-0 font-bold font-chalk text-[clamp(30px,5vw,48px)] leading-tight">
        {t("title")}
      </h2>
      <BoardsGrid
        players={players}
        note={(p) => (
          <span className={cn("font-mono text-[13px] opacity-85")}>
            {t("count", {
              n: lu.hands[p.id]?.length ?? 0,
              left: lu.coins[p.id] ?? 0,
            })}
          </span>
        )}
      />
      {freebies.length ? (
        <p className="m-0 font-semibold opacity-85">{t("freebies")}</p>
      ) : null}
    </div>
  );
}
