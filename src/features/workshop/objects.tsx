"use client";

import {
  CaseSensitive,
  Droplet,
  Flame,
  List,
  type LucideIcon,
  Scaling,
  Smile,
} from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { Portrait } from "@/components/ui/portrait";
import { useGameName } from "@/features/create/game-info";
import { tasteEmoji } from "@/features/library/taste";
import type { GameKey } from "@/game/games";
import { COLORS, EMOJI_PALETTES } from "@/game/impostor/answers";
import type { QuestionKind } from "@/game/impostor/types";
import { THEME_SETS, type ThemeSet } from "@/game/theme-sets";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import type {
  MissionDraft,
  StarterCard,
  WorkshopItem,
} from "@/server/community-contract";

export const KIND_ICON: Record<QuestionKind, LucideIcon> = {
  scale: Scaling,
  color: Droplet,
  emoji: Smile,
  pick: List,
  word: CaseSensitive,
};

const GAME_ART: Record<GameKey, string> = {
  "who-am-i": "var(--art-whoami)",
  impostor: "var(--art-impostor)",
  lineup: "var(--art-lineup)",
};

export const setEmoji = (set: ThemeSet | null) =>
  THEME_SETS.find((s) => s.key === set)?.emoji ?? "🏷️";

/** A game's name on its art colour. */
export function GamePill({ game }: { game: GameKey }) {
  const name = useGameName();
  return (
    <span
      style={{ background: GAME_ART[game] }}
      className="inline-flex h-6 items-center rounded-pill px-[9px] font-bold text-[11.5px] text-ink"
    >
      {name(game)}
    </span>
  );
}

/**
 * The traffic light: red left out, amber blinking up for votes (steady while a
 * curator looks), green live.
 */
export function Sema({
  status,
  large = false,
}: {
  status: WorkshopItem["status"];
  large?: boolean;
}) {
  const lamp = cn(
    "rounded-pill bg-[#3a4256]",
    large ? "size-[11px]" : "size-2",
  );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 rounded-pill bg-[#1e2433] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]",
        large ? "gap-1 px-[5px] py-1" : "gap-[3px] px-1 py-[3px]",
      )}
    >
      <i className={cn(lamp, status === "refused" && "bg-[#ef5a43]")} />
      <m.i
        animate={
          status === "voting" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }
        }
        transition={
          status === "voting"
            ? {
                duration: 1.6,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
              }
            : { duration: 0.2 }
        }
        className={cn(
          lamp,
          (status === "voting" || status === "review") && "bg-[#f5b82e]",
        )}
      />
      <i className={cn(lamp, status === "live" && "bg-[#34c99a]")} />
    </span>
  );
}

