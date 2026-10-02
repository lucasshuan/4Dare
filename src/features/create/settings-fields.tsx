"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

const clampSeconds = (n: number) =>
  Math.min(
    STEP_SECONDS_MAX,
    Math.max(
      STEP_SECONDS_MIN,
      Math.round(n / 10) * 10 || DEFAULT_SETTINGS.stepSeconds,
    ),
  );

function SecondsStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const t = useTranslations("home.createRoom");
  const hintId = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (n: number) => {
    const v = clampSeconds(n);
    setDraft(String(v));
    onChange(v);
  };
  return (
    <div className="flex flex-col gap-2">
      <HintLabel hint={t("secondsHint")} hintId={hintId}>
        {t("seconds")}
      </HintLabel>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("less")}
          onClick={() => set(value - 10)}
          className="flex size-11 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface"
        >
          <Minus className="size-5" strokeWidth={1.75} />
        </button>
        <input
          aria-label={t("seconds")}
          aria-describedby={hintId}
          inputMode="numeric"
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))
          }
          onBlur={() => set(Number(draft))}
          className="h-13 w-24 rounded-md border-[1.5px] border-line-strong bg-surface text-center font-medium font-mono text-xl tabular-nums"
        />
        <button
          type="button"
          aria-label={t("more")}
          onClick={() => set(value + 10)}
          className="flex size-11 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface"
        >
          <Plus className="size-5" strokeWidth={1.75} />
        </button>
        <span>{t("secondsUnit")}</span>
      </div>
      {/* the stepper does it all; very short windows skip the shortcuts */}
      <Segmented
        label={t("seconds")}
        options={[60, 90, 120, 180, 300] as const}
        value={value as 60}
        onChange={set}
        render={String}
        describedBy={hintId}
        className="sm:tiny:hidden"
      />
    </div>
  );
}

/** True when the room is private but has no password yet: it can't be saved like that. */
export const missingPassword = (v: CreateRoomInput) =>
  v.visibility === "private" && !v.password.trim();

/**
 * Name, who can join (and the password of a private room) on one row, then
 * seats and seconds per step: used to create a room and to edit it in the
 * lobby. Each label carries its hint in a tooltip. The theme settings are in
 * theme-fields.tsx.
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
            <motion.div
              key="password"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
              className="w-full max-w-60 sm:w-60"
            >
              <TextField
                label={t("password")}
                hint={t("passwordHint")}
                placeholder={t("passwordPlaceholder")}
                value={value.password}
                max={ROOM_PASSWORD_MAX}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={missingPassword(value)}
                onChange={(e) =>
                  onChange({ ...value, password: e.target.value })
                }
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
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
        <SecondsStepper
          value={value.stepSeconds}
          onChange={(stepSeconds) => onChange({ ...value, stepSeconds })}
        />
      </div>
    </div>
  );
}

/** The room's name: optional, up to ROOM_NAME_MAX characters. */
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
      hint={t("roomNameHint")}
      placeholder={t("roomNamePlaceholder")}
      value={value}
      max={ROOM_NAME_MAX}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-sm sm:w-72"
    />
  );
}
