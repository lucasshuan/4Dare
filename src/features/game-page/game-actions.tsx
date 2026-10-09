"use client";

import {
  ChartNoAxesColumn,
  Library,
  type LucideIcon,
  PencilRuler,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CHARACTERS, RANKINGS, WORKSHOP } from "@/lib/routes";

/** Beside the pitch: small links on, side by side (the cards, the workshop, the game's ranking). */
export function GameActions({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.actions");
  const actions: {
    key: "characters" | "workshop" | "ranking";
    href: string;
    Icon: LucideIcon;
  }[] = [
    { key: "characters", href: CHARACTERS, Icon: Library },
    { key: "workshop", href: WORKSHOP, Icon: PencilRuler },
    {
      key: "ranking",
      href: `${RANKINGS}?game=${game}`,
      Icon: ChartNoAxesColumn,
    },
  ];
  return (
    <nav
      aria-label={t("label")}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {actions.map(({ key, href, Icon }) => (
        <Link
          key={key}
          href={href}
          className="inline-flex h-9 items-center gap-2 rounded-pill border-[1.5px] border-line bg-surface px-3.5 font-semibold text-[13.5px] transition-colors duration-150 ease-soft hover:border-line-strong"
        >
          <Icon className="size-4 text-ink-muted" strokeWidth={1.75} />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
