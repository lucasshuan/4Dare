"use client";

import { useTranslations } from "next-intl";
import { useRoomContext } from "@/features/data/room-context";
import { cn } from "@/lib/cn";
import { onSeat, seatColor } from "@/lib/seats";

const STEPS = ["asking", "answering", "guessing", "validating"] as const;

/**
 * The round's steps (question, answers, guess, check), with a pill in the turn
 * player's colour sliding to the current one. The check only happens when a
 * guess needs it, so it stays faint until then. Hidden on phones, for height.
 */
export function TurnSteps() {
  const t = useTranslations("whoAmI.turn.steps");
  const { view, playerById } = useRoomContext();
  const at = STEPS.indexOf(view.phase as (typeof STEPS)[number]);
  if (at < 0) return null;
  const slot = playerById(view.turn?.playerId)?.colorSlot ?? 0;
  return (
    <ol
      aria-label={t("label")}
      className="relative grid grid-cols-4 rounded-pill bg-surface p-[3px] max-sm:hidden"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/4)] rounded-pill transition-[translate,background-color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
        style={{
          translate: `${at * 100}% 0`,
          backgroundColor: seatColor(slot),
        }}
      />
      {STEPS.map((step, i) => (
        <li
          key={step}
          aria-current={i === at ? "step" : undefined}
          className={cn(
            "relative truncate px-1 py-1.5 text-center font-semibold text-xs transition-colors duration-300",
            i !== at && "text-ink-muted",
            i !== at && step === "validating" && "opacity-60",
          )}
          style={i === at ? { color: onSeat(slot) } : undefined}
        >
          {t(step)}
        </li>
      ))}
    </ol>
  );
}
