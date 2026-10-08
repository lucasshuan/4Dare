"use client";

import {
  Check,
  ChevronDown,
  Minus,
  PenLine,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { HintLabel } from "@/components/ui/hint-label";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { letsIn } from "@/game/gostos";
import { THEME_SETS, type ThemeSet } from "@/game/theme-sets";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import type { CreateRoomInput, ThemeCatalogEntry } from "@/server/contract";
import { ThemeCountLine } from "./gosto-fields";
import { useThemeCatalog } from "./theme-catalog";

type ThemeSettings = Pick<
  CreateRoomInput,
  "game" | "themeMode" | "offGostos" | "offThemes"
>;

const spring = { type: "spring", stiffness: 420, damping: 32 } as const;
/** Pastel tile behind each set's emoji. */
const TONES = [
  "bg-sky-soft",
  "bg-butter-soft",
  "bg-apricot-soft",
  "bg-yes-soft",
  "bg-no-soft",
];
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

/** Lowercase and without accents, so "pokemon" finds "Pokémon". */
export const plain = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** A checkbox drawn as a box: on, off, or (for a set) partly on. */
export function Box({ state }: { state: boolean | "mixed" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors duration-150 ease-soft",
        state
          ? "border-ink bg-ink text-on-ink"
          : "border-line-strong bg-surface",
      )}
    >
      {state === "mixed" ? (
        <Minus className="size-3" strokeWidth={3.25} />
      ) : state ? (
        <Check className="size-3" strokeWidth={3.25} />
      ) : null}
    </span>
  );
}

type Group = {
  set: (typeof THEME_SETS)[number];
  index: number;
  /** The set's themes the gostos leave, by name. */
  themes: { id: string; name: string }[];
};

