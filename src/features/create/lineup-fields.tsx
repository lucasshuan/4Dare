"use client";

// What for?'s setup: the auction's numbers (coins, lots, rounds, the break,
// trades) and the Missions tab, which takes the place of the themes.
import { ChevronDown, Minus, Plus, Search, X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { HintLabel } from "@/components/ui/hint-label";
import { Switch } from "@/components/ui/switch";
import { TONES, type Tone } from "@/game/lineup/bank";
import {
  COINS,
  type LineupRules,
  LOTS_PER_SEAT,
  ROUNDS,
} from "@/game/lineup/rules";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import { useLineupCatalog, useLineupCount } from "./lineup-catalog";
import { Segmented } from "./settings-fields";
import { Box, plain } from "./theme-fields";

export type AuctionRules = Pick<
  LineupRules,
  "coins" | "lotsPerSeat" | "rounds" | "interval" | "trades"
>;
type MissionRules = Pick<LineupRules, "heavy" | "offMissions">;

/** Pastel tile behind each tone's emoji. */
const TONE_LOOK: Record<Tone, { emoji: string; tile: string }> = {
  chores: { emoji: "🧺", tile: "bg-sky-soft" },
  social: { emoji: "🥂", tile: "bg-butter-soft" },
  adventure: { emoji: "🧭", tile: "bg-yes-soft" },
  absurd: { emoji: "🦄", tile: "bg-apricot-soft" },
  contest: { emoji: "🥊", tile: "bg-no-soft" },
};

/** − [10] + over a range, one at a time. */
function Stepper({
  label,
  value,
  range,
  onChange,
  describedBy,
}: {
  label: string;
  value: number;
  range: { min: number; max: number };
  onChange: (n: number) => void;
  describedBy?: string;
}) {
  const t = useTranslations("home.createRoom");
  const key =
    "flex size-10 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface transition-[opacity,transform] duration-150 active:scale-90 aria-disabled:opacity-35";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`${label}: ${t("less")}`}
        aria-disabled={value <= range.min}
        onClick={() => value > range.min && onChange(value - 1)}
        className={key}
      >
        <Minus className="size-4.5" strokeWidth={1.75} />
      </button>
      <output
        aria-label={label}
        aria-describedby={describedBy}
        className="flex h-11 w-14 items-center justify-center rounded-md border-[1.5px] border-line-strong bg-surface font-medium font-mono text-lg tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`${label}: ${t("more")}`}
        aria-disabled={value >= range.max}
        onClick={() => value < range.max && onChange(value + 1)}
        className={key}
      >
        <Plus className="size-4.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

/** A switch with its label and hint, the label on the left. */
function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const hintId = useId();
  const labelId = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <HintLabel hint={hint} hintId={hintId}>
        <span id={labelId}>{label}</span>
      </HintLabel>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={labelId}
        aria-describedby={hintId}
      />
    </div>
  );
}

const ROUND_OPTIONS = [
  "auto",
  ...Array.from(
    { length: ROUNDS.max - ROUNDS.min + 1 },
    (_, i) => ROUNDS.min + i,
  ),
] as const;
const LOT_OPTIONS = Array.from(
  { length: LOTS_PER_SEAT.max - LOTS_PER_SEAT.min + 1 },
  (_, i) => LOTS_PER_SEAT.min + i,
);

