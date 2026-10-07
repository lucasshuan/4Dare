"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowRight,
  Heart,
  ScrollText,
  Shapes,
  SlidersHorizontal,
} from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { keyClass } from "@/components/ui/button";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { GAME_SEATS } from "@/game/games";
import { GOSTOS } from "@/game/gostos";
import { GAME_STEP_TIMES } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import type { CreateRoomInput } from "@/server/contract";
import { GameField } from "./game-field";
import { GostoFields } from "./gosto-fields";
import { DEFAULT_SETUP } from "./last-setup";
import { PresetMenu } from "./preset-menu";
import {
  missingName,
  missingPassword,
  RulesFields,
  SettingsFields,
} from "./settings-fields";
import { useThemeCount } from "./theme-catalog";
import { ThemeFields } from "./theme-fields";

type Tab = "room" | "rules" | "style" | "themes";

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

/** Looks of the "Back" link (or button) at the top of the setup screens. */
export const backClass =
  "-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink";

/**
 * Editing a room from the lobby: back, the title with the
 * game select and the submit button on its far right, then the settings in
 * tabs: room, the game's rules, the gostos and the themes they leave.
 */
export function RoomSetup({
  back,
  title,
  submit,
  value,
  onChange,
  onSubmit,
  pending,
  minSeats,
}: {
  back: ReactNode;
  title: string;
  submit: string;
  /** null while the last setup is still being read. */
  value: CreateRoomInput | null;
  onChange: (v: CreateRoomInput) => void;
  onSubmit: (v: CreateRoomInput) => void;
  pending: boolean;
  minSeats?: number;
}) {
  const t = useTranslations("home.createRoom");
  const [tab, setTab] = useState<Tab>("room");
  const problemId = useId();
  const count = useThemeCount(value ?? DEFAULT_SETUP);
  const problems: Record<Tab, string | null> = {
    room: !value
      ? null
      : missingName(value)
        ? t("needName")
        : missingPassword(value)
          ? t("needPassword")
          : null,
    rules: null,
    style: null,
    themes: count?.tooFew ? t("needThemes") : null,
  };
  const problemTab = problems.room ? "room" : problems.themes ? "themes" : null;

  return (
    <form
      className="flex max-w-[1040px] flex-col gap-6 sm:tiny:gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (value && !problemTab) onSubmit(value);
      }}
    >
      <div className="flex flex-col gap-4 sm:tiny:gap-2">
        {back}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em] sm:tiny:text-[36px] sm:tiny:leading-10">
            {title}
          </h1>
          <div className="ml-auto flex items-center gap-3 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
            {value ? (
              <GameField
                seated={minSeats}
                value={value.game}
                onChange={(game) => {
                  // the seats move into the new game's range
                  const range = GAME_SEATS[game];
                  const seats = Math.min(
                    range.max,
                    Math.max(range.min, minSeats ?? 0, value.seats),
                  );
                  onChange({ ...value, game, seats });
                }}
              />
            ) : null}
            <SubmitButton
              ready={value !== null && !problemTab}
              pending={pending}
              describedBy={
                problemTab ? `${problemId}-${problemTab}` : undefined
              }
            >
              {submit}
            </SubmitButton>
          </div>
        </div>
      </div>
      {value ? <PresetMenu value={value} onChange={onChange} /> : null}
      {value ? (
        <Tabs.Root
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className="flex flex-col gap-6 sm:tiny:gap-4"
        >
          <Tabs.List className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-lg bg-sunken p-1.5">
            <LayoutMotion>
              <SetupTab
                value="room"
                active={tab === "room"}
                icon={SlidersHorizontal}
                tone="bg-sky-soft text-sky"
                label={t("tabRoom")}
                summary={t("roomSummary", {
                  visibility: t(value.visibility),
                  seats: value.seats,
                })}
                problem={problems.room}
                problemId={`${problemId}-room`}
              />
              <SetupTab
                value="rules"
                active={tab === "rules"}
                icon={ScrollText}
                tone="bg-yes-soft text-yes"
                label={t("tabRules")}
                summary={t("rulesSummary", {
                  times: GAME_STEP_TIMES[value.game]
                    .map((k) => value[k])
                    .join(" · "),
                })}
                problem={problems.rules}
                problemId={`${problemId}-rules`}
              />
              <SetupTab
                value="style"
                active={tab === "style"}
                icon={Heart}
                tone="bg-no-soft text-no"
                label={t("gostos")}
                summary={GOSTOS.filter((g) => !value.offGostos.includes(g.key))
                  .map((g) => g.emoji)
                  .join(" ")}
                problem={problems.style}
                problemId={`${problemId}-style`}
              />
              <SetupTab
                value="themes"
                active={tab === "themes"}
                icon={Shapes}
                tone="bg-apricot-soft text-apricot"
                label={t("themes")}
                summary={[
                  value.game === "who-am-i" && value.themeMode === "host"
                    ? t("themeHost")
                    : null,
                  count
                    ? t("themesOn", { on: count.on, total: count.total })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                problem={problems.themes}
                problemId={`${problemId}-themes`}
              />
            </LayoutMotion>
          </Tabs.List>
          <Tabs.Panel value="room" className="outline-none">
            <PanelIn>
              <SettingsFields
                value={value}
                onChange={onChange}
                minSeats={minSeats}
              />
            </PanelIn>
          </Tabs.Panel>
          <Tabs.Panel value="rules" className="outline-none">
            <PanelIn>
              <RulesFields
                value={value}
                onChange={onChange}
                players={minSeats}
              />
            </PanelIn>
          </Tabs.Panel>
          <Tabs.Panel value="style" className="outline-none">
            <PanelIn>
              <GostoFields
                value={value}
                onChange={(offGostos) => onChange({ ...value, offGostos })}
              />
            </PanelIn>
          </Tabs.Panel>
          <Tabs.Panel value="themes" className="outline-none">
            <PanelIn>
              <ThemeFields
                value={value}
                onChange={(v) => onChange({ ...value, ...v })}
              />
            </PanelIn>
          </Tabs.Panel>
        </Tabs.Root>
      ) : null}
    </form>
  );
}

