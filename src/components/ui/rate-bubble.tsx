"use client";

import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { dur } from "@/lib/motion";

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

/** How long the thanks stays before the bubble goes (ms). */
const THANKS_MS = 1400;

export interface RateLabels {
  question: string;
  yes: string;
  no: string;
  thanks: string;
  dismiss: string;
}

/**
 * A small "liked it?" pill: thumbs up, thumbs down, close. A "yes" says thanks
 * for a moment before it goes; a "no" too with `thankNo`, else it goes at once.
 * Give it a key per thing it asks about, so a new one asks again.
 */
export function RateBubble({
  show,
  labels,
  onAnswer,
  onDismiss,
  thankNo,
  lead,
  className,
}: {
  /** False until it may come in (a card still flipping, a reveal still on). */
  show: boolean;
  labels: RateLabels;
  onAnswer: (liked: boolean) => void;
  onDismiss?: () => void;
  thankNo?: boolean;
  /** Before the question: a picture of what it asks about. */
  lead?: ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"ask" | "thanks" | "gone">("ask");

  useEffect(() => {
    if (state !== "thanks") return;
    const id = window.setTimeout(() => setState("gone"), THANKS_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  const answer = (liked: boolean) => {
    setState(liked || thankNo ? "thanks" : "gone");
    onAnswer(liked);
  };

  return (
    <AnimatePresence>
      {show && state !== "gone" ? (
        <m.div
          key="bubble"
          role="group"
          aria-label={labels.question}
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
          exit={{ opacity: 0, y: -6, transition: { duration: dur.fast } }}
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded-pill bg-surface py-1.5 pr-1.5 pl-4 text-ink shadow-pop",
            className,
          )}
        >
          {lead}
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
                {labels.thanks}
              </m.span>
            ) : (
              <m.span
                key="ask"
                exit={{ opacity: 0, y: -8 }}
                className="flex min-w-0 items-center gap-1"
              >
                <span className="mr-1 min-w-0 truncate font-semibold text-sm">
                  {labels.question}
                </span>
                <Vote
                  label={labels.yes}
                  className="hover:bg-yes-soft hover:text-yes"
                  onClick={() => answer(true)}
                >
                  <ThumbsUp className="size-4.5" strokeWidth={2} />
                </Vote>
                <Vote
                  label={labels.no}
                  className="hover:bg-no-soft hover:text-no"
                  onClick={() => answer(false)}
                >
                  <ThumbsDown className="size-4.5" strokeWidth={2} />
                </Vote>
                <Vote
                  label={labels.dismiss}
                  className="text-ink-muted hover:bg-sunken"
                  onClick={() => {
                    setState("gone");
                    onDismiss?.();
                  }}
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
  children: ReactNode;
}) {
  return (
    <m.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-pill transition-colors duration-200 ease-soft",
        className,
      )}
    >
      {children}
    </m.button>
  );
}