/** The auction's numbers: coins, lots per person, rounds, the break and trades. */
export function AuctionFields({
  value,
  onChange,
  compact = false,
}: {
  value: AuctionRules;
  onChange: (v: AuctionRules) => void;
  /** In the lobby's popover: one column. */
  compact?: boolean;
}) {
  const t = useTranslations("home.createRoom.lineup");
  const coinsHint = useId();
  const lotsHint = useId();
  const roundsHint = useId();
  return (
    <div
      className={cn(
        "grid gap-x-10 gap-y-5",
        !compact && "sm:grid-cols-[repeat(3,max-content)]",
      )}
    >
      <div className="flex flex-col gap-2">
        <HintLabel hint={t("coinsHint")} hintId={coinsHint}>
          {t("coins")}
        </HintLabel>
        <Stepper
          label={t("coins")}
          value={value.coins}
          range={COINS}
          onChange={(coins) => onChange({ ...value, coins })}
          describedBy={coinsHint}
        />
      </div>
      <div className="flex flex-col gap-2">
        <HintLabel hint={t("lotsHint")} hintId={lotsHint}>
          {t("lots")}
        </HintLabel>
        <Segmented
          label={t("lots")}
          options={LOT_OPTIONS}
          value={value.lotsPerSeat}
          onChange={(lotsPerSeat) => onChange({ ...value, lotsPerSeat })}
          render={String}
          describedBy={lotsHint}
        />
      </div>
      <div className="flex flex-col gap-2">
        <HintLabel hint={t("roundsHint")} hintId={roundsHint}>
          {t("rounds")}
        </HintLabel>
        <Segmented
          label={t("rounds")}
          options={ROUND_OPTIONS}
          value={value.rounds ?? "auto"}
          onChange={(r) =>
            onChange({ ...value, rounds: r === "auto" ? null : r })
          }
          render={(r) => (r === "auto" ? t("roundsAuto") : String(r))}
          describedBy={roundsHint}
        />
      </div>
      <div
        className={cn(
          "flex max-w-[420px] flex-col gap-3",
          !compact && "sm:col-span-3",
        )}
      >
        <SwitchField
          label={t("interval")}
          hint={t("intervalHint")}
          checked={value.interval}
          onChange={(interval) => onChange({ ...value, interval })}
        />
        <SwitchField
          label={t("trades")}
          hint={t("tradesHint")}
          checked={value.trades}
          onChange={(trades) => onChange({ ...value, trades })}
        />
      </div>
    </div>
  );
}

/** "Heavy missions": the switch the lobby's row and the Missions tab share. */
export function HeavySwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (heavy: boolean) => void;
}) {
  const t = useTranslations("home.createRoom.lineup");
  return (
    <SwitchField
      label={t("heavy")}
      hint={t("heavyHint")}
      checked={value}
      onChange={onChange}
    />
  );
}

/** How many missions the room draws from. */
export function MissionCountLine({ room }: { room: MissionRules }) {
  const t = useTranslations("home.createRoom.lineup");
  const count = useLineupCount({
    game: "lineup",
    offGostos: [],
    heavy: room.heavy,
    offMissions: room.offMissions,
  });
  if (!count) return <p className="h-5" />;
  return (
    <p className="font-medium text-[13px] text-ink tabular-nums">
      {t("missionsOn", { on: count.missions, total: count.allMissions })}
    </p>
  );
}

type Mission = { id: string; text: string; heavy: boolean };

