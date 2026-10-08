"use client";

// The end of a What for? match: everyone by points (ties share the place),
// each round's winning boards with their mission, then back to the lobby.
import { ArrowLeft } from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/components/ui/confetti";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { LobbyCountdown } from "@/features/result/lobby-countdown";
import type { Lang } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { useDisplayName } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import { playSound } from "@/lib/sound";
import { backToLobby, leaveRoom } from "@/server/actions";
import { BoardView, FitBoard } from "./board";
import { CoinDefs } from "./coin";

export function LineupResult() {
  const t = useTranslations("lineup.result");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const router = useRouter();
  const { view, me, code, playerById } = useRoomContext();
  const { act, pending } = useRoomAction();
  const { run } = useAction();
  const lu = view.lu;

  useEffect(() => {
    const id = window.setTimeout(() => {
      fireConfetti("big");
      playSound("complete");
    }, 600);
    return () => window.clearTimeout(id);
  }, []);

  if (!lu) return null;
  const ranked = lu.dealtIds
    .flatMap((id) => {
      const p = playerById(id);
      return p ? [p] : [];
    })
    .sort((a, b) => (lu.totals[b.id] ?? 0) - (lu.totals[a.id] ?? 0));
  const best = lu.totals[ranked[0]?.id ?? ""] ?? 0;
  const place = (points: number) =>
    1 + ranked.filter((p) => (lu.totals[p.id] ?? 0) > points).length;

  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 px-4 pt-6 pb-[calc(2rem+var(--dock))] sm:px-8">
      <CoinDefs />
      <h1 className="m-0 text-center font-display font-extrabold text-[clamp(30px,5vw,48px)] leading-tight">
        {t("title")}
      </h1>
      <ol className="m-0 flex w-full max-w-[560px] list-none flex-col gap-2 p-0">
        {ranked.map((p, k) => {
          const points = lu.totals[p.id] ?? 0;
          const top = points === best && best > 0;
          return (
            <m.li
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * k }}
              className={cn(
                "grid grid-cols-[2rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-surface py-2 pr-4 pl-3 shadow-card",
                top && "outline-3 outline-butter",
              )}
            >
              <span className="font-display font-extrabold text-[20px]">
                {top ? "🏆" : `${place(points)}º`}
              </span>
              <Avatar avatar={p.avatar} size={36} seat={p.colorSlot} />
              <b className="truncate font-bold">{name(p, p.isYou)}</b>
              <span className="font-mono text-[18px]">
                {t("points", { n: points })}
              </span>
            </m.li>
          );
        })}
      </ol>

      <div className="flex w-full max-w-[1000px] flex-col items-center gap-3">
        <h2 className="m-0 font-bold text-ink-muted text-sm uppercase tracking-[0.08em]">
          {t("champions")}
        </h2>
        <div className="flex w-full flex-wrap justify-center gap-5">
          {lu.results.flatMap((r) =>
            r.winners.map((id) => {
              const board = r.boards[id];
              const owner = playerById(id);
              return board ? (
                <figure
                  key={`${r.n}-${id}`}
                  className="m-0 flex w-[min(42vw,220px)] flex-col items-center gap-5"
                >
                  <FitBoard>
                    <BoardView
                      board={board}
                      cards={r.cards}
                      tags={r.tags}
                      owner={owner}
                    />
                  </FitBoard>
                  <figcaption className="text-balance text-center font-semibold text-[13px] text-ink-muted">
                    {t("round", { n: r.n })} · {r.mission.text[lang]}
                  </figcaption>
                </figure>
              ) : null;
            }),
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <LobbyCountdown />
        {me.isHost ? (
          <Button
            variant="primary"
            size="lg"
            disabled={pending}
            onClick={() => act(() => backToLobby(code))}
          >
            <ArrowLeft strokeWidth={2} />
            {t("toLobby")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={async () => {
            await run(() => leaveRoom(code));
            router.push(GAME_PATHS[view.settings.game]);
          }}
        >
          {t("home")}
        </Button>
      </div>
    </div>
  );
}
