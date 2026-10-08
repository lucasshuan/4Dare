"use client";

// The players' wait while the presenter chooses: a scene from inside the
// show (the mission being sealed, the lot under its cloth, the boards under
// a spotlight), the presenter's face, the three steps, and a guess just for
// fun ("What for ____") that shows with the envelope.
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { GUESS_MAX } from "@/game/lineup/rules";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { guessWhatFor } from "@/server/actions";
import { useLineup } from "../use-lineup";
import { CoveredLot, SealScene, Spotlight } from "./wait-scenes";

/** The presenter at work: their face with a ring that breathes, no screen around it. */
export function PresenterBadge() {
  const { lu, playerById } = useLineup();
  const still = useReducedMotion() ?? false;
  const host = lu.presenterId ? playerById(lu.presenterId) : null;
  if (!host) return null;
  return (
    <span className="relative grid place-items-center">
      <m.span
        aria-hidden="true"
        className="absolute inset-[-6px] rounded-pill border-[3px] border-butter"
        animate={
          still ? undefined : { scale: [1, 1.12, 1], opacity: [0.9, 0.3, 0.9] }
        }
        transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
      />
      <Avatar avatar={host.avatar} size={52} seat={host.colorSlot} />
    </span>
  );
}

/** "What for ____": kept quietly as it is typed. */
function Hunch() {
  const t = useTranslations("lineup.host.wait");
  const { lu, me, code } = useLineup();
  const [text, setText] = useState(lu.guesses[me.id] ?? "");
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const save = (v: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const r = await guessWhatFor(code, v);
      setSaved(r.ok && v.trim().length > 0);
    }, 700);
  };
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="font-bold text-[13px] uppercase tracking-[0.08em] opacity-80">
          {t("hunch")}
        </span>
        <span className="flex h-12 items-center gap-2 rounded-pill border-[1.5px] border-line-strong bg-surface px-5 text-ink focus-within:border-sky">
          <b className="shrink-0 font-display font-extrabold">
            {t("hunchPrefix")}
          </b>
          <input
            value={text}
            maxLength={GUESS_MAX}
            placeholder={t("hunchPlaceholder")}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
              save(e.target.value);
            }}
            className="h-full min-w-0 flex-1 bg-transparent font-semibold outline-none focus-visible:outline-none!"
          />
        </span>
      </label>
      <span
        aria-live="polite"
        className={cn(
          "min-h-5 font-semibold text-[13px] transition-opacity",
          saved ? "opacity-100" : "opacity-0",
        )}
      >
        {t("hunchSaved")}
      </span>
    </div>
  );
}

export function WaitScreen() {
  const t = useTranslations("lineup.host.wait");
  const name = useDisplayName();
  const { lu, view, me, playerById } = useLineup();
  const host = lu.presenterId ? playerById(lu.presenterId) : null;
  const who = host ? name(host, false) : "";
  const step =
    view.phase === "choosing"
      ? 0
      : view.phase === "queueing" && Object.keys(lu.cards).length === 0
        ? 1
        : 2;
  const text =
    view.phase === "verdict"
      ? t("verdict", { name: who })
      : view.phase === "choosing"
        ? t("choosing", { name: who })
        : step === 1
          ? t("first", { name: who })
          : t("next", { name: who });
  const before = view.phase === "choosing" || step === 1;
  const plays = lu.dealtIds.includes(me.id);
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-6 text-center",
        // the slate behind the wait; the verdict's is butter
        view.phase !== "verdict" && "text-chalk",
      )}
    >
      {view.phase === "verdict" ? (
        <Spotlight />
      ) : view.phase === "choosing" ? (
        <SealScene />
      ) : (
        <CoveredLot />
      )}
      <div className="flex max-w-[90vw] items-center gap-3">
        <PresenterBadge />
        <h2 className="m-0 text-balance text-left font-display font-extrabold text-[clamp(20px,3.4vw,30px)] leading-tight">
          {text}
        </h2>
      </div>
      {before ? (
        <ol className="flex flex-wrap justify-center gap-2" aria-label={text}>
          {(["mission", "first", "auction"] as const).map((k, i) => (
            <li
              key={k}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-pill px-4 font-bold text-sm",
                i === step
                  ? "bg-butter text-on-butter"
                  : i < step
                    ? "bg-yes-soft text-yes"
                    : "bg-surface/80 text-ink-muted",
              )}
            >
              {i < step ? "✓" : `${i + 1}.`} {t(`steps.${k}`)}
            </li>
          ))}
        </ol>
      ) : null}
      {before && plays ? <Hunch /> : null}
    </div>
  );
}
