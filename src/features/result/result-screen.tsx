"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/ui/character-card";
import { Screen } from "@/components/ui/screen";
import { useRoomContext } from "@/features/data/room-context";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { leaveRoom, rematch } from "@/server/actions";

/** End of the match: everyone's card, in the order they discovered it. */
export function ResultScreen() {
  const t = useTranslations("result");
  const name = useDisplayName();
  const router = useRouter();
  const { view, me, code, refresh, playerById } = useRoomContext();
  const { run, pending } = useAction();
  const ranked = [...view.players].sort(
    (a, b) =>
      (a.place ?? 99) - (b.place ?? 99) || Number(a.gaveUp) - Number(b.gaveUp),
  );
  const winner = ranked.find((p) => p.place === 1);
  const host = view.players.find((p) => p.isHost);
  return (
    <Screen>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-ink-muted text-sm">
              {t("kicker", { count: view.history.length })}
            </span>
            <h1 className="font-display font-extrabold text-[clamp(36px,5vw,64px)] leading-none tracking-[-0.02em] [text-wrap:balance]">
              {winner
                ? t("winner", { name: name(winner, winner.isYou) })
                : t("nobody")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {me.isHost ? (
              <Button
                variant="primary"
                size="lg"
                disabled={pending}
                onClick={async () => {
                  if ((await run(() => rematch(code))).ok) await refresh();
                }}
              >
                {t("again")}
              </Button>
            ) : (
              <span className="text-ink-muted">
                {t("waitingHost", { name: host ? name(host) : "" })}
              </span>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                await run(() => leaveRoom(code));
                router.push("/");
              }}
            >
              {t("home")}
            </Button>
          </div>
        </div>
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ranked.map((p, i) => {
            const picker = playerById(p.pickedById);
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: 0.15 * i,
                    duration: dur.slow,
                    ease: ease.soft,
                  },
                }}
                className="flex flex-col gap-3"
              >
                <CharacterCard
                  card={p.card}
                  label={
                    p.place
                      ? t("place", { place: p.place })
                      : p.gaveUp
                        ? t("gaveUp")
                        : t("notFound")
                  }
                  tone={p.isYou ? "you" : "neutral"}
                  found={p.place === 1}
                  meta={[
                    p.card?.origin,
                    picker
                      ? t("pickedBy", { name: name(picker, picker.isYou) })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
                <div className="flex items-center gap-3 px-1">
                  <Avatar
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={44}
                    ring={p.isYou ? "sky" : undefined}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-bold text-lg">
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
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Screen>
  );
}
