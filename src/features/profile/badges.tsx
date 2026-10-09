"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Camera,
  CircleHelp,
  Coins,
  Compass,
  Flame,
  Gamepad2,
  ImageUp,
  Laugh,
  type LucideIcon,
  Medal as Medal_,
  Search,
  Shapes,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trophy,
  Tv,
  UserRoundPlus,
  Users,
  VenetianMask,
  Zap,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { isGameKey } from "@/game/games";
import { type BadgeId, TIERS } from "@/game/profile/badges";
import { GAME_XP, levelOf, XP } from "@/game/profile/xp";
import { cn } from "@/lib/cn";
import type { BadgeView, ProfileView } from "@/server/contract";
import { LevelTag, XpBar } from "./level";
import { accentStyle } from "./profile-body";

const ICON: Record<BadgeId, LucideIcon> = {
  matches: Gamepad2,
  wins: Trophy,
  streak: Flame,
  people: Users,
  discovered: Sparkles,
  quick: Zap,
  themes: Compass,
  tough: ShieldCheck,
  pokerFace: VenetianMask,
  nose: Search,
  chameleon: Shapes,
  bullseye: Target,
  coach: Medal_,
  bargain: Tag,
  allIn: Coins,
  stage: Laugh,
  booth: Tv,
  pictures: Camera,
  covers: ImageUp,
  characters: UserRoundPlus,
};

/** Each tier's metal: the medal's fill, its rim and the ribbon's tint. */
const METAL = {
  bronze: { from: "#F2B27C", to: "#B8692F", rim: "#8C4F22", soft: "#F7DCC4" },
  silver: { from: "#F1F4F9", to: "#9AA6B8", rim: "#6E7A8E", soft: "#E3E8F0" },
  gold: { from: "#FBE58A", to: "#D69E1C", rim: "#9C7210", soft: "#F8EDBE" },
} as const;

