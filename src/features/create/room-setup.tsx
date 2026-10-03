"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ArrowRight, Shapes, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import type { CreateRoomInput } from "@/server/contract";
import { GameField } from "./game-field";
import { missingPassword, SettingsFields } from "./settings-fields";
import { missingSets, ThemeFields } from "./theme-fields";

type Tab = "room" | "themes";

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

/** Looks of the "Back" link (or button) that opens the setup screen. */
export const backClass =
  "-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink";

/**
 * Creating a room and editing it in the lobby: back, the title with the submit
 * button on its far right, the game, then the settings in tabs. "Who am I?"
 * keeps its themes in a second tab.
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
  const problems: Record<Tab, string | null> = {
    room: value && missingPassword(value) ? t("needPassword") : null,
    themes: value && missingSets(value) ? t("needOneSet") : null,
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
          <SubmitButton
            ready={value !== null && !problemTab}
            pending={pending}
            describedBy={problemTab ? `${problemId}-${problemTab}` : undefined}
          >
            {submit}
          </SubmitButton>
        </div>
      </div>
      {value ? (
        <>
          <GameField
            value={value.game}
            onChange={(game) => onChange({ ...value, game })}
          />
          <Tabs.Root
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="flex flex-col gap-6 sm:tiny:gap-4"
          >
            <Tabs.List className="grid grid-cols-2 gap-1.5 rounded-lg bg-sunken p-1.5">
              <SetupTab
                value="room"
                active={tab === "room"}
                icon={SlidersHorizontal}
                tone="bg-sky-soft text-sky"
                label={t("tabRoom")}
                summary={t("roomSummary", {
                  visibility: t(value.visibility),
                  seats: value.seats,
                  seconds: value.stepSeconds,
                })}
                problem={problems.room}
                problemId={`${problemId}-room`}
              />
              {value.game === "who-am-i" ? (
                <SetupTab
                  value="themes"
                  active={tab === "themes"}
                  icon={Shapes}
                  tone="bg-apricot-soft text-apricot"
                  label={t("themes")}
                  summary={
                    value.themeMode === "host"
                      ? t("themeHost")
                      : `${t("themeVote")} · ${t("setsOn", {
                          on: value.themeSets.length,
                          total: THEME_SET_KEYS.length,
                        })}`
                  }
                  problem={problems.themes}
                  problemId={`${problemId}-themes`}
                />
              ) : null}
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
            <Tabs.Panel value="themes" className="outline-none">
              <PanelIn>
                <ThemeFields
                  value={value}
                  onChange={(v) => onChange({ ...value, ...v })}
                />
              </PanelIn>
            </Tabs.Panel>
          </Tabs.Root>
        </>
      ) : null}
    </form>
  );
}

function PanelIn({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: dur.base, ease: ease.soft },
      }}
    >
      {children}
    </motion.div>
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
        "relative flex min-w-0 items-center gap-3 rounded-md p-2 pr-4 text-left outline-none transition-colors duration-200 ease-soft focus-visible:ring-2 focus-visible:ring-sky sm:gap-4 sm:p-3 sm:pr-5",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {active ? (
        <motion.span
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
      <span className="relative flex min-w-0 flex-col">
        <span className="font-bold font-display text-lg leading-tight sm:text-xl">
          {label}
        </span>
        <span
          id={problemId}
          className={cn(
            "truncate font-medium text-[13px]",
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
 * Big and bold. It only turns on when the room can be saved, and then a soft
 * light runs across it now and then.
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
  const loop = {
    duration: 1.2,
    ease: ease.swap,
    repeat: Number.POSITIVE_INFINITY,
    repeatDelay: 2.8,
  };
  return (
    <button
      type="submit"
      disabled={!ready || pending}
      aria-describedby={describedBy}
      className={cn(
        buttonClass("primary", "lg"),
        "relative ml-auto h-16 overflow-hidden px-9 font-bold font-display text-xl shadow-card sm:px-10",
        "disabled:shadow-none",
      )}
    >
      {live ? (
        <motion.span
          aria-hidden
          initial={{ x: "-120%" }}
          animate={{ x: "320%" }}
          transition={loop}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 skew-x-[-20deg] bg-linear-to-r from-transparent via-on-ink/25 to-transparent"
        />
      ) : null}
      <span className="relative">{children}</span>
      <motion.span
        aria-hidden
        className="relative flex"
        animate={live ? { x: [0, 4, 0] } : { x: 0 }}
        transition={live ? { ...loop, duration: 0.8, delay: 0.5 } : undefined}
      >
        <ArrowRight className="size-6!" strokeWidth={2.25} />
      </motion.span>
    </button>
  );
}
