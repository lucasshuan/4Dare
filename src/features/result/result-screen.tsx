"use client";

import { ArrowLeft, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/components/ui/confetti";
import { Portrait } from "@/components/ui/portrait";
import { ThemeTag } from "@/components/ui/screen";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { themeSetEmoji } from "@/game/theme-sets";
import type { Lang, PlayerView } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import { backToLobby, leaveRoom } from "@/server/actions";

const PLINTH = { 1: 136, 2: 96, 3: 60 } as Record<number, number>;

/** Podium order: with 3+ players the winner stands in the middle, like a real podium. */
function podiumOrder(ranked: PlayerView[]) {
  if (ranked.length < 3) return ranked;
  const [first, second, third, ...rest] = ranked;
  return [second, first, third, ...rest];
}

/** The podium's clock: when it runs out, everyone is taken back to the lobby. */
function LobbyCountdown() {
  const t = useTranslations("result");
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 250);
  if (view.deadline === null || view.stepStartsAt === null) return null;
  const total = view.deadline - view.stepStartsAt;
  const left = Math.max(0, view.deadline - Math.max(now, view.stepStartsAt));
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: dur.base, delay: 0.9, ease: ease.soft },
      }}
      role="timer"
      className="flex w-full max-w-80 flex-col gap-2 rounded-md bg-surface px-4 py-3"
    >
      <span className="font-medium text-[13px] text-ink-muted tabular-nums">
        {t("lobbyIn", { seconds: Math.ceil(left / 1000) })}
      </span>
      <span className="h-1.5 overflow-hidden rounded-pill bg-sunken">
        <span
          className="block h-full origin-left rounded-pill bg-ink transition-transform duration-300 ease-linear"
          style={{ transform: `scaleX(${total > 0 ? left / total : 0})` }}
        />
      </span>
    </motion.div>
  );
}

/** End of the match: everyone on a podium, cards revealed, the winner highest. */
export function ResultScreen() {
  const t = useTranslations("result");
  const tr = useTranslations("room");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const router = useRouter();
  const { view, me, code, playerById } = useRoomContext();
  const { run } = useAction();
  const { act, pending } = useRoomAction();
  const ranked = [...view.players].sort(
    (a, b) =>
      (a.place ?? 99) - (b.place ?? 99) || Number(a.gaveUp) - Number(b.gaveUp),
  );
  const winner = ranked.find((p) => p.place === 1);
  const columns = podiumOrder(ranked);
  const you = view.players.find((p) => p.isYou);
  const youLine = !you
    ? null
    : you.place === 1 && you.discoveredAt
      ? t("youWon", { n: you.discoveredAt })
      : you.discoveredAt
        ? t("youFound", { n: you.discoveredAt })
        : you.gaveUp
          ? t("youGaveUp")
          : t("youMissed");
  // plinths rise from the lowest place to the highest, then the cards land on them
  const riseDelay = (p: PlayerView) =>
    0.25 + (ranked.length - 1 - ranked.indexOf(p)) * 0.22;

  useEffect(() => {
    if (!winner) return;
    const id = window.setTimeout(() => fireConfetti(2000), 1200);
    return () => window.clearTimeout(id);
  }, [winner]);

  return (
    <div className="flex min-h-dvh flex-col gap-5 px-4 pt-4 sm:px-8 sm:pt-6">
      <header className="mx-auto flex w-full max-w-[1120px] items-center gap-4">
        {view.theme ? (
          <ThemeTag
            label={tr("theme")}
            theme={view.theme[lang]}
            emoji={
              view.theme.set === null ? "✍️" : themeSetEmoji(view.theme.set)
            }
          />
        ) : null}
      </header>
      <div className="mx-auto grid w-full max-w-[1120px] flex-1 gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-3 lg:self-center lg:pb-16">
          <span className="font-semibold text-ink-muted text-sm">
            {t("kicker", { count: view.history.length })}
          </span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.6, ease: ease.soft },
            }}
            className="text-balance font-display font-extrabold text-[clamp(34px,4vw,52px)] leading-[1.05] tracking-[-0.02em]"
          >
            {!winner
              ? t("nobody")
              : winner.isYou
                ? t("youFirst")
                : t("winner", { name: name(winner) })}
          </motion.h1>
          {youLine ? <p className="text-ink-muted">{youLine}</p> : null}
          <div className="mt-3 flex flex-col items-start gap-3">
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
              className="-ml-6"
              onClick={async () => {
                await run(() => leaveRoom(code));
                router.push(GAME_PATHS[view.settings.game]);
              }}
            >
              {t("home")}
            </Button>
          </div>
        </div>

        <ol className="flex w-full items-end justify-center gap-3 self-end sm:gap-6">
          {columns.map((p) => {
            const picker = playerById(p.pickedById);
            const plinth = p.place ? (PLINTH[p.place] ?? 40) : 20;
            const delay = riseDelay(p);
            return (
              <li
                key={p.id}
                className="flex w-full max-w-[min(250px,30vh)] min-w-0 flex-col gap-3"
              >
                <motion.article
                  initial={{ opacity: 0, y: 40, rotateX: 25 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    transition: {
                      delay: delay + 0.45,
                      duration: 0.6,
                      ease: ease.soft,
                    },
                  }}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl bg-surface p-2.5 shadow-card",
                    p.place === 1 &&
                      "outline-[3px] outline-yes outline-solid shadow-[0_0_48px_-8px_var(--yes)]",
                  )}
                >
                  <Portrait
                    src={p.card?.imageUrl ?? null}
                    tone={p.isYou ? "you" : p.place === 1 ? "other" : "neutral"}
                  />
                  <h2 className="truncate px-1.5 font-bold font-display text-[clamp(16px,2vw,24px)] leading-tight">
                    {p.card?.name ?? "?"}
                  </h2>
                  <p className="line-clamp-2 px-1.5 font-medium text-[13px] text-ink-muted leading-[18px]">
                    {[
                      p.card?.origin,
                      picker
                        ? t("pickedBy", { name: name(picker, picker.isYou) })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </motion.article>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: delay + 0.7,
                      duration: 0.5,
                      ease: ease.soft,
                    },
                  }}
                  className="flex items-center gap-3 px-1"
                >
                  <Avatar
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={48}
                    ring={p.isYou ? "sky" : undefined}
                    className="max-sm:hidden"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-bold text-[clamp(14px,1.6vw,18px)]">
                      {name(p, p.isYou)}
                    </span>
                    <span className="font-medium text-[13px] text-ink-muted">
                      {p.discoveredAt
                        ? t("discoveredAt", { n: p.discoveredAt })
                        : p.gaveUp
                          ? t("gaveUp")
                          : t("notFound")}
                    </span>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{
                    height: plinth,
                    transition: { delay, duration: 0.7, ease: ease.soft },
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 overflow-hidden rounded-t-[20px] font-display font-extrabold",
                    p.place === 1
                      ? "bg-yes text-[clamp(32px,4vw,48px)] text-on-yes"
                      : p.isYou
                        ? "bg-sky-soft text-4xl text-sky"
                        : "bg-sunken text-3xl text-ink-muted",
                  )}
                >
                  {p.place === 1 ? (
                    <Trophy className="size-8" strokeWidth={1.75} />
                  ) : null}
                  {p.place ? t("placeShort", { place: p.place }) : null}
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
