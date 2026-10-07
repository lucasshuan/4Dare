"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { CardBack } from "@/components/ui/card-frame";
import { useRoomContext } from "@/features/data/room-context";
import { GAME_AREA } from "@/features/stage/scene-kit";
import type { RevealView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease, gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

type Scene = Extract<RevealView, { kind: "out" | "swap" }>;

const stamp =
  "rounded-md px-5 py-2 font-display font-extrabold text-[26px] uppercase tracking-[0.02em] shadow-pop sm:text-[34px]";

/**
 * The Impostor's full-screen moments, on the server clock so a reload lands
 * on the same frame: the vote's result with the lights down (a spotlight on
 * whoever goes, their card face down and the stamp: impostor or not; a tie
 * sends nobody), and the cards swapped for someone who didn't know theirs.
 * The cards themselves only show at the end.
 */
export function ImpostorScenes() {
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 100);
  const r =
    view.reveal?.kind === "out" || view.reveal?.kind === "swap"
      ? (view.reveal as Scene)
      : null;
  const on = !!r && now >= r.startsAt && now < r.until;
  return (
    <AnimatePresence>
      {on && r ? (
        <m.div
          key={`${r.kind}-${r.n}-${r.until}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.4 } }}
          exit={{
            opacity: 0,
            transition: { duration: dur.slow, ease: ease.soft },
          }}
          className={cn(
            GAME_AREA,
            "z-[32] flex flex-col items-center justify-center overflow-hidden px-6 py-10 text-white max-sm:pb-[calc(2.5rem+var(--dock))]",
          )}
          style={{ backgroundColor: "#0b0f17" }}
        >
          {r.kind === "out" ? <Out r={r} /> : <Swap />}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function Out({ r }: { r: Extract<Scene, { kind: "out" }> }) {
  const t = useTranslations("impostor.out");
  const { playerById } = useRoomContext();
  const name = useDisplayName();
  const still = useReducedMotion() ?? false;
  const p = playerById(r.id);
  if (!p)
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
        className="flex max-w-[560px] flex-col items-center gap-3 text-center"
      >
        <span className="font-bold font-display text-[clamp(32px,5vw,52px)] leading-tight">
          {t("tie")}
        </span>
        <span className="text-lg text-white/70">{t("tieBody")}</span>
      </m.div>
    );
  return (
    <div className="relative flex flex-col items-center gap-5">
      {/* the spotlight */}
      <m.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { duration: 0.8, ease: gs.p3Out },
        }}
        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 size-[min(560px,90vw)] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,240,200,0.35), rgba(255,240,200,0.08) 45%, transparent 70%)",
        }}
      />
      <m.span
        initial={still ? { opacity: 0 } : { opacity: 0, y: -30 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { delay: 0.3, duration: 0.5 },
        }}
        className="relative flex flex-col items-center gap-2"
      >
        <Avatar avatar={p.avatar} seat={p.colorSlot} size={68} />
        <span className="font-bold font-display text-2xl">
          {t("goes", { name: name(p, p.isYou) })}
        </span>
      </m.span>
      <m.div
        initial={still ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
        animate={{
          opacity: 1,
          rotateY: 0,
          transition: { delay: 0.8, duration: 0.6 },
        }}
        className="relative w-40 sm:w-48"
      >
        <CardBack
          seat={p.colorSlot}
          logo
          className="rounded-[18px] shadow-pop"
        />
      </m.div>
      <m.span
        initial={
          still ? { opacity: 0 } : { opacity: 0, scale: 2.2, rotate: -14 }
        }
        animate={{
          opacity: 1,
          scale: 1,
          rotate: -6,
          transition: { delay: 1.8, duration: 0.45, ease: gs.backOut(2) },
        }}
        className={cn(
          stamp,
          "relative -mt-16",
          r.impostor ? "bg-no text-on-no" : "bg-surface text-ink",
        )}
      >
        {r.impostor ? t("impostor") : t("notImpostor")}
      </m.span>
    </div>
  );
}

function Swap() {
  const t = useTranslations("impostor.swap");
  const still = useReducedMotion() ?? false;
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <m.span
            key={i}
            className="w-20 sm:w-24"
            animate={
              still
                ? {}
                : { x: [0, (1 - i) * 90, 0], rotate: [0, (i - 1) * 12, 0] }
            }
            transition={{ duration: 1.2, delay: 0.2, ease: "easeInOut" }}
          >
            <CardBack seat={null} className="rounded-[14px] shadow-pop" />
          </m.span>
        ))}
      </div>
      <span className="font-bold font-display text-[clamp(28px,4vw,44px)] leading-tight">
        {t("title")}
      </span>
      <span className="max-w-[440px] text-lg text-white/70">{t("body")}</span>
    </div>
  );
}
