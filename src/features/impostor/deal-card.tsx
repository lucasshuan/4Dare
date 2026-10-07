"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRoomContext } from "@/features/data/room-context";
import { useAfter } from "@/features/stage/scene-kit";
import { beatOf, markAt } from "@/features/stage/stage";
import { SHOW_MARKS, type ShowView } from "@/game/types";
import { gs } from "@/lib/motion";
import { MyCard } from "./my-card";

/**
 * The deal's card beat: your card drops in the middle, in your colour, with
 * "Memorize it. Don't show it."; then the turn that makes the game: "One of
 * you has another. It may be you." Everyone sees the same scene, impostor or
 * not.
 */
export function DealCard({ show }: { show: ShowView }) {
  const t = useTranslations("impostor.deal");
  const { view } = useRoomContext();
  const still = useReducedMotion() ?? false;
  const beat = beatOf(show, "card");
  const warn = useAfter(beat ? markAt(beat, SHOW_MARKS.cardWarning) : null);
  const card = view.imp?.card ?? null;
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-6">
      <AnimatePresence mode="wait" initial={false}>
        <m.p
          key={warn ? "warn" : "keep"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
          className="max-w-[560px] text-balance text-center font-bold font-display text-[clamp(26px,4vw,40px)] leading-tight"
        >
          {warn ? t("warning", { count: view.imp?.impostors ?? 1 }) : t("keep")}
        </m.p>
      </AnimatePresence>
      {card ? (
        <m.div
          initial={
            still
              ? { opacity: 0 }
              : { opacity: 0, y: -120, rotate: -8, scale: 0.8 }
          }
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: gs.backOut(1.4) }}
          className="w-[min(300px,78vw)]"
        >
          <MyCard card={card} />
        </m.div>
      ) : null}
    </div>
  );
}
