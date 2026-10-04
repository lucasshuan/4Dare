"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Check, PenLine, UsersRound } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { HintLabel } from "@/components/ui/hint-label";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { THEME_SET_KEYS, THEME_SETS, type ThemeSet } from "@/game/theme-sets";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import type { CreateRoomInput } from "@/server/contract";
import type { ThemeExamples } from "@/server/theme-examples";

type ThemeSettings = Pick<CreateRoomInput, "themeMode" | "themeSets">;
type SetTooltip = Tooltip.Handle<ThemeSet>;

const spring = { type: "spring", stiffness: 420, damping: 32 } as const;
/** A set card's face: lifts on hover, shrinks a little when pressed. */
const CARD_FACE = {
  rest: { y: 0, scale: 1 },
  hover: { y: -2 },
  press: { scale: 0.96 },
} as const;
/** Pastel tile behind each set's emoji, shifted every row so columns don't repeat. */
const TONES = [
  "bg-sky-soft",
  "bg-butter-soft",
  "bg-apricot-soft",
  "bg-yes-soft",
  "bg-no-soft",
];
const toneOf = (i: number) => TONES[(i + Math.floor(i / 5)) % TONES.length];
const fadeSwap = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.base, ease: ease.soft },
  },
  exit: { opacity: 0, y: -4, transition: { duration: dur.fast } },
} as const;

/** "Everyone votes" or "I type it", on a pill that slides between them. */
function ModeSwitch({
  value,
  onChange,
  describedBy,
}: {
  value: ThemeSettings["themeMode"];
  onChange: (v: ThemeSettings["themeMode"]) => void;
  describedBy?: string;
}) {
  const t = useTranslations("home.createRoom");
  const id = useId();
  const options = [
    { mode: "vote", icon: UsersRound, label: t("themeVote") },
    { mode: "host", icon: PenLine, label: t("themeHost") },
  ] as const;
  return (
    <ChoiceGroup label={t("themeMode")} describedBy={describedBy}>
      <LayoutMotion>
        {options.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={value === mode}
            onClick={() => onChange(mode)}
            className={cn(
              "relative inline-flex h-9 items-center gap-1.5 rounded-pill px-4 font-semibold text-sm transition-colors duration-200 ease-soft",
              value === mode ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {value === mode ? (
              <m.span
                layoutId={`${id}-pill`}
                transition={spring}
                className="absolute inset-0 rounded-pill bg-surface shadow-card"
              />
            ) : null}
            <Icon className="relative size-4" strokeWidth={2} />
            <span className="relative">{label}</span>
          </button>
        ))}
      </LayoutMotion>
    </ChoiceGroup>
  );
}

