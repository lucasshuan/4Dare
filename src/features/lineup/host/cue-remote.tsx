"use client";

// The presenter's remote under the TV: four sounds for everyone, one every
// few seconds. And what everyone sees and hears when one plays.
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CUE_GAP_MS } from "@/game/lineup/rules";
import { CUES, type LuCue } from "@/game/lineup/types";
import { cn } from "@/lib/cn";
import { playCue } from "@/server/actions";
import { cueSound } from "../chime";
import { useLineup, useLuAction } from "../use-lineup";

const EMOJI: Record<LuCue, string> = {
  drum: "🥁",
  clap: "👏",
  horn: "📯",
  gasp: "😱",
};

export function CueRemote({ className }: { className?: string }) {
  const t = useTranslations("lineup.host.remote");
  const { code } = useLineup();
  const { run } = useLuAction();
  const [resting, setResting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <fieldset
      aria-label={t("title")}
      className={cn(
        "m-0 flex min-w-0 items-center gap-2 rounded-[18px] border-0 bg-[#2b2622] px-3 py-2 shadow-card",
        className,
      )}
    >
      {CUES.map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={resting}
          aria-label={t(`cues.${kind}`)}
          title={t(`cues.${kind}`)}
          onClick={() => {
            setResting(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(
              () => setResting(false),
              CUE_GAP_MS,
            );
            void run(() => playCue(code, kind));
          }}
          className="grid size-11 place-items-center rounded-pill bg-[#4a4039] text-[22px] shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] transition-[transform,opacity] active:scale-90 disabled:opacity-40"
        >
          {EMOJI[kind]}
        </button>
      ))}
    </fieldset>
  );
}

/** A sound from the remote: everyone hears it and sees its emoji pop, once. */
export function CueEffect() {
  const { lu, offset } = useLineup();
  const still = useReducedMotion() ?? false;
  const cue = lu.cue;
  const seen = useRef(cue?.n ?? 0);
  const [shown, setShown] = useState<{ kind: LuCue; n: number } | null>(null);
  useEffect(() => {
    if (!cue || cue.n <= seen.current) return;
    seen.current = cue.n;
    // only a fresh one: a page opened later doesn't replay it
    if (Date.now() + offset - cue.at > 4000) return;
    cueSound(cue.kind);
    setShown({ kind: cue.kind, n: cue.n });
  }, [cue, offset]);
  // its own timer: a new copy of the same cue (any room update) can't keep it up
  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setShown(null), 1600);
    return () => window.clearTimeout(id);
  }, [shown]);
  return (
    <AnimatePresence>
      {shown ? (
        <m.span
          key={shown.n}
          aria-hidden="true"
          className="pointer-events-none fixed top-[28%] left-1/2 z-[60] -translate-x-1/2 text-[min(28vw,140px)] leading-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
          initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: still ? 1 : 1.3 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
        >
          {EMOJI[shown.kind]}
        </m.span>
      ) : null}
    </AnimatePresence>
  );
}
