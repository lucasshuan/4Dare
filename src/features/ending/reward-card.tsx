"use client";

import {
  ChevronUp,
  Flag,
  Laugh,
  Lock,
  type LucideIcon,
  Medal,
  Search,
  Sparkles,
  Sun,
  ThumbsUp,
  Trophy,
  Tv,
  Users,
  Vote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useId } from "react";
import { PROVIDER_NAME, ProviderLogo } from "@/components/ui/auth-button";
import { avatarSrc } from "@/features/opening/title-kit";
import {
  BADGE_ICON,
  HEX,
  HEX_INNER,
  METAL,
  short,
} from "@/features/profile/medal-art";
import { TIERS } from "@/game/profile/badges";
import type { MatchReward, RewardRow } from "@/game/profile/reward";
import type { Avatar } from "@/game/types";
import type { Provider } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import s from "./end-room.module.css";

/** Seconds as a CSS time. */
const sec = (x: number) => `${Math.max(0, x).toFixed(3)}s`;
const pct = (x: number) => `${Math.round(x * 10) / 10}%`;

const ROW_ICON: Record<RewardRow["kind"], LucideIcon> = {
  finish: Flag,
  first: Trophy,
  won: Users,
  discovered: Sparkles,
  rightVote: Vote,
  survived: Search,
  guessHit: Sparkles,
  dayFirst: Sun,
  roundWon: Medal,
  votes: ThumbsUp,
  crowd: Laugh,
  presented: Tv,
};

/** The six sparks of a level up, round the ring. */
const SPARKS = [0, 60, 120, 180, 240, 300];

export interface RewardWho {
  name: string;
  avatar: Avatar;
  /** Their seat colour, the ring of a guest's avatar. */
  seat: string;
  /** The line under the name: their side, their round, their votes. */
  sub: string;
}

/** A row's words. */
function useRowLabel() {
  const t = useTranslations("room.end.rows");
  return (r: RewardRow) => {
    switch (r.kind) {
      case "discovered":
      case "roundWon":
        return t(r.kind, { round: r.round });
      case "survived":
        return r.free ? t("survivedFree") : t("survived", { n: r.n });
      case "rightVote":
      case "votes":
      case "crowd":
      case "presented":
        return t(r.kind, { n: r.n });
      default:
        return t(r.kind);
    }
  };
}

/**
 * What the match gave: the XP counting up, line by line, and for an account
 * the level bar filling (a level up swaps the number with a flash) and a badge
 * tier reached; a guest is asked to sign in to keep it. It comes in from the
 * left; `leaving` folds it away for the pill.
 */