/** One tone: a box for all its missions, its name and count, and the missions when open. */
function ToneGroup({
  tone,
  missions,
  shown,
  open,
  onOpen,
  heavy,
  off,
  onChange,
}: {
  tone: Tone;
  missions: Mission[];
  shown: Mission[];
  open: boolean;
  onOpen: () => void;
  heavy: boolean;
  off: string[];
  onChange: (off: string[]) => void;
}) {
  const t = useTranslations("home.createRoom");
  const tl = useTranslations("home.createRoom.lineup");
  const bodyId = useId();
  const still = useReducedMotion() ?? false;
  // heavy ones are out with the switch off, whatever their box says
  const ids = missions.filter((x) => heavy || !x.heavy).map((x) => x.id);
  const on = ids.filter((id) => !off.includes(id)).length;
  const state = on === ids.length ? true : on === 0 ? false : "mixed";
  const name = tl(`tones.${tone}`);
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
              TONE_LOOK[tone].tile,
              on === 0 && "opacity-50 grayscale",
            )}
          >
            {TONE_LOOK[tone].emoji}
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
            key="missions"
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
            <ul className="grid grid-cols-1 gap-x-3 border-line border-t px-3 py-2 lg:grid-cols-2">
              {shown.map((x) => {
                const out = x.heavy && !heavy;
                const isOn = !out && !off.includes(x.id);
                return (
                  <li key={x.id}>
                    <label
                      className={cn(
                        "relative flex min-h-10 w-full items-center gap-2.5 rounded-sm px-1.5 py-1.5 text-sm transition-colors duration-150 ease-soft has-focus-visible:ring-2 has-focus-visible:ring-sky",
                        out
                          ? "cursor-not-allowed opacity-45"
                          : "cursor-pointer hover:bg-sunken",
                        isOn ? "text-ink" : "text-ink-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="absolute inset-0 m-0 size-full cursor-[inherit] appearance-none opacity-0"
                        checked={isOn}
                        disabled={out}
                        onChange={() => toggle(x.id)}
                      />
                      <Box state={isOn} />
                      <span className="min-w-0 flex-1 leading-snug">
                        {x.text}
                        {x.heavy ? (
                          <span className="ml-1.5 inline-flex h-5 items-center rounded-pill bg-sunken px-2 align-[1px] font-semibold text-[11px] text-ink-muted">
                            {tl("heavyTag")}
                          </span>
                        ) : null}
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

/**
 * The "Missions" tab: heavy ones on or off, then every mission by tone, each
 * with its box. Rounds draw from the ones left on.
 */
export function MissionFields({
  value,
  onChange,
}: {
  value: MissionRules;
  onChange: (v: MissionRules) => void;
}) {
  const t = useTranslations("home.createRoom");
  const tl = useTranslations("home.createRoom.lineup");
  const lang = useLocale() as Lang;
  const hintId = useId();
  const catalog = useLineupCatalog();
  const [opened, setOpened] = useState<Tone[]>([]);
  const [query, setQuery] = useState("");
  const q = plain(query.trim());
  const groups = useMemo(
    () =>
      TONES.map((tone) => ({
        tone,
        missions: (catalog?.missions ?? [])
          .filter((x) => x.tone === tone)
          .map((x) => ({ id: x.id, text: x.text[lang], heavy: x.heavy }))
          .sort((a, b) => a.text.localeCompare(b.text, lang)),
      })).filter((g) => g.missions.length),
    [catalog, lang],
  );
  const pick = { heavy: value.heavy, offMissions: value.offMissions };
  const visible = groups.flatMap((g) =>
    g.missions.filter((x) => value.heavy || !x.heavy).map((x) => x.id),
  );
  const allOn = visible.every((id) => !value.offMissions.includes(id));
  const found = groups
    .map((g) => ({
      group: g,
      shown: q
        ? g.missions.filter((x) => plain(x.text).includes(q))
        : g.missions,
    }))
    .filter((f) => f.shown.length);
  const setOff = (offMissions: string[]) => onChange({ ...pick, offMissions });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
          <HintLabel
            hint={tl("missionsHint")}
            hintId={hintId}
            className="self-center"
          >
            {tl("missions")}
          </HintLabel>
          <MissionCountLine room={value} />
        </div>
        <div className="w-full max-w-[300px]">
          <HeavySwitch
            value={value.heavy}
            onChange={(heavy) => onChange({ ...pick, heavy })}
          />
        </div>
      </div>
      {!catalog ? (
        <ul className="flex flex-col gap-1.5" aria-busy>
          {TONES.map((tone) => (
            <li
              key={tone}
              className="h-14 animate-pulse rounded-md bg-sunken"
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="group flex h-11 min-w-56 flex-1 items-center gap-2.5 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 transition-colors focus-within:border-sky">
              <Search
                className="size-4.5 shrink-0 text-ink-muted transition-colors group-focus-within:text-sky"
                strokeWidth={1.75}
              />
              <span className="sr-only">{tl("searchMissions")}</span>
              <input
                type="search"
                value={query}
                placeholder={tl("searchMissions")}
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
                setOff(
                  allOn
                    ? [...new Set([...value.offMissions, ...visible])]
                    : value.offMissions.filter((id) => !visible.includes(id)),
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
                <ToneGroup
                  key={group.tone}
                  tone={group.tone}
                  missions={group.missions}
                  shown={shown}
                  // a search opens every tone it finds something in
                  open={q ? true : opened.includes(group.tone)}
                  onOpen={() =>
                    setOpened((o) =>
                      o.includes(group.tone)
                        ? o.filter((k) => k !== group.tone)
                        : [...o, group.tone],
                    )
                  }
                  heavy={value.heavy}
                  off={value.offMissions}
                  onChange={setOff}
                />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-ink-muted text-sm">
              {tl("noMissionFound")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
