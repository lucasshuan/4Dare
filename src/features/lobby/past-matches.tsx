"use client";

import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { themeSetEmoji } from "@/game/theme-sets";
import type { Lang, PastMatchView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";

/** The room's latest matches, newest first: the theme, who won, everyone in place order. */
export function PastMatches({ matches }: { matches: PastMatchView[] }) {
  const t = useTranslations("lobby");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const listFormat = new Intl.ListFormat(lang, { type: "conjunction" });

  if (!matches.length) {
    return (
      <p className="flex min-h-[68px] items-center rounded-md border-[1.5px] border-line border-dashed p-3 font-medium text-ink-muted">
        {t("noMatches")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((match) => {
        const winners = match.players.filter((p) => p.place === 1);
        const names = winners.map((p) => name(p, p.isYou));
        return (
          <li
            key={match.round}
            className="flex items-center gap-3 rounded-md bg-surface p-3 ring-1 ring-line ring-inset"
          >
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-sunken text-xl"
            >
              {match.theme?.set ? themeSetEmoji(match.theme.set) : "✍️"}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">
                {match.theme?.[lang]}
              </span>
              <span className="flex min-w-0 items-center gap-2 font-medium text-[13px] text-ink-muted">
                {/* everyone who played, best place first; who never discovered fades */}
                <span className="flex shrink-0 -space-x-1 pl-0.5">
                  {match.players.map((p, i) => (
                    <span
                      key={p.id}
                      style={{ zIndex: match.players.length - i }}
                      className={cn(
                        "relative inline-flex",
                        p.place == null && "opacity-40",
                      )}
                    >
                      <Avatar avatar={p.avatar} seat={p.colorSlot} size={20} />
                    </span>
                  ))}
                </span>
                <span className="truncate">
                  {winners.length === 0
                    ? t("matchNobody")
                    : winners.length === 1
                      ? t("matchWinner", { name: names[0] })
                      : t("matchWinners", { names: listFormat.format(names) })}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
