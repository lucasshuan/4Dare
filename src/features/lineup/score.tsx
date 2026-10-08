"use client";

// The round's score: the winning boards stamped, every team's votes and
// points, the crowd's prize, "Good mission?" for the curation, and the next
// round (or the podium) once everyone is ready.
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { keyClass } from "@/components/ui/button";
import { fireConfetti } from "@/components/ui/confetti";
import { useStepStarted } from "@/features/room/match-frame";
import type { LuRoundView } from "@/game/lineup/types";
import type { Lang, PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { playSound } from "@/lib/sound";
import { markDone, rateMission } from "@/server/actions";
import { BoardView, FitBoard } from "./board";
import { useLineup, useLuAction } from "./use-lineup";

/** A round's rows: best first. */
export function ScoreRows({
  result,
  players,
  totals,
}: {
  result: LuRoundView;
  players: PlayerView[];
  totals?: Record<string, number>;
}) {
  const t = useTranslations("lineup.score");
  const name = useDisplayName();
  const rows = [...players].sort(
    (a, b) => (result.points[b.id] ?? 0) - (result.points[a.id] ?? 0),
  );
  return (
    <div className="flex w-full max-w-[560px] flex-col gap-2 text-left">
      {rows.map((p) => {
        const won = result.winners.includes(p.id);
        const team = result.boards[p.id]?.name;
        return (
          <div
            key={p.id}
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-surface py-2 pr-3.5 pl-2 shadow-card",
              won && "outline-3 outline-butter",
            )}
          >
            <Avatar avatar={p.avatar} size={36} seat={p.colorSlot} />
            <span className="min-w-0">
              <b className="block truncate font-bold text-[15px]">
                {won ? "🏆 " : ""}
                {team || name(p, p.isYou)}
              </b>
              <small className="block truncate font-semibold text-[12.5px] text-ink-muted">
                {team ? `${name(p, p.isYou)} · ` : ""}
                {t("votes", { n: result.votes[p.id] ?? 0 })}
                {result.crowd === p.id ? ` · 😂 ${t("crowd")}` : ""}
              </small>
            </span>
            <span className="text-right font-medium font-mono text-[17px]">
              +{result.points[p.id] ?? 0}
              {totals ? (
                <small className="block text-[12px] text-ink-muted">
                  {t("total", { n: totals[p.id] ?? 0 })}
                </small>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RoundScore() {
  const t = useTranslations("lineup.score");
  const name = useDisplayName();
  const lang = useLocale() as Lang;
  const { lu, me, players, code } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const result = lu.results.at(-1);
  const inPlay = lu.dealtIds.includes(me.id) && !me.away;
  const done = lu.doneIds.includes(me.id);
  const last = lu.round >= lu.rounds;

  useEffect(() => {
    const id = window.setTimeout(() => {
      fireConfetti("big");
      playSound("complete");
    }, 300);
    return () => window.clearTimeout(id);
  }, []);

  if (!result) return null;
  const teamName = (id: string) => {
    const owner = players.find((p) => p.id === id);
    return result.boards[id]?.name || (owner ? name(owner, owner.isYou) : "");
  };
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-bold text-[13px] text-ink-muted uppercase tracking-[0.08em]">
          {t("kicker", { n: lu.round, of: lu.rounds })}
        </span>
        <h2 className="m-0 font-display font-extrabold text-[clamp(24px,4vw,36px)] leading-tight">
          {result.winners.length > 1
            ? t("tied")
            : result.winners.length
              ? t("won", { name: teamName(result.winners[0]) })
              : t("nobody")}
        </h2>
        <p className="m-0 max-w-[90vw] text-balance font-semibold text-ink-muted text-sm">
          {result.mission.text[lang]}
        </p>
      </div>

      {result.winners.length ? (
        <div className="flex w-full max-w-[720px] flex-wrap justify-center gap-3 sm:gap-4">
          {result.winners.map((id, k) => {
            const board = result.boards[id];
            const owner = players.find((p) => p.id === id);
            return board ? (
              <m.div
                key={id}
                className={
                  result.winners.length > 2
                    ? "w-[min(28vw,190px)]"
                    : result.winners.length > 1
                      ? "w-[min(40vw,210px)]"
                      : "w-[min(52vw,230px)]"
                }
                initial={{ opacity: 0, y: 30, rotate: k % 2 ? 4 : -4 }}
                animate={{ opacity: 1, y: 0, rotate: k % 2 ? 2 : -2 }}
                transition={{
                  delay: 0.15 * k,
                  type: "spring",
                  stiffness: 240,
                  damping: 18,
                }}
              >
                <FitBoard>
                  <BoardView
                    board={board}
                    cards={result.cards}
                    tags={result.tags}
                    owner={owner}
                  />
                </FitBoard>
              </m.div>
            ) : null;
          })}
        </div>
      ) : null}

      <ScoreRows result={result} players={players} totals={lu.totals} />

      <div className="flex flex-wrap items-center justify-center gap-4">
        {inPlay ? (
          <span className="inline-flex items-center gap-2 font-bold text-ink-muted text-sm">
            {t("goodMission")}
            {([true, false] as const).map((up) => {
              const on = lu.rated === (up ? 1 : -1);
              return (
                <button
                  key={String(up)}
                  type="button"
                  aria-pressed={on}
                  aria-label={up ? t("good") : t("bad")}
                  onClick={() => run(() => rateMission(code, on ? null : up))}
                  className={cn(
                    "grid size-10 place-items-center rounded-pill bg-surface text-ink shadow-card",
                    on && "outline-3 outline-yes",
                  )}
                >
                  {up ? (
                    <ThumbsUp className="size-5" strokeWidth={2.2} />
                  ) : (
                    <ThumbsDown className="size-5" strokeWidth={2.2} />
                  )}
                </button>
              );
            })}
          </span>
        ) : null}
        {inPlay ? (
          <button
            type="button"
            disabled={pending || !started}
            onClick={() => run(() => markDone(code, !done))}
            className={keyClass(done ? "sky" : "yes", {
              pressed: done,
              className: "h-14 px-8 text-lg",
            })}
          >
            {done
              ? t("waiting", { n: lu.doneIds.length, of: lu.dealtIds.length })
              : last
                ? t("podium")
                : t("next")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
