"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { HintLabel } from "@/components/ui/hint-label";
import { TextField } from "@/components/ui/text-field";
import {
  DEFAULT_SETTINGS,
  ROOM_NAME_MAX,
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

/** Visibility, seats and seconds per step: used to create a room and to edit it in the lobby. Each label carries its hint in a tooltip. The theme settings are in theme-fields.tsx. */
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
    <>
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
      <div className="md:col-span-2 lg:col-span-1">
        <SecondsStepper
          value={value.stepSeconds}
          onChange={(stepSeconds) => onChange({ ...value, stepSeconds })}
        />
      </div>
    </>
  );
}

/** The room's name: optional, up to ROOM_NAME_MAX characters. */
export function RoomNameField({
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
      className="max-w-sm"
    />
  );
}