/** A theme as a butter tag: its set, its name, its examples and their tastes. */
export function ThemeObject({
  name,
  set,
  starters,
  slots = 0,
  placeholder = false,
  big = false,
}: {
  name: string;
  set: ThemeSet | null;
  starters: StarterCard[];
  /** Empty dashed places to fill (the composer's preview). */
  slots?: number;
  placeholder?: boolean;
  big?: boolean;
}) {
  const tSets = useTranslations("common.themeSets");
  const tastes = [
    ...new Set(starters.map((s) => s.taste).filter((t) => t !== null)),
  ];
  return (
    <div
      className={cn(
        "grid gap-3 rounded-[18px] bg-butter text-on-butter",
        big ? "gap-3.5 p-[18px]" : "p-3.5",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/50 text-[20px]">
          {setEmoji(set)}
        </span>
        <span className="min-w-0">
          <b
            className={cn(
              "block font-display font-extrabold leading-[1.15] tracking-[-0.01em] [overflow-wrap:anywhere]",
              big ? "text-[24px]" : "text-[18px]",
              placeholder && "opacity-45",
            )}
          >
            {name}
          </b>
          {set ? (
            <small className="block font-semibold text-[12.5px] opacity-80">
              {tSets(set)}
            </small>
          ) : null}
        </span>
      </div>
      <div className="flex items-center">
        <div className="flex pl-2">
          {starters.slice(0, 5).map((s, i) => (
            <m.span
              key={s.id}
              initial={{ opacity: 0, scale: 0.8, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.34, ease: ease.soft, delay: i * 0.04 }}
              title={s.name}
              className="-ml-2 block w-9 shrink-0 overflow-hidden rounded-[10px] shadow-[0_0_0_2px_var(--butter)]"
            >
              <Portrait src={s.imageUrl} className="rounded-none" />
            </m.span>
          ))}
          {Array.from(
            { length: Math.max(0, slots - starters.length) },
            (_, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: empty places
                key={i}
                className="-ml-2 block aspect-[4/5] w-9 shrink-0 rounded-[10px] border-[1.5px] border-on-butter/35 border-dashed first:ml-0"
              />
            ),
          )}
        </div>
        {tastes.length ? (
          <span className="ml-auto shrink-0 text-[15px] leading-none tracking-[1px]">
            {tastes.map((t) => tasteEmoji(t)).join("")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Spice({ n }: { n: 1 | 2 | 3 }) {
  const t = useTranslations("workshop.card");
  return (
    <span
      role="img"
      aria-label={t("spice", { n })}
      className="inline-flex gap-px"
    >
      {[1, 2, 3].map((i) => (
        <Flame
          key={i}
          className={cn("size-[15px]", i > n && "opacity-[0.28]")}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

/** A question as the Impostor's pad shows it: its kind, words and how it is answered. */
export function QuestionObject({
  question,
  placeholder = false,
  big = false,
}: {
  question: NonNullable<WorkshopItem["question"]>;
  placeholder?: boolean;
  big?: boolean;
}) {
  const t = useTranslations("workshop");
  const tSets = useTranslations("common.themeSets");
  const q = question;
  const Icon = KIND_ICON[q.kind];
  const scope =
    q.scope === "set" && q.set
      ? `${setEmoji(q.set)} ${tSets(q.set)}`
      : q.scope === "theme" && q.themeName
        ? `🏷️ ${q.themeName}`
        : `🌎 ${t("scopes.general")}`;
  const audience = { all: "✨", fiction: "🎭", real: "🧑" }[q.audience];
  return (
    <div
      className={cn(
        "grid gap-3 rounded-[18px] bg-[linear-gradient(150deg,var(--art-impostor),var(--art-impostor-2))] text-ink",
        big ? "p-[18px]" : "p-3.5",
      )}
    >
      <span className="flex items-center gap-1.5 font-bold text-[12px] uppercase tracking-[0.04em]">
        <Icon className="size-4" strokeWidth={2} />
        {t(`kinds.${q.kind}`)}
        <span className="ml-auto">
          <Spice n={q.spice} />
        </span>
      </span>
      <b
        className={cn(
          "font-display font-extrabold leading-[1.2] tracking-[-0.01em] [overflow-wrap:anywhere]",
          big ? "text-[21px]" : "text-[18px]",
          placeholder && "opacity-50",
        )}
      >
        {q.text}
      </b>
      <Answer question={q} />
      <span className="flex flex-wrap gap-1.5">
        <span className="inline-flex h-[22px] items-center gap-1 rounded-pill bg-surface/55 px-2 font-bold text-[11.5px]">
          {scope}
        </span>
        <span className="inline-flex h-[22px] items-center gap-1 rounded-pill bg-surface/55 px-2 font-bold text-[11.5px]">
          {audience} {t(`audience.${q.audience}`)}
        </span>
      </span>
    </div>
  );
}

function Answer({
  question: q,
}: {
  question: NonNullable<WorkshopItem["question"]>;
}) {
  const t = useTranslations("workshop");
  if (q.kind === "scale")
    return (
      <div className="grid gap-1.5">
        <div className="relative h-2 rounded-pill bg-white/40">
          <i className="absolute top-1/2 left-[62%] -mt-2.5 -ml-2.5 size-5 rounded-pill bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25)]" />
        </div>
        <div className="flex justify-between gap-2 font-semibold text-[12px]">
          <span>
            {q.low?.emoji ? `${q.low.emoji} ` : ""}
            {q.low?.text || "…"}
          </span>
          <span>
            {q.high?.text || "…"}
            {q.high?.emoji ? ` ${q.high.emoji}` : ""}
          </span>
        </div>
      </div>
    );
  if (q.kind === "color")
    return (
      <div className="flex gap-1.5">
        {COLORS.slice(0, 7).map((c) => (
          <i
            key={c.key}
            style={{ background: c.hex }}
            className="size-6 rounded-pill shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)]"
          />
        ))}
      </div>
    );
  if (q.kind === "emoji")
    return (
      <div aria-hidden="true" className="flex gap-1.5 text-[20px] leading-none">
        {EMOJI_PALETTES.general.slice(0, 6).join("")}
      </div>
    );
  if (q.kind === "pick")
    return (
      <div className="flex flex-wrap gap-1.5">
        {q.choices.map((c, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: options in order
            key={i}
            className="inline-flex h-[26px] items-center rounded-pill bg-surface/55 px-2.5 font-bold text-[12px]"
          >
            {c.emoji ? `${c.emoji} ` : ""}
            {c.text || "…"}
          </span>
        ))}
      </div>
    );
  return (
    <div className="flex h-[34px] items-center rounded-[12px] bg-surface/55 px-3 font-semibold text-[13px] text-ink/65">
      {t("wordHint")}
    </div>
  );
}

/** A mission in What for?'s kraft envelope, sealed with wax. */
export function MissionObject({
  mission,
  placeholder = false,
  big = false,
}: {
  mission: MissionDraft;
  placeholder?: boolean;
  big?: boolean;
}) {
  const t = useTranslations("workshop");
  const emoji = {
    chores: "🧹",
    social: "🥂",
    adventure: "🧭",
    absurd: "🤪",
    contest: "🏆",
  }[mission.tone];
  return (
    <div
      className={cn(
        "group/env relative grid gap-2.5 overflow-hidden rounded-[18px] bg-kraft px-4 pb-4 text-kraft-ink",
        big ? "pt-[58px]" : "pt-[52px]",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[46px] origin-top bg-kraft-deep transition-transform duration-500 ease-soft [clip-path:polygon(0_0,100%_0,50%_100%)] group-hover/env:[transform:rotateX(180deg)]" />
      <span className="absolute top-[30px] left-1/2 -ml-[15px] size-[30px] rounded-pill bg-wax text-center font-display font-extrabold text-[#f6d9c8] text-[15px] leading-[30px] shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] transition-[opacity,scale] duration-300 group-hover/env:scale-75 group-hover/env:opacity-0">
        ?
      </span>
      <span className="font-medium font-mono text-[11.5px] tracking-[0.04em] opacity-75">
        {t("card.envelope")}
      </span>
      <b
        className={cn(
          "font-bold font-display leading-[1.3] [overflow-wrap:anywhere]",
          big ? "text-[19px]" : "text-[17px]",
          placeholder && "opacity-50",
        )}
      >
        {mission.text}
      </b>
      <span className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center rounded-pill bg-kraft-ink/12 px-[9px] font-bold text-[11.5px]">
          {emoji} {t(`tones.${mission.tone}`)}
        </span>
        {mission.heavy ? (
          <span className="inline-flex h-6 -rotate-[4deg] items-center rounded-[6px] border-2 border-wax px-2 font-extrabold text-[11px] text-wax uppercase tracking-[0.08em]">
            {t("card.heavy")}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** The object a card holds, by kind. */
export function ItemObject({ item }: { item: WorkshopItem }) {
  if (item.theme)
    return (
      <ThemeObject
        name={item.theme.name}
        set={item.theme.set}
        starters={item.theme.starters}
      />
    );
  if (item.question) return <QuestionObject question={item.question} />;
  if (item.mission) return <MissionObject mission={item.mission} />;
  return null;
}
