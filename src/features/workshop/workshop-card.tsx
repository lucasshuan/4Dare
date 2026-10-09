"use client";

import { Link2, ThumbsUp } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { PlayerName, useWithNames } from "@/components/ui/player-name";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { workshopPath } from "@/lib/routes";
import type { WorkshopItem } from "@/server/community-contract";
import { voteSuggestion } from "@/server/workshop-actions";
import { GamePill, ItemObject, Sema } from "./objects";

const gamesOf = (item: WorkshopItem): GameKey[] =>
  item.kind === "theme"
    ? (item.theme?.games ?? [])
    : item.kind === "question"
      ? ["impostor"]
      : ["lineup"];

/**
 * A Workshop card: its status light with who suggested it and when, the
 * object itself (a theme tag, the Impostor's pad, What for?'s envelope), and
 * at the foot the vote (a bar of yes and no, two buttons), the games it is
 * live in, or why it was left out.
 */
export function WorkshopCard({
  item,
  index,
  flash = false,
}: {
  item: WorkshopItem;
  index: number;
  flash?: boolean;
}) {
  const t = useTranslations("workshop");
  const tErrors = useTranslations("common.errors");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const locale = useLocale();
  const toast = useToast();
  const withNames = useWithNames();
  const { me } = useMe();
  const [votes, setVotes] = useState(item.votes);
  const [bump, setBump] = useState(0);
  const [busy, setBusy] = useState(false);
  const by = item.by;

  const vote = async (want: boolean) => {
    if (!votes || busy) return;
    if (!me || me.isGuest) return toast(t("card.signIn"));
    const next = votes.mine === want ? null : want;
    // the bar moves at once; the server's numbers follow
    const yes =
      votes.yes - (votes.mine === true ? 1 : 0) + (next === true ? 1 : 0);
    const no =
      votes.no - (votes.mine === false ? 1 : 0) + (next === false ? 1 : 0);
    const before = votes;
    setVotes({ yes, no, mine: next });
    setBump((b) => b + 1);
    setBusy(true);
    const r = await voteSuggestion(item.id, next).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      setVotes(before);
      toast(tErrors(r && !r.ok ? r.error : "unknown"));
      return;
    }
    setVotes({ ...r.data, mine: next });
  };

  const share = async () => {
    const url = `${window.location.origin}/${locale}${workshopPath(item.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("card.copied"));
    } catch {
      toast(url);
    }
  };

  const total = votes ? votes.yes + votes.no : 0;
  const pct = total && votes ? Math.round((votes.yes / total) * 100) : 0;
  return (
    <m.article
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={
        flash
          ? {
              opacity: 1,
              y: 0,
              boxShadow: [
                "0 0 0 0 color-mix(in oklch, var(--sky) 55%, transparent)",
                "0 0 0 12px transparent",
              ],
            }
          : { opacity: 1, y: 0 }
      }
      transition={{
        duration: flash ? 1.1 : 0.42,
        ease: ease.soft,
        delay: Math.min(index, 12) * 0.032,
      }}
      className="flex flex-col gap-3 rounded-[24px] border border-line bg-surface p-3 transition-[box-shadow,translate] duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-card"
    >
      {item.status !== "live" ? (
        <div className="flex min-w-0 items-center gap-2 px-1 pt-0.5 text-[12.5px] text-ink-muted">
          <Sema status={item.status} />
          <span className="whitespace-nowrap font-bold text-ink">
            {item.status === "refused"
              ? t("status.refusedOne")
              : t(`status.${item.status}`)}
          </span>
          {by ? (
            <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 truncate">
              <PlayerName player={by} isYou={item.mine} />
              {item.at ? ` · ${format.relativeTime(item.at, now)}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      <ItemObject item={item} />
      {item.status === "live" ? (
        <>
          <div className="flex flex-wrap gap-1.5 px-1">
            {gamesOf(item).map((g) => (
              <GamePill key={g} game={g} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2.5 px-1 pb-0.5 text-[12.5px] text-ink-muted">
            <span className="min-w-0 truncate">
              {by
                ? withNames((n) => t("card.by", { name: n(by) }))
                : t("card.bank")}
            </span>
            {by ? (
              <button
                type="button"
                onClick={share}
                aria-label={t("card.share")}
                title={t("card.share")}
                className="flex size-7 shrink-0 items-center justify-center rounded-pill hover:bg-sunken"
              >
                <Link2 className="size-3.5" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </>
      ) : item.status === "refused" ? (
        item.reason ? (
          <div className="rounded-[14px] bg-no-soft px-3 py-2.5 text-[13px] leading-[1.4]">
            <b className="block text-[12px] uppercase tracking-[0.06em]">
              {t("card.why")}
            </b>
            {item.reason}
          </div>
        ) : null
      ) : votes ? (
        <div className="grid gap-2 px-1 pb-0.5">
          <div
            aria-hidden="true"
            className="relative h-2 overflow-hidden rounded-pill bg-sunken"
          >
            <m.i
              className="absolute inset-y-0 left-0 bg-yes"
              animate={{ width: `${total ? (votes.yes / total) * 100 : 0}%` }}
              transition={{ duration: 0.55, ease: ease.soft }}
            />
            <m.i
              className="absolute inset-y-0 bg-no"
              animate={{
                left: `${total ? (votes.yes / total) * 100 : 0}%`,
                width: `${total ? (votes.no / total) * 100 : 0}%`,
              }}
              transition={{ duration: 0.55, ease: ease.soft }}
            />
          </div>
          <span className="text-[13px] text-ink-muted">
            {total ? (
              <AnimatePresence mode="popLayout" initial={false}>
                <m.b
                  key={`${bump}-${total}`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block font-semibold text-ink"
                >
                  {t("card.votes", { n: total, pct })}
                </m.b>
              </AnimatePresence>
            ) : (
              t("card.noVotes")
            )}
          </span>
          {item.mine ? (
            <div className="flex items-center justify-between gap-2 font-semibold text-[13px] text-sky">
              <span>{t("card.yours")}</span>
              <button
                type="button"
                onClick={share}
                className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong bg-surface px-3.5 font-semibold text-[14px] text-ink transition-colors hover:bg-sunken"
              >
                <Link2 className="size-4" strokeWidth={2} />
                {t("card.callFriends")}
              </button>
            </div>
          ) : item.status === "voting" ? (
            <div className="flex flex-wrap gap-2">
              {([true, false] as const).map((want) => (
                <button
                  key={String(want)}
                  type="button"
                  aria-pressed={votes.mine === want}
                  onClick={() => void vote(want)}
                  className={cn(
                    "inline-flex h-[38px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border font-bold text-[13.5px] transition-[background-color,border-color,scale] duration-150 ease-soft active:scale-[0.96]",
                    votes.mine === want
                      ? want
                        ? "border-yes bg-yes-soft"
                        : "border-no bg-no-soft"
                      : "border-line-strong bg-surface hover:bg-sunken",
                  )}
                >
                  <ThumbsUp
                    className={cn("size-4", !want && "rotate-180")}
                    strokeWidth={2}
                  />
                  {want ? t("card.want") : t("card.noFit")}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </m.article>
  );
}
