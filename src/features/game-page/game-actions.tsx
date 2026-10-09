"use client";

import {
  BookOpen,
  ChartNoAxesColumn,
  Library,
  type LucideIcon,
  PencilRuler,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CHARACTERS, HOW_TO_PLAY, RANKINGS, WORKSHOP } from "@/lib/routes";

type Action = {
  key: "howTo" | "characters" | "workshop" | "ranking";
  href: string;
  Icon: LucideIcon;
  tint: string;
};

/** Beside the pitch: where to go next for this game (its rules, its cards, the workshop, its ranking). */
export function GameActions({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.actions");
  const actions: Action[] = [
    {
      key: "howTo",
      href: `${HOW_TO_PLAY}#${game}`,
      Icon: BookOpen,
      tint: "bg-sky-soft text-sky",
    },
    {
      key: "characters",
      href: CHARACTERS,
      Icon: Library,
      tint: "bg-yes-soft text-yes",
    },
    {
      key: "workshop",
      href: WORKSHOP,
      Icon: PencilRuler,
      tint: "bg-apricot-soft text-apricot",
    },
    {
      key: "ranking",
      href: `${RANKINGS}?game=${game}`,
      Icon: ChartNoAxesColumn,
      tint: "bg-butter-soft text-on-butter",
    },
  ];
  return (
    <nav
      aria-label={t("label")}
      className={cn("grid grid-cols-2 gap-2", className)}
    >
      {actions.map(({ key, href, Icon, tint }) => (
        <Link
          key={key}
          href={href}
          className="group flex items-center gap-3 rounded-xl bg-surface p-3 transition-[translate,box-shadow] duration-150 ease-soft hover:-translate-y-px hover:shadow-card"
        >
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              tint,
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-col">
            <b className="truncate font-semibold text-[14.5px]">{t(key)}</b>
            <small className="truncate text-[12.5px] text-ink-muted max-sm:hidden">
              {t(`${key}Hint`)}
            </small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
