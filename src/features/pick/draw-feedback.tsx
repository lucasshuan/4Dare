"use client";

import { useTranslations } from "next-intl";
import { RateBubble } from "@/components/ui/rate-bubble";
import { rateRandomPick } from "@/server/actions";

/**
 * A small bubble over a character the dice just drew: does it fit the theme?
 * "No" makes it less likely for this theme and draws another; "yes" makes it
 * more likely. Give it a key per character so every draw asks again.
 */
export function DrawFeedback({
  code,
  characterId,
  show,
  onMisfit,
}: {
  code: string;
  characterId: string;
  /** False while the card is still flipping in. */
  show: boolean;
  onMisfit: () => void;
}) {
  const t = useTranslations("room.pick");
  return (
    <RateBubble
      show={show}
      labels={{
        question: t("rateQuestion"),
        yes: t("rateYes"),
        no: t("rateNo"),
        thanks: t("rateThanks"),
        dismiss: t("rateDismiss"),
      }}
      onAnswer={(fits) => {
        // Fire and forget: a lost vote is no reason to hold the player up.
        void rateRandomPick(code, characterId, fits);
        if (!fits) onMisfit();
      }}
      className="-translate-x-1/2 absolute top-14 left-1/2 z-10"
    />
  );
}
