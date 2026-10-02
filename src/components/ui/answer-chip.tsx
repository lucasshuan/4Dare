"use client";

import { useTranslations } from "next-intl";
import type { AnswerValue } from "@/game/types";
import { cn } from "@/lib/cn";

const LOOK: Record<
  AnswerValue,
  { chip: string; dot: string; pressed: string }
> = {
  yes: {
    chip: "border-yes bg-yes-soft",
    dot: "bg-yes",
    pressed: "border-yes bg-yes text-on-yes",
  },
  probably_yes: {
    chip: "border-yes-soft bg-yes-soft",
    dot: "border-[2.5px] border-yes",
    pressed: "border-yes bg-yes text-on-yes",
  },
  unknown: {
    chip: "border-sunken bg-sunken",
    dot: "bg-line-strong",
    pressed: "border-ink bg-ink text-on-ink",
  },
  probably_no: {
    chip: "border-no-soft bg-no-soft",
    dot: "border-[2.5px] border-no",
    pressed: "border-no bg-no text-on-no",
  },
  no: {
    chip: "border-no bg-no-soft",
    dot: "bg-no",
    pressed: "border-no bg-no text-on-no",
  },
  irrelevant: {
    chip: "border-sunken bg-sunken",
    dot: "border-[2.5px] border-line-strong",
    pressed: "border-ink bg-ink text-on-ink",
  },
};

/** One of the six answers. Small = read-only badge for history and reveals. */
export function AnswerChip({
  value,
  small,
  pressed,
  onClick,
  className,
}: {
  value: AnswerValue;
  small?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const t = useTranslations("common.answers");
  const look = LOOK[value];
  const body = (
    <>
      <span
        className={cn(
          "shrink-0 rounded-pill",
          small ? "size-2" : "size-2.5",
          pressed ? "bg-current" : look.dot,
        )}
      />
      <span>{t(value)}</span>
    </>
  );
  const cls = cn(
    "inline-flex items-center gap-2 rounded-pill border-[1.5px] font-semibold text-ink transition-[transform,background-color,color] duration-150 ease-soft",
    small ? "h-[26px] px-2.5 text-[13px]" : "h-12 px-4 text-base",
    pressed ? look.pressed : look.chip,
    className,
  );
  if (!onClick) return <span className={cls}>{body}</span>;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(cls, "active:scale-[0.97]")}
    >
      {body}
    </button>
  );
}

/** A guess result badge: "Acertou" or "Ainda não". */
export function ResultChip({ result }: { result: "hit" | "miss" }) {
  const t = useTranslations("common.guessResult");
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-pill px-2.5 font-semibold text-[13px]",
        result === "hit" ? "bg-yes text-on-yes" : "bg-sunken text-ink",
      )}
    >
      {t(result)}
    </span>
  );
}
