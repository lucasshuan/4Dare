"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import {
  DEFAULT_SETTINGS,
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
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
  disabled?: (v: T) => boolean;
}) {
  return (
    <ChoiceGroup label={label} className="flex-wrap self-start">
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
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (n: number) => {
    const v = clampSeconds(n);
    setDraft(String(v));
    onChange(v);
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-sm">
        {t("seconds")}
      </label>
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
          id={id}
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
      <Segmented
        label={t("seconds")}
        options={[60, 90, 120, 180, 300] as const}
        value={value as 60}
        onChange={set}
        render={String}
      />
    </div>
  );
}

/** Visibility, seats and seconds per step: used to create a room and to edit it in the lobby. */
export function SettingsFields({
  value,
  onChange,
  minSeats = 1,
  hints = true,
}: {
  value: CreateRoomInput;
  onChange: (v: CreateRoomInput) => void;
  minSeats?: number;
  hints?: boolean;
}) {
  const t = useTranslations("home.createRoom");
  const hint = (key: "visibilityHint" | "seatsHint" | "secondsHint") =>
    hints ? (
      <span className="font-medium text-[13px] text-ink-muted">{t(key)}</span>
    ) : null;
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{t("visibility")}</span>
        <Segmented
          label={t("visibility")}
          options={["public", "private"] as const}
          value={value.visibility}
          onChange={(visibility) => onChange({ ...value, visibility })}
          render={(v) => t(v)}
        />
        {hint("visibilityHint")}
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{t("seats")}</span>
        <Segmented
          label={t("seats")}
          options={[2, 3, 4] as const}
          value={value.seats}
          onChange={(seats) => onChange({ ...value, seats })}
          render={String}
          disabled={(n) => n < minSeats}
        />
        {hint("seatsHint")}
      </div>
      <div className="flex flex-col gap-2">
        <SecondsStepper
          value={value.stepSeconds}
          onChange={(stepSeconds) => onChange({ ...value, stepSeconds })}
        />
        {hint("secondsHint")}
      </div>
    </>
  );
}
