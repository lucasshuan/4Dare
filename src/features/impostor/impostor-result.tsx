"use client";

import { ArrowLeft } from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/ui/character-card";
import { fireConfetti } from "@/components/ui/confetti";
import { ThemeTag } from "@/components/ui/screen";
import { useRoomContext } from "@/features/data/room-context";
import { useLeaveRoom } from "@/features/data/use-current-match";
import { useRoomAction } from "@/features/data/use-room-action";
import { LobbyCountdown } from "@/features/result/lobby-countdown";
import { RoomControls } from "@/features/room/room-controls";
import { themeSetEmoji } from "@/game/theme-sets";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { playSound } from "@/lib/sound";
import { backToLobby } from "@/server/actions";

/**
 * The end of an Impostor match: who won and why, the two cards side by side
 * at last, and everyone's side, what they did and the room's points (a
 * caught impostor's last guess too). The host takes everyone back to the
 * lobby, or the clock does.
 */
export function ImpostorResult() {
  const t = useTranslations("impostor.result");
  const tr = useTranslations("room");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const { view, me, code, playerById } = useRoomContext();
  const { act, pending } = useRoomAction();
  const { leave } = useLeaveRoom();
  const end = view.imp?.end;
  const mineImpostor = end?.impostorIds.includes(me.id) ?? false;
  const won = !!end && mineImpostor === (end.winner === "impostors");
  useEffect(() => {
    if (!end) return;
    playSound(won ? "complete" : "step");
    if (won) fireConfetti();
  }, [end, won]);
  if (!end) return null;
  const rows = view.players
    .filter((p) => end.points[p.id] !== undefined)
    .map((p) => {
      const out = end.outs.find((o) => o.id === p.id);
      const impostor = end.impostorIds.includes(p.id);
      const why = out?.left
        ? t("why.left")
        : out
          ? impostor
            ? t("why.caught", { round: out.round })
            : t("why.voted", { round: out.round })
          : impostor
            ? t("why.survived")
            : t("why.stayed");
      return { p, out, impostor, why, points: end.points[p.id] ?? 0 };
    })
    .sort((a, b) => b.points - a.points);
  const guesses = end.outs.filter((o) => o.guess);
  return (
    <div className="flex min-h-dvh flex-col gap-8 px-4 pt-4 pb-8 max-sm:pb-[calc(2rem+var(--dock))] sm:px-8 sm:pt-6">
      <header className="mx-auto flex w-full max-w-room justify-end">
        <RoomControls />
      </header>
      <div className="flex flex-col items-center gap-2 text-center">
        {view.theme ? (
          <ThemeTag
            label={tr("theme")}
            theme={view.theme[lang]}
            emoji={view.theme.set ? themeSetEmoji(view.theme.set) : "✍️"}
          />
        ) : null}
        <m.h1
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.5 } }}
          className="text-balance font-bold font-display text-[clamp(36px,5vw,60px)] leading-none tracking-[-0.02em]"
        >
          {end.winner === "crew" ? t("crewWon") : t("impostorsWon")}
        </m.h1>
        <p className="max-w-[560px] text-ink-muted text-lg">
          {t(`reason.${end.reason}`, { count: end.impostorIds.length })}
        </p>
        <p className="font-semibold">{won ? t("youWon") : t("youLost")}</p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {[
          { card: end.crew, label: t("crewCard"), impostor: false },
          { card: end.impostor, label: t("impostorCard"), impostor: true },
        ].map((c, i) => (
          <m.div
            key={c.label}
            initial={{ opacity: 0, y: 30, rotateY: 60 }}
            animate={{
              opacity: 1,
              y: 0,
              rotateY: 0,
              transition: {
                delay: 0.3 + i * 0.25,
                duration: 0.6,
                ease: ease.soft,
              },
            }}
            className="w-[min(240px,42vw)]"
          >
            <CharacterCard
              card={c.card}
              owner={c.label}
              seat={null}
              className={cn(
                c.impostor && "outline-[3px] outline-no outline-solid",
              )}
            />
          </m.div>
        ))}
      </div>

      <ol className="mx-auto flex w-full max-w-[640px] flex-col gap-2">
        {rows.map(({ p, impostor, why, points }, i) => (
          <m.li
            key={p.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { delay: 0.8 + 0.07 * i, duration: dur.base },
            }}
            className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2.5 shadow-card"
          >
            <Avatar avatar={p.avatar} seat={p.colorSlot} size={40} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-bold">{name(p, p.isYou)}</span>
              <span className="truncate text-[13px] text-ink-muted">{why}</span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-pill px-2.5 py-1 font-bold text-xs",
                impostor ? "bg-no text-on-no" : "bg-sunken text-ink",
              )}
            >
              {impostor ? t("impostor") : t("crew")}
            </span>
            <span className="w-10 shrink-0 text-right font-bold font-display text-xl tabular-nums">
              {points > 0 ? `+${points}` : "0"}
            </span>
          </m.li>
        ))}
      </ol>

      {guesses.length ? (
        <ul className="mx-auto flex w-full max-w-[640px] flex-col gap-2">
          {guesses.map((o) => {
            const p = playerById(o.id);
            if (!p) return null;
            return (
              <li
                key={o.id}
                className="flex items-center gap-2 rounded-md bg-sunken px-3 py-2 text-sm"
              >
                <span className="font-semibold">
                  {t("guessed", {
                    name: name(p, p.isYou),
                    guess: o.guess ?? "",
                  })}
                </span>
                <span
                  className={cn(
                    "ml-auto font-bold",
                    o.hit ? "text-yes" : "text-ink-muted",
                  )}
                >
                  {o.hit ? t("guessHit") : t("guessMiss")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mx-auto flex flex-col items-center gap-3">
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
            await leave(code, view.settings.game);
          }}
        >
          {t("home")}
        </Button>
      </div>
    </div>
  );
}
