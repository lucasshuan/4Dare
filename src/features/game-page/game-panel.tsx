"use client";

import {
  Library,
  type LucideIcon,
  PencilRuler,
  Sparkles,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { GAME_INFO } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CHARACTERS, CONTRIBUTIONS, WORKSHOP } from "@/lib/routes";

/** Each game's three beats, in order (the `gamePage.panel.steps` keys). */
const STEPS = {
  "who-am-i": ["pick", "turn", "found"],
  impostor: ["question", "vote", "caught"],
  lineup: ["auction", "boards", "score"],
} as const satisfies Record<GameKey, readonly string[]>;

/** Where to go next: the cards, the Workshop, what the community added. */
const LINKS: {
  key: "characters" | "workshop" | "contributions";
  href: string;
  Icon: LucideIcon;
  tone: string;
}[] = [
  {
    key: "characters",
    href: CHARACTERS,
    Icon: Library,
    tone: "bg-sky-soft text-sky",
  },
  {
    key: "workshop",
    href: WORKSHOP,
    Icon: PencilRuler,
    tone: "bg-apricot-soft text-apricot",
  },
  {
    key: "contributions",
    href: CONTRIBUTIONS,
    Icon: Sparkles,
    tone: "bg-butter-soft text-on-butter",
  },
];

/**
 * A game's side panel: who it seats, its three beats in a line, and the
 * ways on to the cards, the Workshop and the community's contributions.
 */
export function GamePanel({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const home = useTranslations("home");
  const t = useTranslations("home.gamePage.panel");
  const step = (key: string) =>
    t(`steps.${game}.${key}` as Parameters<typeof t>[0]);

  return (
    <section
      aria-labelledby="game-panel-h"
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-xl bg-surface p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2
          id="game-panel-h"
          className="font-bold font-display text-[19px] tracking-[-0.01em]"
        >
          {t("title")}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-sunken px-3 py-1 font-semibold text-[12.5px] text-ink-muted">
          <Users className="size-3.5" strokeWidth={2} />
          {home(`games.${GAME_INFO[game].messages}.players`)}
        </span>
      </div>

      <ol className="flex flex-col">
        {STEPS[game].map((key, i) => (
          <li key={key} className="relative flex gap-3 pb-3 last:pb-0">
            {/* the line down to the next beat */}
            {i < STEPS[game].length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute top-7 bottom-0 left-[13px] w-px bg-line"
              />
            ) : null}
            <span className="relative flex size-[27px] shrink-0 items-center justify-center rounded-pill bg-sky-soft font-bold font-display text-[13px] text-sky">
              {i + 1}
            </span>
            <p className="pt-[3px] text-[15px] leading-[21px]">{step(key)}</p>
          </li>
        ))}
      </ol>

      <nav
        aria-label={t("links.label")}
        className="grid grid-cols-3 gap-2 border-line border-t pt-4"
      >
        {LINKS.map(({ key, href, Icon, tone }) => (
          <Link
            key={key}
            href={href}
            title={t(`links.${key}.hint`)}
            className="group flex flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-line px-1 py-2.5 text-center transition-colors duration-150 ease-soft hover:border-line-strong hover:bg-sunken"
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-md transition-transform duration-200 ease-soft group-hover:-translate-y-0.5",
                tone,
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.9} />
            </span>
            <b className="max-w-full font-semibold text-[12.5px] leading-tight">
              {t(`links.${key}.name`)}
            </b>
          </Link>
        ))}
      </nav>
    </section>
  );
}
