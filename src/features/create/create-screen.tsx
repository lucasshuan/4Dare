"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Screen } from "@/components/ui/screen";
import {
  DEFAULT_SETTINGS,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
} from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { createRoom } from "@/server/actions";

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <ChoiceGroup label={label} className="flex-wrap self-start">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={cn(
            "h-9 rounded-pill px-4 font-semibold text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft",
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

export function CreateScreen() {
  const t = useTranslations("home.createRoom");
  const router = useRouter();
  const { run, pending } = useAction();
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [seats, setSeats] = useState<2 | 3 | 4>(4);
  const [seconds, setSeconds] = useState(DEFAULT_SETTINGS.stepSeconds);
  const [draft, setDraft] = useState(String(DEFAULT_SETTINGS.stepSeconds));

  const setBoth = (n: number) => {
    const v = clampSeconds(n);
    setSeconds(v);
    setDraft(String(v));
  };

  return (
    <Screen
      right={
        <Link
          href="/"
          className="px-2 font-semibold text-ink-muted hover:text-ink"
        >
          {t("back")}
        </Link>
      }
    >
      <form
        className="flex max-w-[560px] flex-col gap-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() =>
            createRoom({ visibility, seats, stepSeconds: seconds }),
          );
          if (r.ok) router.push(`/r/${r.data.code}`);
        }}
      >
        <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
          {t("title")}
        </h1>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">{t("visibility")}</span>
          <Segmented
            label={t("visibility")}
            options={["public", "private"] as const}
            value={visibility}
            onChange={setVisibility}
            render={(v) => t(v)}
          />
          <span className="font-medium text-[13px] text-ink-muted">
            {t("visibilityHint")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">{t("seats")}</span>
          <Segmented
            label={t("seats")}
            options={[2, 3, 4] as const}
            value={seats}
            onChange={setSeats}
            render={String}
          />
          <span className="font-medium text-[13px] text-ink-muted">
            {t("seatsHint")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="step-seconds" className="font-semibold text-sm">
            {t("seconds")}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("less")}
              onClick={() => setBoth(seconds - 10)}
              className="flex size-11 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface"
            >
              <Minus className="size-5" strokeWidth={1.75} />
            </button>
            <input
              id="step-seconds"
              inputMode="numeric"
              value={draft}
              onChange={(e) =>
                setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              onBlur={() => setBoth(Number(draft))}
              className="h-13 w-24 rounded-md border-[1.5px] border-line-strong bg-surface text-center font-medium font-mono text-xl tabular-nums"
            />
            <button
              type="button"
              aria-label={t("more")}
              onClick={() => setBoth(seconds + 10)}
              className="flex size-11 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface"
            >
              <Plus className="size-5" strokeWidth={1.75} />
            </button>
            <span>{t("secondsUnit")}</span>
          </div>
          <Segmented
            label={t("seconds")}
            options={[60, 90, 120, 180, 300] as const}
            value={seconds as 60}
            onChange={setBoth}
            render={String}
          />
          <span className="font-medium text-[13px] text-ink-muted">
            {t("secondsHint")}
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="self-start"
          disabled={pending}
        >
          {t("submit")}
        </Button>
      </form>
    </Screen>
  );
}
