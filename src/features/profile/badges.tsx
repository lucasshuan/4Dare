"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Camera,
  CircleHelp,
  Coins,
  Compass,
  Flame,
  Gamepad2,
  ImagePlus,
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
import { useId } from "react";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { isGameKey } from "@/game/games";
import { type BadgeId, TIERS } from "@/game/profile/badges";
import { GAME_XP, levelOf, XP } from "@/game/profile/xp";
import { cn } from "@/lib/cn";
import type { BadgeView, ProfileView } from "@/server/contract";
import { XpBar } from "./level";
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

/** Each tier's metal: the medal's top and base, and the rim and ribbon. */
const METAL = {
  bronze: { top: "#e3a878", base: "#b8733f", rim: "#7a431d" },
  silver: { top: "#d3dae5", base: "#8f9bb0", rim: "#535e75" },
  gold: { top: "#f7d97c", base: "#d6a11c", rim: "#8a650a" },
} as const;

/** Level, what the colours mean, and every badge by group: every game's, each game's, the library's. */
export function BadgesPanel({ view }: { view: ProfileView }) {
  const t = useTranslations("profile.badges");
  const gameName = useGameName();
  const groups = [...new Set(view.badges.map((b) => b.group))];
  return (
    <div className="@container flex flex-col gap-4.5">
      <LevelCard xp={view.xp} accent={view.accent} />
      <Legend />
      {groups.map((group) => {
        const badges = view.badges.filter((b) => b.group === group);
        return (
          <section key={group} className="flex flex-col gap-2.5">
            <h3 className="flex items-center gap-2">
              {isGameKey(group) ? (
                <GameThumb game={group} size="tiny" />
              ) : group === "general" ? (
                <Sparkles className="size-4" strokeWidth={2} />
              ) : (
                <ImagePlus className="size-4" strokeWidth={2} />
              )}
              <span className="font-bold font-display text-[18px]">
                {isGameKey(group) ? gameName(group) : t(`groups.${group}`)}
              </span>
              <span className="font-semibold text-[13px] text-ink-muted">
                {t("count", {
                  earned: badges.filter((b) => b.tier > 0).length,
                  total: badges.length,
                })}
              </span>
            </h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 @min-[760px]:grid-cols-4">
              {badges.map((b) => (
                <Badge key={b.id} badge={b} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Bronze, silver and gold as diamonds, and what they mean. */
function Legend() {
  const t = useTranslations("profile.badges");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-semibold text-[13px]">
      {TIERS.map((tier) => (
        <span key={tier} className="inline-flex items-center gap-2">
          <i
            className="block size-3 rotate-45 rounded-[3px]"
            style={{ backgroundColor: METAL[tier].base }}
          />
          {t(`tiers.${tier}`)}
        </span>
      ))}
      <span className="text-ink-muted">{t("legend")}</span>
    </div>
  );
}

/** The level in a ring of the XP into it, the bar to the next; how XP is earned opens beside them. */
function LevelCard({ xp, accent }: { xp: number; accent: string | null }) {
  const t = useTranslations("profile.level");
  const tb = useTranslations("profile.badges");
  const format = useFormatter();
  const { level, into, need } = levelOf(xp);
  const share = need ? into / need : 0;
  return (
    <section className="flex flex-wrap items-center gap-5 rounded-[24px] bg-surface p-5">
      <span
        aria-hidden="true"
        className="grid size-21 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--accent) ${share * 360}deg, var(--surface-sunken) 0)`,
        }}
      >
        <span className="grid size-17 place-items-center rounded-full bg-surface font-display font-extrabold text-[30px] tabular-nums">
          {level}
        </span>
      </span>
      <div className="flex min-w-[200px] flex-1 flex-col gap-2">
        <b className="font-bold font-display text-[22px]">
          {t("title", { n: level })}
        </b>
        <XpBar xp={xp} height={10} numbers={false} />
        <span className="font-semibold text-[13.5px] text-ink-muted">
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

/** A goal short enough for the ribbon: 1000 is "1K". */
const short = (n: number) =>
  n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);

/**
 * A badge: its medal beside the name and the goal it runs to now. Not yet
 * gold, a thin bar of how far it got toward that goal.
 */
function Badge({ badge }: { badge: BadgeView }) {
  const t = useTranslations("profile.badges");
  const format = useFormatter();
  const tier = badge.tier ? TIERS[badge.tier - 1] : null;
  // the ribbon holds the tier's goal (the first one while locked); the text and bar run to the next
  const held = badge.goals[Math.max(0, badge.tier - 1)];
  const goal = badge.goals[Math.min(badge.tier, 2)];
  return (
    <li
      className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-[18px] bg-surface p-3.5"
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
      <Medal id={badge.id} tier={tier} goal={short(held)} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <b
          className={cn(
            "font-semibold text-[14px] leading-tight",
            !tier && "text-ink-muted",
          )}
        >
          {t(`names.${badge.id}`)}
        </b>
        <span className="sr-only">
          {tier ? t(`tiers.${tier}`) : t("locked")}
        </span>
        <span className="text-[12.5px] text-ink-muted leading-[1.35]">
          {t(`goals.${badge.id}`, { n: goal })}
        </span>
      </div>
      {badge.tier < 3 ? (
        <div className="col-span-full flex items-center gap-2 font-medium font-mono text-[12px] text-ink-muted">
          <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunken">
            <i
              className="block h-full rounded-pill bg-line-strong"
              style={{ width: `${Math.min(100, (badge.value / goal) * 100)}%` }}
            />
          </span>
          {t("progress", {
            value: format.number(badge.value),
            goal: format.number(goal),
          })}
        </div>
      ) : null}
    </li>
  );
}

/**
 * The medal: a hexagon in its tier's metal with the badge's icon and the goal
 * on a ribbon; locked, a dashed grey outline.
 */
function Medal({
  id,
  tier,
  goal,
}: {
  id: BadgeId;
  tier: (typeof TIERS)[number] | null;
  goal: string;
}) {
  const gradient = useId();
  const Icon = ICON[id];
  const metal = tier ? METAL[tier] : null;
  const ribbon = goal.length * 3.6 + 9;
  return (
    <svg
      viewBox="0 0 48 54"
      width={56}
      height={63}
      aria-hidden="true"
      className="overflow-visible"
    >
      {metal ? (
        <>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={metal.top} />
              <stop offset="1" stopColor={metal.base} />
            </linearGradient>
          </defs>
          <path
            d={HEX}
            fill={`url(#${gradient})`}
            stroke={metal.rim}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d={HEX_INNER} fill="#fff" opacity=".14" />
          <ellipse
            cx="17"
            cy="13"
            rx="6"
            ry="2.6"
            transform="rotate(-30 17 13)"
            fill="#fff"
            opacity=".3"
          />
        </>
      ) : (
        <path
          d={HEX}
          className="fill-sunken stroke-line-strong"
          strokeWidth="3"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}
      <Icon
        x={14}
        y={13}
        size={20}
        strokeWidth={2.2}
        color={metal ? "#fff" : undefined}
        className={metal ? undefined : "text-ink-muted"}
      />
      <rect
        x={24 - ribbon / 2}
        y="39.5"
        width={ribbon}
        height="13"
        rx="6.5"
        strokeWidth="1.5"
        fill={metal?.rim}
        className={metal ? "stroke-surface" : "fill-surface stroke-line-strong"}
      />
      <text
        x="24"
        y="49"
        textAnchor="middle"
        className={cn(
          "font-display font-extrabold text-[9.5px]",
          metal ? "fill-white" : "fill-ink-muted",
        )}
      >
        {goal}
      </text>
    </svg>
  );
}

/** The medal's hexagon and its lighter inner face, in a 48 × 54 box. */
const HEX = "M24 4 41.32 14V34L24 44 6.68 34V14Z";
const HEX_INNER = "M24 9.5 36.55 16.75V31.25L24 38.5 11.45 31.25V16.75Z";