export function RewardCard({
  reward,
  who,
  leaving,
  onSignIn,
  signingIn,
}: {
  reward: MatchReward;
  who: RewardWho;
  leaving: boolean;
  onSignIn: (provider: Provider) => void;
  signingIn: boolean;
}) {
  const t = useTranslations("room.end");
  const tb = useTranslations("profile.badges");
  const label = useRowLabel();
  const gradient = useId();
  const { rows, xp, level, badge } = reward;
  const account = level !== null;
  // the beats after it comes in, as the prototype has them
  const lvlD = 0.6 + rows.length * 0.14 + 0.1;
  const barD = 0.6 + rows.length * 0.14 + 0.35;
  const swapD = barD + 0.55;
  const newD = barD + 0.7;
  const up = !!level && level.after.level > level.before.level;
  const from = level?.before;
  const to = level?.after;
  // into the old level: where the bar starts, and where it stops when it doesn't fill up
  const startAt = from ? from.into / from.need : 0;
  const stopAt = from && !up ? (from.into + xp) / from.need : 1;
  const endAt = to ? to.into / to.need : 0;
  const badgeD = barD + (up ? 1.5 : 0.9);
  const tier = badge ? TIERS[badge.tier - 1] : null;
  const metal = tier ? METAL[tier] : null;
  const ribbon = badge ? short(badge.goal).length * 3.6 + 9 : 0;
  const BadgeIcon = badge ? BADGE_ICON[badge.id] : null;
  return (
    <section
      className={cn(s.card, leaving && s.leaving)}
      aria-label={t("reopen")}
    >
      <div className={s.top}>
        <span className={s.lv}>
          {account && from ? (
            <svg className={s.ring} viewBox="0 0 56 56" aria-hidden="true">
              <circle
                cx="28"
                cy="28"
                r="25.5"
                fill="none"
                strokeWidth="5"
                style={{ stroke: "var(--surface-sunken)" }}
              />
              <circle
                className={cn(s.arc, up && s.up)}
                cx="28"
                cy="28"
                r="25.5"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength="100"
                style={
                  {
                    stroke: "var(--sky)",
                    "--o1": (100 - 100 * startAt).toFixed(1),
                    "--o2": (100 - 100 * stopAt).toFixed(1),
                    animationDelay: up
                      ? `${sec(barD)}, ${sec(swapD)}`
                      : sec(barD),
                  } as CSSProperties
                }
              />
              {up ? (
                <circle
                  className={s.arcB}
                  cx="28"
                  cy="28"
                  r="25.5"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  pathLength="100"
                  style={
                    {
                      stroke: "var(--sky)",
                      "--o3": (100 - 100 * endAt).toFixed(1),
                      animationDelay: sec(newD),
                    } as CSSProperties
                  }
                />
              ) : null}
            </svg>
          ) : null}
          {up ? (
            <>
              <span
                className={s.flash}
                style={{ animationDelay: sec(swapD) }}
                aria-hidden="true"
              />
              {SPARKS.map((a) => (
                <span
                  key={a}
                  className={s.spark}
                  style={
                    {
                      "--a": `${a}deg`,
                      animationDelay: sec(swapD),
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
              ))}
            </>
          ) : null}
          <span
            className={s.av}
            style={{
              width: account ? 40 : 46,
              height: account ? 40 : 46,
              background: who.avatar.color,
              boxShadow: account
                ? undefined
                : `0 0 0 2px var(--surface), 0 0 0 4.5px ${who.seat}`,
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
            <img src={avatarSrc(who.avatar)} alt="" />
          </span>
          {from && to ? (
            <span className={s.tag}>
              {up ? (
                <>
                  <span
                    className={cn(s.g, s.old)}
                    style={{ animationDelay: sec(swapD) }}
                  >
                    <small>{t("levelShort")}</small>
                    {from.level}
                  </span>
                  <span
                    className={cn(s.g, s.new)}
                    style={{ animationDelay: sec(swapD) }}
                  >
                    <small>{t("levelShort")}</small>
                    {to.level}
                  </span>
                </>
              ) : (
                <span className={s.g}>
                  <small>{t("levelShort")}</small>
                  {from.level}
                </span>
              )}
            </span>
          ) : null}
        </span>
        <span className={s.who}>
          <b>{who.name}</b>
          <span className={s.sub}>{account ? who.sub : t("guest")}</span>
        </span>
        <span className={cn(s.xp, !account && s.locked)}>
          {account ? null : (
            <Lock className={s.icon} style={{ width: 14, height: 14 }} />
          )}
          <span
            className={s.count}
            style={{ "--to": xp, animationDelay: sec(0.55) } as CSSProperties}
          />
          <b>XP</b>
        </span>
      </div>
      <div className={s.hr} />
      <div className={s.rows}>
        {rows.map((r, i) => {
          const Icon = ROW_ICON[r.kind];
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: the lines in order, never reordered
              key={i}
              className={s.row}
              style={{ animationDelay: sec(0.55 + i * 0.14) }}
            >
              <Icon className={s.icon} aria-hidden="true" />
              <span>{label(r)}</span>
              <span className={s.v}>+{r.xp}</span>
            </div>
          );
        })}
      </div>
      {from && to ? (
        <>
          <div className={s.hr} />
          <div className={s.lvl} style={{ animationDelay: sec(lvlD) }}>
            <div className={s.lvlHead}>
              <span className={cn(s.gg, s.lvn)}>
                {up ? (
                  <>
                    <span
                      className={cn(s.g, s.old)}
                      style={{ animationDelay: sec(swapD) }}
                    >
                      {t("level", { n: from.level })}
                    </span>
                    <span
                      className={cn(s.g, s.new)}
                      style={{ animationDelay: sec(swapD) }}
                    >
                      {t("level", { n: to.level })}
                    </span>
                  </>
                ) : (
                  <span className={s.g}>{t("level", { n: from.level })}</span>
                )}
              </span>
              {up ? (
                <span className={s.lvUp} style={{ animationDelay: sec(swapD) }}>
                  <Sparkles
                    className={s.icon}
                    style={{ width: 12, height: 12 }}
                    aria-hidden="true"
                  />
                  {t("levelUp")}
                </span>
              ) : null}
              <span className={s.fill} />
              <span className={cn(s.gg, s.xpn)}>
                {up ? (
                  <>
                    <span
                      className={cn(s.g, s.old)}
                      style={{ animationDelay: sec(swapD) }}
                    >
                      {t("xpOf", { into: from.into, need: from.need })}
                    </span>
                    <span
                      className={cn(s.g, s.new)}
                      style={{ animationDelay: sec(swapD) }}
                    >
                      {t("xpOf", { into: to.into, need: to.need })}
                    </span>
                  </>
                ) : (
                  <span className={s.g}>
                    {t("xpOf", { into: to.into, need: to.need })}
                  </span>
                )}
              </span>
            </div>
            <div className={s.bar}>
              <i
                className={cn(s.fa, up && s.up)}
                style={
                  {
                    "--from": pct(100 * startAt),
                    "--to": pct(100 * Math.min(1, stopAt)),
                    animationDelay: up
                      ? `${sec(barD)}, ${sec(swapD)}`
                      : sec(barD),
                  } as CSSProperties
                }
              />
              {up ? (
                <i
                  className={s.fb}
                  style={
                    {
                      "--to": pct(100 * endAt),
                      animationDelay: sec(newD),
                    } as CSSProperties
                  }
                />
              ) : null}
            </div>
          </div>
          {badge && metal && BadgeIcon && tier ? (
            <>
              <div className={s.hr} />
              <div className={s.badge} style={{ animationDelay: sec(badgeD) }}>
                <svg
                  className={s.medal}
                  viewBox="0 0 48 54"
                  width="40"
                  height="45"
                  aria-hidden="true"
                  style={{ animationDelay: sec(badgeD + 0.1) }}
                >
                  <defs>
                    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={metal.top} />
                      <stop offset="1" stopColor={metal.base} />
                    </linearGradient>
                    <clipPath id={`${gradient}-hex`}>
                      <path d={HEX} />
                    </clipPath>
                  </defs>
                  <path
                    d={HEX}
                    fill={`url(#${gradient})`}
                    stroke={metal.rim}
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path d={HEX_INNER} fill="#ffffff" opacity=".14" />
                  <g clipPath={`url(#${gradient}-hex)`}>
                    <g transform="skewX(-20)">
                      <rect
                        className={s.shine}
                        x="0"
                        y="0"
                        width="9"
                        height="54"
                        fill="#ffffff"
                        opacity=".6"
                        style={{ animationDelay: sec(badgeD + 0.6) }}
                      />
                    </g>
                  </g>
                  <BadgeIcon
                    x={14}
                    y={13}
                    size={20}
                    strokeWidth={2.2}
                    color="#ffffff"
                  />
                  <rect
                    x={24 - ribbon / 2}
                    y="39.5"
                    width={ribbon}
                    height="13"
                    rx="6.5"
                    fill={metal.rim}
                    strokeWidth="1.5"
                    style={{ stroke: "var(--surface)" }}
                  />
                  <text
                    x="24"
                    y="49"
                    textAnchor="middle"
                    fill="#ffffff"
                    style={{
                      font: "800 9.5px var(--font-display)",
                    }}
                  >
                    {short(badge.goal)}
                  </text>
                </svg>
                <span className={s.who}>
                  <b style={{ fontSize: 14 }}>
                    {tb(`names.${badge.id}`)} · {tb(`tiers.${tier}`)}
                  </b>
                  <span className={s.sub} style={{ fontSize: 12 }}>
                    {tb(`goals.${badge.id}`, { n: badge.goal })}
                  </span>
                </span>
                <span className={s.chip}>{t("badgeNew")}</span>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className={s.save} style={{ animationDelay: sec(lvlD) }}>
          <span className={s.saveText}>
            <b>{t("save", { xp })}</b>
            <span className={s.sub}>{t("saveBody")}</span>
          </span>
          <div className={s.auths}>
            {(["discord", "google"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={s.auth}
                disabled={signingIn}
                aria-label={t("signInWith", { provider: PROVIDER_NAME[p] })}
                onClick={() => onSignIn(p)}
              >
                <ProviderLogo provider={p} />
                {PROVIDER_NAME[p]}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** The card, folded: the level ring and the XP for an account, a lock and "sign in" for a guest. */
export function RewardPill({
  reward,
  who,
  late,
  onOpen,
  onSignIn,
}: {
  reward: MatchReward;
  who: RewardWho;
  /** Coming in as the card folds away. */
  late: boolean;
  onOpen: () => void;
  onSignIn: () => void;
}) {
  const t = useTranslations("room.end");
  const { level, badge, xp } = reward;
  const tier = badge ? TIERS[badge.tier - 1] : null;
  const metal = tier ? METAL[tier] : null;
  const BadgeIcon = badge ? BADGE_ICON[badge.id] : null;
  const gradient = useId();
  if (!level)
    return (
      <div className={cn(s.pill, late && s.late)}>
        <span className={s.lock}>
          <Lock
            className={s.icon}
            style={{ width: 20, height: 20 }}
            aria-hidden="true"
          />
        </span>
        <span className={s.who}>
          <b>{t("orphan", { xp })}</b>
          <span className={s.sub}>{t("orphanBody")}</span>
        </span>
        <button type="button" className={s.keySm} onClick={onSignIn}>
          {t("signIn")}
        </button>
      </div>
    );
  const to = level.after;
  return (
    <div className={cn(s.pill, late && s.late)}>
      <span className={s.lv} style={{ width: 52, height: 52 }}>
        <svg
          className={s.ring}
          viewBox="0 0 56 56"
          aria-hidden="true"
          style={{ width: 52, height: 52 }}
        >
          <circle
            cx="28"
            cy="28"
            r="25.5"
            fill="none"
            strokeWidth="4.5"
            style={{ stroke: "var(--surface-sunken)" }}
          />
          <circle
            cx="28"
            cy="28"
            r="25.5"
            fill="none"
            strokeWidth="4.5"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={(100 - (100 * to.into) / to.need).toFixed(1)}
            style={{ stroke: "var(--sky)" }}
          />
        </svg>
        <span
          className={s.av}
          style={{ width: 38, height: 38, background: who.avatar.color }}
        >
          {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
          <img src={avatarSrc(who.avatar)} alt="" />
        </span>
      </span>
      <span className={s.who}>
        <b>{t("level", { n: to.level })}</b>
        <span className={cn(s.sub, s.mono)}>
          {t("xpOf", { into: to.into, need: to.need })}
        </span>
      </span>
      <span className={s.xpChip}>{t("xpChip", { xp })}</span>
      {badge && metal && BadgeIcon ? (
        <svg
          viewBox="0 0 48 54"
          width="26"
          height="30"
          aria-hidden="true"
          style={{ flex: "none" }}
        >
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
          <BadgeIcon
            x={14}
            y={13}
            size={20}
            strokeWidth={2.4}
            color="#ffffff"
          />
        </svg>
      ) : null}
      <button
        type="button"
        className={s.ghost}
        aria-label={t("reopen")}
        onClick={onOpen}
      >
        <ChevronUp
          className={s.icon}
          style={{ width: 20, height: 20 }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
