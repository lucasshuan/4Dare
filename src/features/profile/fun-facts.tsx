"use client";

import {
  Coins,
  Eye,
  Flame,
  Heart,
  Palette,
  PartyPopper,
  Search,
  ShieldCheck,
  Tag,
  Target,
  Trophy,
  VenetianMask,
  Zap,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Portrait } from "@/components/ui/portrait";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { thumbUrl } from "@/game/character-search";
import type { GameKey } from "@/game/games";
import { FACTS_SHOWN, streakScore } from "@/game/profile/history";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import type { FactView, FactPicture as Pictured } from "@/server/contract";
import type { streaks } from "./garden-days";
import { ProfileLink } from "./profile-link";

/** A tile: what the fact is (small), the fact itself (big), a word more. */
type Fact = {
  key: string;
  icon: ReactNode;
  /** The face of a person fact: no faint icon in the corner. */
  person?: boolean;
  /** The tile's ground and its icon's colour. */
  tint: string;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  game: GameKey | null;
  /** How telling it is for this player: the tiles go most telling first. */
  score: number;
  /** The fact's character, in the corner; a tap spreads it over the tile. */
  picture?: Picture;
};

type Picture = Pictured & { name: string };

/** Days the longest streak needs before it is worth a tile. */
const STREAK_DAYS = 3;

/**
 * A character's picture as a small tilted card in the tile's corner; a tap
 * spreads it over the whole tile with the name on it, another folds it back.
 */
function FactPicture({ picture }: { picture: Picture }) {
  const t = useTranslations("profile.facts");
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-label={t("picture", { name: picture.name })}
      className={cn(
        "absolute z-10 overflow-hidden bg-surface shadow-card transition-all duration-300 ease-soft",
        open
          ? "top-0 left-0 h-full w-full rotate-0 rounded-xl p-0"
          : "top-[calc(100%-72px)] left-[calc(100%-60px)] h-[60px] w-12 rotate-6 rounded-lg p-0.5 hover:rotate-0 hover:scale-105",
      )}
    >
      <Portrait
        src={thumbUrl(picture.url, 480)}
        className={cn(
          "aspect-auto h-full bg-transparent",
          open ? "rounded-none" : "rounded-[6px]",
        )}
      />
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/75 to-transparent px-3.5 pt-8 pb-3 text-left text-white transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        <b className="truncate font-display font-extrabold text-[18px] leading-tight">
          {picture.name}
        </b>
        {picture.origin ? (
          <small className="truncate font-semibold text-[12px] opacity-85">
            {picture.origin}
          </small>
        ) : null}
      </span>
    </button>
  );
}

/**
 * The curiosities, each in its own small tinted tile under the profile's head:
 * the facts the server found and the longest streak, the most telling ones
 * for this player first.
 */
