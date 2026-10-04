"use client";

import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { dur } from "@/lib/motion";
import { rateRandomPick } from "@/server/actions";

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

/**
 * A small bubble over a character the dice just drew: did it fit? "No" makes
 * it less likely for this theme and draws another; "yes" makes it more likely.
 * Give it a key per character so every draw asks again.
 */
export function DrawFeedback({
  code,
  characterId,
  show,
  onDislike,
}: {
  code: string;
  characterId: string;
  /** False while the card is still flipping in. */
  show: boolean;
  onDislike: () => void;
}) {
  const t = useTranslations("room.pick");
  const [state, setState] = useState<"ask" | "thanks" | "gone">("ask");

  useEffect(() => {
    if (state !== "thanks") return;
    const id = window.setTimeout(() => setState("gone"), 1400);
    return () => window.clearTimeout(id);
  }, [state]);

  const answer = (liked: boolean) => {
    // Fire and forget: a lost vote is no reason to hold the player up.
    void rateRandomPick(code, characterId, liked);
    if (liked) setState("thanks");
    else {
      setState("gone");
      onDislike();
    }
  };

  return (
    <AnimatePresence>
      {show && state !== "gone" ? (
        <m.div
          key="bubble"
          role="group"
          aria-label={t("rateQuestion")}
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
          exit={{ opacity: 0, y: -6, transition: { duration: dur.fast } }}
          className="-translate-x-1/2 absolute top-14 left-1/2 z-10 flex items-center gap-1 whitespace-nowrap rounded-pill bg-surface py-1.5 pr-1.5 pl-4 text-ink shadow-pop"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {state === "thanks" ? (
              <m.span
                key="thanks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 py-1.5 pr-2.5 font-semibold text-sm"
              >
                <Check className="size-4 text-yes" strokeWidth={2.75} />
                {t("rateThanks")}
              </m.span>
            ) : (
              <m.span
                key="ask"
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-1"
              >
                <span className="mr-1 font-semibold text-sm">
                  {t("rateQuestion")}
                </span>
                <Vote
                  label={t("rateYes")}
                  className="hover:bg-yes-soft hover:text-yes"
                  onClick={() => answer(true)}
                >
                  <ThumbsUp className="size-4.5" strokeWidth={2} />
                </Vote>
                <Vote
                  label={t("rateNo")}
                  className="hover:bg-no-soft hover:text-no"
                  onClick={() => answer(false)}
                >
                  <ThumbsDown className="size-4.5" strokeWidth={2} />
                </Vote>
                <Vote
                  label={t("rateDismiss")}
                  className="text-ink-muted hover:bg-sunken"
                  onClick={() => setState("gone")}
                >
                  <X className="size-4" strokeWidth={2} />
                </Vote>
              </m.span>
            )}
          </AnimatePresence>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function Vote({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <m.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "flex size-9 items-center justify-center rounded-pill transition-colors duration-200 ease-soft",
        className,
      )}
    >
      {children}
    </m.button>
  );
}