/** Level, how XP comes, and every badge by group: every game's, each game's, the library's. */
export function BadgesPanel({ view }: { view: ProfileView }) {
  const t = useTranslations("profile.badges");
  const gameName = useGameName();
  const groups = [...new Set(view.badges.map((b) => b.group))];
  return (
    <div className="flex flex-col gap-4">
      <LevelCard xp={view.xp} accent={view.accent} />
      {groups.map((group) => (
        <section
          key={group}
          className="flex flex-col gap-4 rounded-xl bg-surface p-4 sm:p-5"
        >
          <h3 className="flex items-center gap-2 font-bold font-display text-[17px]">
            {isGameKey(group) ? <GameThumb game={group} size="xs" /> : null}
            {isGameKey(group) ? gameName(group) : t(`groups.${group}`)}
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-3 gap-y-5">
            {view.badges
              .filter((b) => b.group === group)
              .map((b) => (
                <Medal key={b.id} badge={b} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The level and the bar to the next; how XP is earned opens beside them. */
function LevelCard({ xp, accent }: { xp: number; accent: string | null }) {
  const t = useTranslations("profile.level");
  const tb = useTranslations("profile.badges");
  const format = useFormatter();
  const { level, into, need } = levelOf(xp);
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-4 sm:p-5">
      <LevelTag
        level={level}
        on="surface"
        className="px-3.5 py-2.5 text-[26px]"
      />
      <div className="flex min-w-[200px] flex-1 flex-col gap-2">
        <b className="font-bold font-display text-[22px]">
          {t("title", { n: level })}
        </b>
        <XpBar xp={xp} />
        <span className="text-[13px] text-ink-muted">
          {t("left", {
            total: format.number(xp),
            left: format.number(need - into),
            next: level + 1,
          })}
        </span>
      </div>
      <Popover.Root>
        <Popover.Trigger className="inline-flex h-9 shrink-0 items-center gap-2 rounded-pill border-[1.5px] border-line-strong bg-surface px-3.5 font-semibold text-sm transition-colors duration-150 hover:bg-sunken data-popup-open:bg-sunken [&_svg]:size-4">
          <CircleHelp strokeWidth={1.75} />
          {tb("xpRules")}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-[60]"
          >
            <Popover.Popup
              style={accentStyle(accent)}
              className="w-[min(320px,calc(100vw-1.5rem))] origin-[var(--transform-origin)] rounded-xl bg-surface p-4 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
            >
              <Popover.Title className="m-0 mb-2 font-semibold text-sm">
                {tb("xpRules")}
              </Popover.Title>
              <XpRules />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </section>
  );
}

/** Every way to earn XP: in every game, then each game's own. */
function XpRules() {
  const tb = useTranslations("profile.badges");
  const gameName = useGameName();
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
      <li className="font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
        {tb("everyGame")}
      </li>
      <Rule label={tb("rules.finish")} xp={XP.finish} />
      <Rule label={tb("rules.first")} xp={XP.first} />
      <Rule label={tb("rules.dayFirst")} xp={XP.dayFirst} />
      <li className="mt-1 flex items-center gap-1.5 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
        <GameThumb game="who-am-i" size="tiny" />
        {gameName("who-am-i")}
      </li>
      <Rule
        label={tb("rules.discovered")}
        xp={GAME_XP["who-am-i"].discovered}
      />
      <li className="mt-1 flex items-center gap-1.5 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
        <GameThumb game="impostor" size="tiny" />
        {gameName("impostor")}
      </li>
      <Rule label={tb("rules.rightVote")} xp={GAME_XP.impostor.rightVote} />
      <Rule label={tb("rules.survived")} xp={GAME_XP.impostor.survived} />
      <Rule label={tb("rules.guessHit")} xp={GAME_XP.impostor.guessHit} />
      <li className="mt-1 flex items-center gap-1.5 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
        <GameThumb game="lineup" size="tiny" />
        {gameName("lineup")}
      </li>
      <Rule label={tb("rules.roundWon")} xp={GAME_XP.lineup.roundWon} />
      <Rule label={tb("rules.vote")} xp={GAME_XP.lineup.vote} />
      <Rule label={tb("rules.crowd")} xp={GAME_XP.lineup.crowd} />
      <Rule label={tb("rules.presented")} xp={GAME_XP.lineup.presented} />
    </ul>
  );
}

function Rule({ label, xp }: { label: string; xp: number }) {
  return (
    <li className="flex justify-between gap-2.5">
      <span>{label}</span>
      <b className="font-medium font-mono text-(--accent)">+{xp}</b>
    </li>
  );
}

/** A hexagon pointing up, in a 100 × 112 box. */
const HEX = "M50 3 L95 29 L95 83 L50 109 L5 83 L5 29 Z";

/**
 * A badge as a medal: its tier's metal and the next goal on a ribbon; still
 * locked, a grey outline with how far it got.
 */
function Medal({ badge }: { badge: BadgeView }) {
  const t = useTranslations("profile.badges");
  const format = useFormatter();
  const Icon = ICON[badge.id];
  const tier = badge.tier ? TIERS[badge.tier - 1] : null;
  const metal = tier ? METAL[tier] : null;
  // the ribbon names the tier held; the bar runs to the next one
  const held = badge.goals[Math.max(0, badge.tier - 1)];
  const goal = badge.goals[Math.min(badge.tier, 2)];
  const gradient = `medal-${badge.id}`;
  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <span className="relative flex h-[78px] w-[70px] items-center justify-center">
        <svg
          viewBox="0 0 100 112"
          aria-hidden="true"
          className="absolute inset-0 size-full"
        >
          {metal ? (
            <>
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0.4" y2="1">
                  <stop offset="0" stopColor={metal.from} />
                  <stop offset="1" stopColor={metal.to} />
                </linearGradient>
              </defs>
              <path
                d={HEX}
                fill={`url(#${gradient})`}
                stroke={metal.rim}
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M50 14 L85 34 L85 78 L50 98 L15 78 L15 34 Z"
                fill="none"
                stroke="rgba(255,255,255,.55)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <path
              d={HEX}
              className="fill-sunken stroke-line-strong"
              strokeWidth="3"
              strokeDasharray="7 6"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <Icon
          className={cn(
            "relative size-7",
            metal
              ? "drop-shadow-[0_1px_0_rgba(255,255,255,.5)]"
              : "text-ink-muted",
          )}
          style={metal ? { color: metal.rim } : undefined}
          strokeWidth={2}
        />
      </span>
      <b className="font-semibold text-[14px] leading-tight">
        {t(`names.${badge.id}`)}
      </b>
      {tier && metal ? (
        <span
          className="rounded-pill px-2.5 py-0.5 font-semibold text-[11.5px]"
          style={{ backgroundColor: metal.soft, color: metal.rim }}
          title={
            badge.earnedAt
              ? t("since", {
                  date: format.dateTime(badge.earnedAt, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })
              : undefined
          }
        >
          {t(`tiers.${tier}`)} · {t(`goals.${badge.id}`, { n: held })}
        </span>
      ) : (
        <span className="text-[11.5px] text-ink-muted">
          {t(`goals.${badge.id}`, { n: held })}
        </span>
      )}
      {badge.tier < 3 ? (
        <span className="flex w-full max-w-[120px] flex-col gap-1">
          <span className="h-1 overflow-hidden rounded-pill bg-sunken">
            <i
              className="block h-full rounded-pill bg-line-strong"
              style={{ width: `${Math.min(100, (badge.value / goal) * 100)}%` }}
            />
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {t("progress", {
              value: format.number(badge.value),
              goal: format.number(goal),
            })}
          </span>
        </span>
      ) : null}
    </li>
  );
}