function PanelIn({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: dur.base, ease: ease.soft },
      }}
    >
      {children}
    </m.div>
  );
}

/** A wide tab: icon tile, name, and a one-line summary that turns into the problem when there is one. */
function SetupTab({
  value,
  active,
  icon: Icon,
  tone,
  label,
  summary,
  problem,
  problemId,
}: {
  value: Tab;
  active: boolean;
  icon: typeof Shapes;
  tone: string;
  label: string;
  summary: string;
  problem: string | null;
  problemId: string;
}) {
  return (
    <Tabs.Tab
      value={value}
      className={cn(
        "relative flex min-w-0 flex-col items-center gap-1.5 rounded-md p-2 text-center outline-none transition-colors duration-200 ease-soft focus-visible:ring-2 focus-visible:ring-sky sm:flex-row sm:gap-4 sm:p-3 sm:pr-5 sm:text-left",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {active ? (
        <m.span
          layoutId="room-setup-tab"
          transition={spring}
          className="absolute inset-0 rounded-md bg-surface shadow-card"
        />
      ) : null}
      <span
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-sm transition-colors duration-200 sm:size-12",
          active ? tone : "bg-surface/60",
        )}
      >
        <Icon className="size-5 sm:size-6" strokeWidth={1.75} />
        {problem ? (
          <span className="-top-1 -right-1 absolute size-3 rounded-full bg-no ring-2 ring-sunken" />
        ) : null}
      </span>
      <span className="relative flex min-w-0 max-w-full flex-col">
        <span className="truncate font-bold font-display text-base leading-tight sm:text-xl">
          {label}
        </span>
        <span
          id={problemId}
          className={cn(
            "truncate font-medium text-[13px] max-sm:sr-only",
            problem ? "text-no" : "text-ink-muted",
          )}
        >
          {problem ?? summary}
        </span>
      </span>
    </Tabs.Tab>
  );
}

/**
 * The key-shaped main action, like the hub's "Create" and the lobby's "Start".
 * It only turns on when the room can be saved, and then it bounces now and
 * then, its arrow nudging forward.
 */
function SubmitButton({
  ready,
  pending,
  describedBy,
  children,
}: {
  ready: boolean;
  pending: boolean;
  describedBy?: string;
  children: ReactNode;
}) {
  const still = useReducedMotion() ?? false;
  const live = ready && !pending && !still;
  return (
    <button
      type="submit"
      disabled={!ready || pending}
      aria-describedby={describedBy}
      className={keyClass("sky", {
        bounce: ready && !pending,
        className: "min-h-16 px-9 text-xl sm:px-10",
      })}
    >
      {children}
      <m.span
        aria-hidden
        className="flex"
        animate={live ? { x: [0, 4, 0] } : { x: 0 }}
        transition={
          live
            ? {
                duration: 0.8,
                ease: ease.swap,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 2.8,
                delay: 0.5,
              }
            : undefined
        }
      >
        <ArrowRight className="size-6 shrink-0" strokeWidth={2.5} />
      </m.span>
    </button>
  );
}