export function FunFacts({
  facts,
  streak,
  className,
}: {
  facts: FactView[];
  streak: ReturnType<typeof streaks>;
  className?: string;
}) {
  const t = useTranslations("profile.facts");
  const lang = useLocale() as Lang;
  const format = useFormatter();
  const gameName = useGameName();
  const items: Fact[] = [];
  const minutes = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const picture = (p: Pictured | null, name: string) =>
    p ? { ...p, name } : undefined;
  for (const f of facts) {
    const { game, score } = f;
    if (f.kind === "partner" || f.kind === "rival")
      items.push({
        key: f.kind,
        icon: <Avatar avatar={f.person.avatar} size={30} />,
        person: true,
        tint: "bg-surface",
        game,
        score,
        label: f.kind === "partner" ? t("partnerLabel") : t("rival"),
        value: (
          <ProfileLink
            handle={f.person.handle}
            className="underline-offset-2 hover:underline"
          >
            {f.person.name}
          </ProfileLink>
        ),
        sub:
          f.kind === "partner"
            ? t("partnerSub", { together: f.together, ahead: f.ahead })
            : t("rivalSub", { behind: f.behind, together: f.together }),
      });
    else if (f.kind === "winStreak")
      items.push({
        key: f.kind,
        icon: <Trophy />,
        tint: "bg-butter-soft text-on-butter",
        game,
        score,
        label: t("winStreak"),
        value: t("winStreakValue", { n: f.wins }),
        sub: t("winStreakSub"),
      });
    else if (f.kind === "favoriteGame")
      items.push({
        key: f.kind,
        icon: <Heart />,
        tint: "bg-no-soft text-no",
        game,
        score,
        label: t("favoriteGame"),
        value: gameName(f.game),
        sub: t("favoriteGameSub", { n: f.matches }),
      });
    else if (f.kind === "fastest")
      items.push({
        key: f.kind,
        icon: <Zap />,
        tint: "bg-butter-soft text-on-butter",
        game,
        score,
        label: t("fastest"),
        value: f.characterName,
        sub:
          f.timeMs === null
            ? t("fastestAt", { at: f.at })
            : `${minutes(f.timeMs)} · ${t("fastestAt", { at: f.at })}`,
        picture: picture(f.picture, f.characterName),
      });
    else if (f.kind === "hardest")
      items.push({
        key: f.kind,
        icon: <ShieldCheck />,
        tint: "bg-(--accent-soft) text-(--accent)",
        game,
        score,
        label: t("hardest"),
        value: f.characterName,
        sub: f.to
          ? t("hardestSubTo", { name: f.to.name, questions: f.questions })
          : t("hardestSub", { questions: f.questions }),
        picture: picture(f.picture, f.characterName),
      });
    else if (f.kind === "sharpEye")
      items.push({
        key: f.kind,
        icon: <Eye />,
        tint: "bg-sky-soft text-sky",
        game,
        score,
        label: t("sharpEye"),
        value: t("sharpEyeValue", { n: f.discovered, total: f.tried }),
        sub: t("sharpEyeSub"),
      });
    else if (f.kind === "theme")
      items.push({
        key: f.kind,
        icon: <Palette />,
        tint: "bg-yes-soft text-yes",
        game,
        score,
        label: t("theme"),
        value: f.theme[lang] || f.theme.en,
        sub: t("themeSub", { n: f.count }),
      });
    else if (f.kind === "escape")
      items.push({
        key: f.kind,
        icon: <VenetianMask />,
        tint: "bg-no-soft text-no",
        game,
        score,
        label: t("escape"),
        value: f.characterName,
        sub: t("escapeSub", { votes: f.votes }),
      });
    else if (f.kind === "firstVote")
      items.push({
        key: f.kind,
        icon: <Search />,
        tint: "bg-sky-soft text-sky",
        game,
        score,
        label: t("firstVote"),
        value: t("firstVoteValue", { n: f.count }),
        sub: t("firstVoteSub"),
      });
    else if (f.kind === "bargain")
      items.push({
        key: f.kind,
        icon: <Tag />,
        tint: "bg-yes-soft text-yes",
        game,
        score,
        label: t("bargain"),
        value: t("bargainValue", { coins: f.spent }),
        sub: t("bargainSub"),
      });
    else if (f.kind === "splurge")
      items.push({
        key: f.kind,
        icon: <Coins />,
        tint: "bg-butter-soft text-on-butter",
        game,
        score,
        label: t("splurge"),
        value: t("splurgeValue", { coins: f.price }),
        sub: t("splurgeSub"),
      });
    else if (f.kind === "crowd")
      items.push({
        key: f.kind,
        icon: <PartyPopper />,
        tint: "bg-apricot-soft text-apricot",
        game,
        score,
        label: t("crowd"),
        value: t("crowdValue", { n: f.count }),
        sub: t("crowdSub"),
      });
    else
      items.push({
        key: f.kind,
        icon: <Target />,
        tint: "bg-sky-soft text-sky",
        game,
        score,
        label: t("bullseye"),
        value: f.guess,
        sub: t("bullseyeSub"),
      });
  }
  if (streak.best >= STREAK_DAYS && streak.bestEnd !== null)
    items.push({
      key: "streak",
      icon: <Flame />,
      tint: "bg-apricot-soft text-apricot",
      game: null,
      score: streakScore(streak.best),
      label: t("streak"),
      value: t("streakValue", { n: streak.best }),
      sub: format.dateTime(streak.bestEnd, { month: "long", year: "numeric" }),
    });
  if (items.length === 0) return null;
  const shown = items.sort((a, b) => b.score - a.score).slice(0, FACTS_SHOWN);
  return (
    <section aria-label={t("title")} className={className}>
      {/* a swipeable row on phones, a grid of tiles wider */}
      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-(--pad) pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:overflow-visible sm:pb-0">
        {shown.map((it) => (
          <li
            key={it.key}
            className={cn(
              "relative flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-xl p-3.5 sm:w-auto",
              it.tint,
            )}
          >
            {/* the icon again, big and faint in the corner */}
            {it.person || it.picture ? null : (
              <span
                aria-hidden
                className="-right-3 -bottom-4 pointer-events-none absolute rotate-12 opacity-[0.12] [&_svg]:size-[84px] [&_svg]:stroke-[1.5]"
              >
                {it.icon}
              </span>
            )}
            <span className="relative flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-pill [&_svg]:size-4 [&_svg]:stroke-2",
                  !it.person && "bg-surface/70",
                )}
              >
                {it.icon}
              </span>
              <span className="line-clamp-2 min-w-0 flex-1 font-semibold text-[12.5px] text-ink-muted leading-tight">
                {it.label}
              </span>
              {it.game ? (
                <span title={gameName(it.game)} className="flex shrink-0">
                  <GameThumb game={it.game} size="tiny" />
                </span>
              ) : null}
            </span>
            <b
              className={cn(
                "relative mt-3 line-clamp-2 font-display font-extrabold text-[22px] text-ink leading-[1.1] tracking-[-0.01em]",
                it.picture && "pr-14",
              )}
            >
              {it.value}
            </b>
            <span
              className={cn(
                "relative mt-1 truncate text-[12.5px] text-ink-muted",
                it.picture && "pr-14",
              )}
            >
              {it.sub}
            </span>
            {it.picture ? <FactPicture picture={it.picture} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
