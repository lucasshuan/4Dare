"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { HintLabel } from "@/components/ui/hint-label";
import { TextField } from "@/components/ui/text-field";
import {
  DEFAULT_SETTINGS,
  ROOM_NAME_MAX,
  ROOM_PASSWORD_MAX,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
  STEP_TIMES,
  type StepTime,
} from "@/game/types";
import { cn } from "@/lib/cn";
import type { CreateRoomInput } from "@/server/contract";

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
  disabled,
  describedBy,
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
  disabled?: (v: T) => boolean;
  describedBy?: string;
  className?: string;
}) {
  return (
    <ChoiceGroup
      label={label}
      describedBy={describedBy}
      className={cn("flex-wrap self-start", className)}
    >
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          aria-pressed={o === value}
          disabled={disabled?.(o)}
          onClick={() => onChange(o)}
          className={cn(
            "h-9 rounded-pill px-4 font-semibold text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft disabled:opacity-40",
            o === value
              ? "bg-surface text-ink shadow-card"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {render(o)}
        </button>
      ))}
    </ChoiceGroup>
  );
}

const clampSeconds = (n: number, fallback: number) =>
  Math.min(
    STEP_SECONDS_MAX,
    Math.max(STEP_SECONDS_MIN, Math.round(n / 10) * 10 || fallback),
  );

/** One step's seconds: a label with its hint, then − [90] + in steps of 10. */
function SecondsField({
  step,
  value,
  onChange,
}: {
  step: StepTime;
  value: number;
  onChange: (n: number) => void;
}) {
  const t = useTranslations("home.createRoom");
  const hintId = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (n: number) => {
    const v = clampSeconds(n, DEFAULT_SETTINGS[step]);
    setDraft(String(v));
    onChange(v);
  };
  const label = t(`times.${step}.label`);
  return (
    <div className="flex flex-col gap-2">
      <HintLabel hint={t(`times.${step}.hint`)} hintId={hintId}>
        {label}
      </HintLabel>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label}: ${t("less")}`}
          aria-disabled={value <= STEP_SECONDS_MIN}
          onClick={() => value > STEP_SECONDS_MIN && set(value - 10)}
          className="flex size-10 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface transition-[opacity,transform] duration-150 active:scale-90 aria-disabled:opacity-35"
        >
          <Minus className="size-4.5" strokeWidth={1.75} />
        </button>
        <input
          aria-label={label}
          aria-describedby={hintId}
          inputMode="numeric"
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))
          }
          onBlur={() => set(Number(draft))}
          onKeyDown={(e) => {
            if (e.key === "Enter") set(Number(draft));
          }}
          className="h-11 w-18 rounded-md border-[1.5px] border-line-strong bg-surface text-center font-medium font-mono text-lg tabular-nums"
        />
        <button
          type="button"
          aria-label={`${label}: ${t("more")}`}
          aria-disabled={value >= STEP_SECONDS_MAX}
          onClick={() => value < STEP_SECONDS_MAX && set(value + 10)}
          className="flex size-10 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface transition-[opacity,transform] duration-150 active:scale-90 aria-disabled:opacity-35"
        >
          <Plus className="size-4.5" strokeWidth={1.75} />
        </button>
        <span className="text-ink-muted text-sm">{t("secondsUnit")}</span>
      </div>
    </div>
  );
}

/** True when the room is private but has no password yet: it can't be saved like that. */
export const missingPassword = (v: CreateRoomInput) =>
  v.visibility === "private" && !v.password.trim();

/** True when the room has no name: it can't be saved like that. */
export const missingName = (v: CreateRoomInput) => !v.name.trim();

/**
 * Name, who can join (and the password of a private room) on one row, then
 * seats: used to create a room and to edit it in the lobby. Each label carries
 * its hint in a tooltip. The game's rules are in RulesFields below, the theme
 * settings in theme-fields.tsx.
 */
export function SettingsFields({
  value,
  onChange,
  minSeats = 1,
}: {
  value: CreateRoomInput;
  onChange: (v: CreateRoomInput) => void;
  minSeats?: number;
}) {
  const t = useTranslations("home.createRoom");
  const visibilityHint = useId();
  const seatsHint = useId();
  return (
    <div className="flex flex-col gap-6 sm:tiny:gap-4">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
        <RoomNameField
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
        />
        <div className="flex flex-col gap-2">
          <HintLabel hint={t("visibilityHint")} hintId={visibilityHint}>
            {t("visibility")}
          </HintLabel>
          <Segmented
            label={t("visibility")}
            options={["public", "private"] as const}
            value={value.visibility}
            onChange={(visibility) => onChange({ ...value, visibility })}
            render={(v) => t(v)}
            describedBy={visibilityHint}
          />
        </div>
        <AnimatePresence initial={false}>
          {value.visibility === "private" ? (
            <m.div
              key="password"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
              className="w-full max-w-60 sm:w-60"
            >
              <TextField
                label={t("password")}
                placeholder={t("passwordPlaceholder")}
                value={value.password}
                max={ROOM_PASSWORD_MAX}
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                aria-invalid={missingPassword(value)}
                onChange={(e) =>
                  onChange({ ...value, password: e.target.value })
                }
              />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="flex flex-col gap-2">
        <HintLabel hint={t("seatsHint")} hintId={seatsHint}>
          {t("seats")}
        </HintLabel>
        <Segmented
          label={t("seats")}
          options={[2, 3, 4] as const}
          value={value.seats}
          onChange={(seats) => onChange({ ...value, seats })}
          render={String}
          disabled={(n) => n < minSeats}
          describedBy={seatsHint}
        />
      </div>
    </div>
  );
}

/**
 * The rules of the room's game: for now the seconds of each step of a match,
 * two by two, four by four on wide screens. Each game can bring its own here.
 */
export function RulesFields({
  value,
  onChange,
}: {
  value: CreateRoomInput;
  onChange: (v: CreateRoomInput) => void;
}) {
  return (
    <div className="grid gap-x-10 gap-y-6 sm:grid-cols-[repeat(2,max-content)] sm:tiny:gap-y-4 xl:grid-cols-4 xl:gap-x-6">
      {STEP_TIMES.map((step) => (
        <SecondsField
          key={step}
          step={step}
          value={value[step]}
          onChange={(n) => onChange({ ...value, [step]: n })}
        />
      ))}
    </div>
  );
}

/** The room's name: required, up to ROOM_NAME_MAX characters, nothing under the field. */
function RoomNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const t = useTranslations("home.createRoom");
  return (
    <TextField
      label={t("roomName")}
      placeholder={t("roomNamePlaceholder")}
      value={value}
      maxLength={ROOM_NAME_MAX}
      required
      aria-invalid={!value.trim()}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-sm sm:w-72"
    />
  );
}