/** One set: a box for all its themes, its name and count, and its themes when open. */
function SetGroup({
  group,
  shown,
  open,
  onOpen,
  off,
  onChange,
}: {
  group: Group;
  /** The themes the search leaves. */
  shown: Group["themes"];
  open: boolean;
  onOpen: () => void;
  off: string[];
  onChange: (off: string[]) => void;
}) {
  const tSets = useTranslations("common.themeSets");
  const t = useTranslations("home.createRoom");
  const bodyId = useId();
  const still = useReducedMotion() ?? false;
  const ids = group.themes.map((th) => th.id);
  const on = ids.filter((id) => !off.includes(id)).length;
  const state = on === ids.length ? true : on === 0 ? false : "mixed";
  const name = tSets(group.set.key);
  const setAll = (turnOn: boolean) =>
    onChange(
      turnOn
        ? off.filter((id) => !ids.includes(id))
        : [...off, ...ids.filter((id) => !off.includes(id))],
    );
  const toggle = (id: string) =>
    onChange(off.includes(id) ? off.filter((x) => x !== id) : [...off, id]);
  return (
    <li className="overflow-hidden rounded-md bg-surface shadow-card">
      <div className="flex items-center gap-1 pr-2 pl-3">
        <label className="-m-1.5 relative cursor-pointer rounded-sm p-1.5 has-focus-visible:ring-2 has-focus-visible:ring-sky">
          <input
            type="checkbox"
            className="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0"
            checked={state === true}
            ref={(el) => {
              if (el) el.indeterminate = state === "mixed";
            }}
            aria-label={t("setAll", { set: name })}
            onChange={() => setAll(state !== true)}
          />
          <Box state={state} />
        </label>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onOpen}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-sm py-2 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-sky"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-sm text-lg leading-none transition-[filter,opacity] duration-200",
              TONES[group.index % TONES.length],
              on === 0 && "opacity-50 grayscale",
            )}
          >
            {group.set.emoji}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
          <span
            className={cn(
              "shrink-0 font-medium text-[13px] tabular-nums",
              on === 0 ? "text-ink-muted/70" : "text-ink-muted",
            )}
          >
            {t("someOf", { on, total: ids.length })}
          </span>
          <ChevronDown
            className={cn(
              "size-4.5 shrink-0 text-ink-muted transition-transform duration-200 ease-soft",
              open && "rotate-180",
            )}
            strokeWidth={2.25}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            key="themes"
            id={bodyId}
            initial={still ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { duration: dur.base, ease: ease.soft },
            }}
            exit={
              still
                ? { opacity: 0 }
                : { height: 0, opacity: 0, transition: { duration: dur.fast } }
            }
          >
            <ul className="grid grid-cols-1 gap-x-3 border-line border-t px-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((th) => {
                const isOn = !off.includes(th.id);
                return (
                  <li key={th.id}>
                    <label
                      className={cn(
                        "relative flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm px-1.5 text-sm transition-colors duration-150 ease-soft hover:bg-sunken has-focus-visible:ring-2 has-focus-visible:ring-sky",
                        isOn ? "text-ink" : "text-ink-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0"
                        checked={isOn}
                        onChange={() => toggle(th.id)}
                      />
                      <Box state={isOn} />
                      <span className="min-w-0 flex-1 leading-tight">
                        {th.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </m.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/** The sets the room's gostos leave, each with its themes in this language, A to Z. */
function useGroups(
  catalog: ThemeCatalogEntry[] | undefined,
  value: ThemeSettings,
): { groups: Group[]; hidden: number } {
  const lang = useLocale() as Lang;
  const { game, offGostos } = value;
  return useMemo(() => {
    if (!catalog) return { groups: [], hidden: 0 };
    const ofGame = catalog.filter((th) => th.games.includes(game));
    // the room's own switched-off themes don't hide them: only the gostos
    const kept = ofGame.filter((th) =>
      letsIn(th, { game, offGostos, offThemes: [] }),
    );
    const bySet = new Map<ThemeSet, Group["themes"]>();
    for (const th of kept) {
      if (!th.set) continue;
      const list = bySet.get(th.set) ?? [];
      list.push({ id: th.id, name: th.names[lang] });
      bySet.set(th.set, list);
    }
    const groups = THEME_SETS.flatMap((set, index) => {
      const themes = bySet.get(set.key);
      if (!themes?.length) return [];
      themes.sort((a, b) => a.name.localeCompare(b.name, lang));
      return [{ set, index, themes }];
    });
    return { groups, hidden: ofGame.length - kept.length };
  }, [catalog, game, offGostos, lang]);
}

/** Every theme the gostos leave, set by set: a box for each, and one for each whole set. */
function ThemeChecklist({
  value,
  onChange,
}: {
  value: ThemeSettings;
  onChange: (offThemes: string[]) => void;
}) {
  const t = useTranslations("home.createRoom");
  const catalog = useThemeCatalog();
  const { groups, hidden } = useGroups(catalog, value);
  const [opened, setOpened] = useState<ThemeSet[]>([]);
  const [query, setQuery] = useState("");
  const q = plain(query.trim());
  const visible = groups.flatMap((g) => g.themes.map((th) => th.id));
  const allOn = visible.every((id) => !value.offThemes.includes(id));
  const found = groups
    .map((g) => ({
      group: g,
      shown: q ? g.themes.filter((th) => plain(th.name).includes(q)) : g.themes,
    }))
    .filter((f) => f.shown.length);

  if (!catalog)
    return (
      <ul className="flex flex-col gap-1.5" aria-busy>
        {THEME_SETS.slice(0, 6).map((s) => (
          <li key={s.key} className="h-14 animate-pulse rounded-md bg-sunken" />
        ))}
      </ul>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="group flex h-11 min-w-56 flex-1 items-center gap-2.5 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 transition-colors focus-within:border-sky">
          <Search
            className="size-4.5 shrink-0 text-ink-muted transition-colors group-focus-within:text-sky"
            strokeWidth={1.75}
          />
          <span className="sr-only">{t("searchThemes")}</span>
          <input
            type="search"
            value={query}
            placeholder={t("searchThemes")}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-muted focus-visible:outline-none! [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label={t("clearSearch")}
              onClick={() => setQuery("")}
              className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-sunken text-ink-muted hover:text-ink"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </label>
        <button
          type="button"
          onClick={() =>
            onChange(
              allOn
                ? [...new Set([...value.offThemes, ...visible])]
                : value.offThemes.filter((id) => !visible.includes(id)),
            )
          }
          className="font-semibold text-sky text-[13px] underline-offset-2 hover:underline"
        >
          {allOn ? t("allOff") : t("allOn")}
        </button>
      </div>
      {found.length ? (
        <ul className="flex flex-col gap-1.5">
          {found.map(({ group, shown }) => (
            <SetGroup
              key={group.set.key}
              group={group}
              shown={shown}
              // a search opens every set it finds something in
              open={q ? true : opened.includes(group.set.key)}
              onOpen={() =>
                setOpened((o) =>
                  o.includes(group.set.key)
                    ? o.filter((k) => k !== group.set.key)
                    : [...o, group.set.key],
                )
              }
              off={value.offThemes}
              onChange={onChange}
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-ink-muted text-sm">
          {t("noThemeFound")}
        </p>
      )}
      {hidden ? (
        <p className="text-[13px] text-ink-muted">
          {t("hiddenByGostos", { count: hidden })}
        </p>
      ) : null}
    </div>
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

/**
 * The "Themes" tab: for "Who am I?", how the theme is chosen; then every
 * theme the gostos leave, picked by hand. Voting draws from them, and so do
 * the host's ideas.
 */
export function ThemeFields({
  value,
  onChange,
}: {
  value: ThemeSettings;
  onChange: (v: Pick<ThemeSettings, "themeMode" | "offThemes">) => void;
}) {
  const t = useTranslations("home.createRoom");
  const hintId = useId();
  const choosing = value.game === "who-am-i";
  const host = choosing && value.themeMode === "host";
  const pick = { themeMode: value.themeMode, offThemes: value.offThemes };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
          <HintLabel
            hint={t(choosing ? "themesHint" : "themesHintVote")}
            hintId={hintId}
            className="self-center"
          >
            {t("themes")}
          </HintLabel>
          <ThemeCountLine room={value} />
        </div>
        {choosing ? (
          <ModeSwitch
            value={value.themeMode}
            onChange={(themeMode) => onChange({ ...pick, themeMode })}
            describedBy={hintId}
          />
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {host ? (
          <m.div key="host" {...fadeSwap}>
            <HostNote />
          </m.div>
        ) : null}
      </AnimatePresence>
      <ThemeChecklist
        value={value}
        onChange={(offThemes) => onChange({ ...pick, offThemes })}
      />
    </div>
  );
}