/** A set's example themes in this language, from the whoami_themes table: empty until they arrive. */
function useExamples(set: ThemeSet): string[] {
  const lang = useLocale() as Lang;
  const { data } = useQuery({
    queryKey: ["theme-examples"],
    queryFn: async (): Promise<ThemeExamples> => {
      const res = await fetch("/api/themes/examples");
      if (!res.ok) throw new Error(`theme examples: ${res.status}`);
      return ((await res.json()) as { examples: ThemeExamples }).examples;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
  return data?.[set]?.map((example) => example[lang]) ?? [];
}

/** A few themes from the set, one per line. */
function Examples({ set }: { set: ThemeSet }) {
  const t = useTranslations("home.createRoom");
  const examples = useExamples(set);
  if (!examples.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-semibold text-[11px] text-ink-muted uppercase tracking-[0.08em]">
        {t("setExamples")}
      </span>
      <ul className="flex flex-col gap-1">
        {examples.map((example) => (
          <li
            key={example}
            className="flex items-baseline gap-2 font-semibold text-[13px] text-ink leading-4"
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-ink-muted/50"
            />
            {example}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One tooltip for the whole grid: it glides from card to card and swaps its
 * examples as the pointer moves.
 */
function ExamplesTooltip({ handle }: { handle: SetTooltip }) {
  return (
    <Tooltip.Root handle={handle} disableHoverablePopup>
      {({ payload }) => (
        <Tooltip.Portal>
          <Tooltip.Positioner
            side="top"
            sideOffset={8}
            className="pointer-events-none z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) select-none transition-[top,left,right,bottom,transform] duration-300 ease-soft data-instant:transition-none motion-reduce:transition-none"
          >
            <Tooltip.Popup className="relative h-(--popup-height,auto) w-66 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-md bg-surface shadow-pop outline-none transition-[height,opacity,scale] duration-300 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0 data-instant:transition-none motion-reduce:transition-none">
              <Tooltip.Viewport className="relative size-full overflow-clip px-3 py-2.5 **:data-current:transition-[translate,opacity] **:data-current:duration-300 **:data-current:ease-soft **:data-previous:transition-[translate,opacity] **:data-previous:duration-200 **:data-previous:ease-soft **:data-current:data-starting-style:opacity-0 **:data-previous:data-ending-style:opacity-0 data-[activation-direction~=right]:**:data-current:data-starting-style:translate-x-3 data-[activation-direction~=left]:**:data-current:data-starting-style:-translate-x-3 data-[activation-direction~=right]:**:data-previous:data-ending-style:-translate-x-3 data-[activation-direction~=left]:**:data-previous:data-ending-style:translate-x-3 data-instant:**:transition-none motion-reduce:**:transition-none">
                {payload ? <Examples set={payload} /> : null}
              </Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  );
}

function SetCard({
  index,
  set,
  on,
  onToggle,
  tooltip,
}: {
  index: number;
  set: (typeof THEME_SETS)[number];
  on: boolean;
  onToggle: () => void;
  tooltip: SetTooltip;
}) {
  const tSets = useTranslations("common.themeSets");
  const t = useTranslations("home.createRoom");
  const examples = useExamples(set.key);
  const still = useReducedMotion() ?? false;
  const examplesId = useId();
  return (
    <Tooltip.Trigger
      handle={tooltip}
      payload={set.key}
      delay={0}
      closeOnClick={false}
      type="button"
      aria-pressed={on}
      aria-describedby={examples.length ? examplesId : undefined}
      onClick={onToggle}
      // The button stays still and only its face lifts: a moving anchor makes
      // the tooltip re-measure every frame of the spring, and it stutters.
      render={
        <m.button
          initial={false}
          animate="rest"
          whileHover={still ? undefined : "hover"}
          whileTap="press"
        />
      }
      // The card under the tooltip rises above it (z-50), out of its shadow.
      className="relative block w-full rounded-md text-left data-popup-open:z-51"
    >
      <m.span
        variants={CARD_FACE}
        transition={spring}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-md border-[1.5px] py-1.5 pr-2.5 pl-1.5 transition-[background-color,border-color,color,box-shadow] duration-200 ease-soft",
          on
            ? "border-transparent bg-surface text-ink shadow-card"
            : // canvas, not transparent: the shadow would show through
              "border-line border-dashed bg-canvas text-ink-muted hover:border-line-strong",
        )}
      >
        <m.span
          aria-hidden
          initial={false}
          animate={
            on
              ? {
                  scale: still ? 1 : [1, 1.28, 1],
                  rotate: still ? 0 : [0, -14, 0],
                  opacity: 1,
                  filter: "grayscale(0)",
                }
              : { scale: 0.88, rotate: 0, opacity: 0.5, filter: "grayscale(1)" }
          }
          transition={{ duration: 0.42, ease: ease.soft }}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-sm text-xl leading-none transition-colors duration-200",
            on ? toneOf(index) : "bg-sunken",
          )}
        >
          {set.emoji}
        </m.span>
        <span className="line-clamp-2 min-w-0 flex-1 font-semibold text-[13px] leading-4 [word-break:auto-phrase]">
          {tSets(set.key)}
        </span>
        <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line">
          <AnimatePresence initial={false}>
            {on ? (
              <m.span
                key="on"
                initial={{ scale: 0, rotate: -60 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={spring}
                className="-inset-[1.5px] absolute flex items-center justify-center rounded-full bg-ink text-on-ink"
              >
                <Check className="size-3" strokeWidth={3.25} />
              </m.span>
            ) : null}
          </AnimatePresence>
        </span>
      </m.span>
      {/* the tooltip is for the eyes only; screen readers get the examples here */}
      <span id={examplesId} hidden>
        {`${t("setExamples")}: ${examples.join(", ")}`}
      </span>
    </Tooltip.Trigger>
  );
}

/** Every theme set as a card that turns on and off; they come in one after the other. */
function SetGrid({
  value,
  onChange,
}: {
  value: ThemeSet[];
  onChange: (v: ThemeSet[]) => void;
}) {
  const toggle = (key: ThemeSet) =>
    onChange(
      value.includes(key)
        ? value.filter((k) => k !== key)
        : THEME_SET_KEYS.filter((k) => k === key || value.includes(k)),
    );
  const [tooltip] = useState(() => Tooltip.createHandle<ThemeSet>());
  return (
    <>
      <m.ul
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.018 } } }}
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {THEME_SETS.map((set, i) => (
          <m.li
            key={set.key}
            variants={{
              hidden: { opacity: 0, y: 10 },
              shown: {
                opacity: 1,
                y: 0,
                transition: { duration: dur.base, ease: ease.soft },
              },
            }}
          >
            <SetCard
              index={i}
              set={set}
              on={value.includes(set.key)}
              onToggle={() => toggle(set.key)}
              tooltip={tooltip}
            />
          </m.li>
        ))}
      </m.ul>
      <ExamplesTooltip handle={tooltip} />
    </>
  );
}

function HostNote() {
  const t = useTranslations("home.createRoom");
  const still = useReducedMotion() ?? false;
  return (
    <div className="flex items-start gap-4 rounded-lg bg-butter-soft p-5">
      <m.span
        aria-hidden
        initial={{ rotate: 0 }}
        animate={still ? undefined : { rotate: [0, -10, 8, -5, 0] }}
        transition={{ duration: 1.1, delay: 0.15, ease: "easeInOut" }}
        className="origin-bottom-left text-[34px] leading-none"
      >
        ✍️
      </m.span>
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{t("hostNoteTitle")}</span>
        <p className="text-ink-muted text-sm">{t("hostNote")}</p>
      </div>
    </div>
  );
}

/** How the theme is chosen and, for a vote, which sets it draws from. */
export function ThemeFields({
  value,
  onChange,
}: {
  value: ThemeSettings;
  onChange: (v: ThemeSettings) => void;
}) {
  const t = useTranslations("home.createRoom");
  const hintId = useId();
  const voting = value.themeMode === "vote";
  const on = value.themeSets.length;
  const total = THEME_SET_KEYS.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
          <HintLabel
            hint={t("themesHint")}
            hintId={hintId}
            className="self-center"
          >
            {t("themes")}
          </HintLabel>
          <AnimatePresence initial={false}>
            {voting ? (
              <m.span
                key="count"
                {...fadeSwap}
                className="flex items-center gap-3"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.span
                    key={on}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: dur.fast }}
                    className={cn(
                      "font-medium text-[13px] tabular-nums",
                      on ? "text-ink-muted" : "text-no",
                    )}
                  >
                    {t("setsOn", { on, total })}
                  </m.span>
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      themeSets: on === total ? [] : [...THEME_SET_KEYS],
                    })
                  }
                  className="font-semibold text-sky text-[13px] underline-offset-2 hover:underline"
                >
                  {on === total ? t("allOff") : t("allOn")}
                </button>
              </m.span>
            ) : null}
          </AnimatePresence>
        </div>
        <ModeSwitch
          value={value.themeMode}
          onChange={(themeMode) => onChange({ ...value, themeMode })}
          describedBy={hintId}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {voting ? (
          <m.div key="sets" {...fadeSwap}>
            <SetGrid
              value={value.themeSets}
              onChange={(themeSets) => onChange({ ...value, themeSets })}
            />
          </m.div>
        ) : (
          <m.div key="host" {...fadeSwap}>
            <HostNote />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** True when a vote has no set to draw from: the room can't be saved like that. */
export const missingSets = (v: ThemeSettings) =>
  v.themeMode === "vote" && v.themeSets.length === 0;
