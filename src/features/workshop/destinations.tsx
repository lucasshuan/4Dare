"use client";

import { ArrowUpRight, Check, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { GameThumb, useGameName } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import type { WorkshopKind } from "@/server/community-contract";

type ThemeGame = "who-am-i" | "impostor";

const ART: Record<GameKey, string> = {
  "who-am-i": "var(--art-whoami)",
  impostor: "var(--art-impostor)",
  lineup: "var(--art-lineup)",
};

/** A destination ticket: themes choose games; questions and missions have fixed destinations. */
export function SuggestionDestinations({
  kind,
  games,
  onToggle,
}: {
  kind: WorkshopKind;
  games: readonly ThemeGame[];
  onToggle: (game: ThemeGame) => void;
}) {
  const t = useTranslations("workshop.compose");
  const gameName = useGameName();
  const destinations: readonly GameKey[] =
    kind === "theme"
      ? ["who-am-i", "impostor"]
      : kind === "question"
        ? ["impostor"]
        : ["lineup"];

  return (
    <fieldset className="relative m-0 grid w-fit min-w-0 max-w-full justify-self-end gap-2 rounded-[18px] border border-line bg-[linear-gradient(135deg,var(--sky-soft),var(--surface)_70%)] p-2.5 shadow-[0_2px_8px_rgb(0_0_0/0.03)]">
      <legend className="sr-only">{t("goesTo")}</legend>
      <span aria-hidden="true" className="flex items-center gap-2">
        <Route className="size-3.5 text-sky" strokeWidth={1.75} />
        <span className="font-bold text-[10px] text-ink-muted uppercase tracking-[0.12em]">
          {t("goesTo")}
        </span>
        <span className="min-w-4 flex-1 border-line-strong border-t border-dashed" />
        <ArrowUpRight className="size-3.5 text-ink-muted" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {destinations.map((game) => {
          const on = kind !== "theme" || games.some((value) => value === game);
          const className = cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-[11px] border px-2 font-bold text-[12px] transition-[background-color,border-color,box-shadow,scale] duration-150 ease-soft",
            on
              ? "border-[color-mix(in_oklch,var(--destination-art)_65%,var(--line-strong))] bg-[color-mix(in_oklch,var(--destination-art)_28%,var(--surface))] shadow-card"
              : "border-line bg-surface text-ink-muted",
            kind === "theme" &&
              "hover:border-line-strong focus-visible:outline-2 focus-visible:outline-sky active:scale-[0.96]",
          );
          const style = { "--destination-art": ART[game] } as CSSProperties;
          const contents = (
            <>
              <GameThumb game={game} size="tiny" />
              <span>{gameName(game)}</span>
              <Check
                aria-hidden="true"
                className={cn("size-3.5 shrink-0", !on && "opacity-0")}
                strokeWidth={2.5}
              />
            </>
          );
          return kind === "theme" && game !== "lineup" ? (
            <button
              key={game}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(game)}
              style={style}
              className={className}
            >
              {contents}
            </button>
          ) : (
            <span key={game} style={style} className={className}>
              {contents}
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}
