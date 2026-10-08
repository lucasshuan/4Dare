"use client";

import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useRoomContext } from "@/features/data/room-context";
import { FigureArt, SEATS } from "@/features/who-am-i/who-am-i-banner";
import type { Beat, PlayerView, ShowView } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import {
  BIG,
  beatSeconds,
  marked,
  peopleRow,
  SCENE_MIN_H,
  Timeline,
  useAfter,
} from "./scene-kit";
import { beatOf } from "./stage";
import { useStageTimeline } from "./use-stage-timeline";

export interface ColdOpenProps {
  /** The opening show (its curtain, intro or round beat is running). */
  show: ShowView;
}

/** When the second line comes in (s into the cold open). */
const LINE2_AT = 3.65;
/** When the first line comes in. */
const LINE1_AT = 0.15;

/**
 * The cold open of the room's first match (the game in two lines, the room's
 * players with their cards up and yours a "?"), or the "Round N" card of a
 * later one. Both play on the solid brand stage; during the curtain beat
 * before them nothing is drawn yet.
 */
export function ColdOpen({ show }: ColdOpenProps) {
  const intro = beatOf(show, "intro");
  if (intro) return <ColdOpenScene beat={intro} />;
  const round = beatOf(show, "round");
  if (round) return <RoundCard beat={round} n={show.n} />;
  return null;
}

function ColdOpenScene({ beat }: { beat: Beat }) {
  const t = useTranslations("whoAmI.coldOpen");
  const tc = useTranslations("common");
  const lang = useLocale();
  const name = useDisplayName();
  const { view } = useRoomContext();
  const { row, next } = peopleRow(view.players, view.youId);
  const len = beatSeconds(beat);
  // everything leaves 0.5 s before the beat ends (7.1 of 7.6), never before the chips are in
  const outAt = Math.max(len - 0.5, 5.9);
  const line1 = useAfter(beat.startsAt + LINE1_AT * 1000);
  const line2 = useAfter(beat.startsAt + LINE2_AT * 1000);

  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: beat.startsAt,
    deps: [len, lang, row.map((p) => p.id).join(" ")],
    build: (scope, { reduced }) => {
      const tl = new Timeline(reduced);
      const [l1] = marked(scope, "l1");
      const [l2] = marked(scope, "l2");
      const cards = marked(scope, "card");
      const [you] = marked(scope, "card", "you");
      const others = cards.filter((c) => c !== you);
      tl.to(l1, { y: [30, 0], opacity: [0, 1] }, LINE1_AT, 0.6, gs.p3Out);
      tl.to(
        marked(scope, "person"),
        { y: [60, 0], opacity: [0, 1] },
        (i) => 0.55 + i * 0.09,
        0.55,
        gs.backOut(1.5),
      );
      // the cards turn face up (still: they are face up as the people come in)
      tl.to(
        cards,
        { rotateY: [90, 0], scale: [0.6, 1] },
        (i) => (reduced ? 0.55 : 1 + i * 0.12),
        0.55,
        gs.backOut(1.8),
      );
      tl.to(
        you,
        { rotate: [0, -7, 0, -7, 0, -7, 0] },
        2,
        1.08,
        Array(6).fill(gs.sineInOut),
        "skip",
      );
      tl.to(l1, { y: -24, opacity: 0 }, 3.4, 0.35, gs.p2In);
      tl.to(l2, { y: [26, 0], opacity: [0, 1] }, LINE2_AT, 0.55, gs.p3Out);
      tl.to(others, { opacity: 0.55, scale: 0.92 }, 3.7, 0.4, gs.p1Out, "fade");
      tl.to(you, { scale: 1.12 }, 3.7, 0.45, gs.backOut(2), "skip");
      tl.to(
        marked(scope, "bubble"),
        { opacity: [0, 1], scale: [0.4, 1] },
        4.4,
        0.45,
        gs.backOut(2),
      );
      tl.to(
        marked(scope, "chip"),
        { opacity: [0, 1], scale: [0.4, 1], y: [10, 0] },
        (i) => 5.2 + i * 0.25,
        0.4,
        gs.backOut(2.4),
      );
      tl.to(
        marked(scope, "box"),
        { y: [0, -40], opacity: [1, 0] },
        outAt,
        0.45,
        gs.p2In,
      );
      return tl.seq;
    },
  });

  return (
    <div
      ref={ref}
      className={cn(
        SCENE_MIN_H,
        "flex flex-col items-center justify-center px-1.5 pb-10 text-on-brand sm:px-15",
      )}
    >
      <div data-box className="flex flex-col items-center">
        {/* the two lines share one cell and swap in place */}
        <div
          aria-hidden
          className="grid max-w-[340px] text-center sm:max-w-[760px]"
        >
          <p
            data-l1
            style={{ opacity: 0 }}
            className={cn(
              "col-start-1 row-start-1 text-[34px] sm:text-[58px]",
              BIG,
            )}
          >
            {t("line1")}
          </p>
          <p
            data-l2
            style={{ opacity: 0 }}
            className={cn(
              "col-start-1 row-start-1 text-[34px] sm:text-[58px]",
              BIG,
            )}
          >
            {t("line2")}
          </p>
        </div>
        <div className="mt-[78px] flex items-end justify-center gap-[30px] sm:mt-[104px] sm:gap-[72px]">
          {row.map((p, i) => (
            <Person
              key={p.id}
              player={p}
              you={p.id === view.youId}
              seed={i}
              chip={next.indexOf(p)}
              label={p.id === view.youId ? tc("you") : name(p)}
              question={t("question")}
            />
          ))}
        </div>
      </div>
      <output aria-live="polite" className="sr-only">
        {line2 ? t("line2") : line1 ? t("line1") : ""}
      </output>
    </div>
  );
}

/** Fixed colours, the same in both themes, as on the prototype's blue stage. */
const QUESTION_INK = "#2B69C8";

/**
 * One player of the cold open: their card held up (yours a "?", the others an
 * illustrative figure: nobody has a character yet), the stick, the avatar
 * and the name. The question bubble sits over yours, an answer chip over the
 * first two players after you.
 */
function Person({
  player,
  you,
  seed,
  chip,
  label,
  question,
}: {
  player: PlayerView;
  you: boolean;
  seed: number;
  /** 0: "Yes", 1: "Probably yes", -1: none. */
  chip: number;
  label: string;
  question: string;
}) {
  const ta = useTranslations("common.answers");
  const held = SEATS[seed % SEATS.length];
  return (
    <div
      data-person
      style={{ opacity: 0, transform: "translateY(60px)" }}
      className="relative flex flex-col items-center gap-1.5 sm:gap-2.5"
    >
      {you ? (
        <span
          data-bubble
          aria-hidden
          style={{ opacity: 0, transform: "scale(0.4)" }}
          // clear of your card once it has grown 1.12 from its bottom
          className="absolute bottom-[calc(100%+21px)] left-1/2 origin-bottom-left -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-white px-3 py-2 font-bold text-[#1e2433] text-[15px] shadow-[0_12px_30px_rgba(0,0,0,.25)] sm:bottom-[calc(100%+31px)] sm:px-[18px] sm:py-3 sm:text-xl"
        >
          {question}
          <span className="absolute -bottom-1.5 left-1/2 -ml-[7px] size-3.5 rotate-45 rounded-[3px] bg-white sm:-bottom-2 sm:-ml-[9px] sm:size-[18px]" />
        </span>
      ) : null}
      {chip >= 0 ? (
        <span
          data-chip
          aria-hidden
          style={{ opacity: 0, transform: "translateY(10px) scale(0.4)" }}
          className={cn(
            "absolute bottom-[calc(100%+8px)] left-1/2 inline-flex h-8 -translate-x-1/2 items-center whitespace-nowrap rounded-pill border-[1.5px] border-yes px-3 font-bold text-[13px] sm:bottom-[calc(100%+12px)] sm:h-10 sm:px-4 sm:text-base",
            chip === 0 ? "bg-yes text-on-yes" : "bg-[#e7fbf8] text-[#0b7a75]",
          )}
        >
          {chip === 0 ? (
            ta("yes")
          ) : (
            <>
              <span className="sm:hidden">{ta("yes")}</span>
              <span className="max-sm:hidden">{ta("probably_yes")}</span>
            </>
          )}
        </span>
      ) : null}
      <div
        data-card={you ? "you" : "other"}
        style={{ transform: "scale(0.6) rotateY(90deg)" }}
        className="w-[62px] origin-bottom rounded-[12px] bg-surface p-1 shadow-card sm:w-[104px] sm:rounded-[18px] sm:p-1.5"
      >
        {you ? (
          <span
            className="flex aspect-4/5 items-center justify-center rounded-[9px] bg-brand-butter font-display font-extrabold text-[44px] leading-none sm:rounded-[13px] sm:text-[72px]"
            style={{ color: QUESTION_INK }}
          >
            ?
          </span>
        ) : (
          <FigureArt
            figure={held.figure}
            className="aspect-4/5 rounded-[9px] sm:rounded-[13px]"
          />
        )}
      </div>
      <span className="-mt-1.5 h-2.5 w-[3px] rounded-[3px] bg-white/50 sm:h-4" />
      <Avatar
        avatar={player.avatar}
        size={44}
        className="size-[46px] sm:size-16 sm:text-[26px]"
      />
      {/* as wide as the column plus the gap, without widening the column */}
      <span className="-mx-[15px] max-w-[92px] truncate text-center font-bold text-[13px] sm:-mx-9 sm:max-w-[176px] sm:text-base">
        {label}
      </span>
    </div>
  );
}

/** Later matches: "Round N", in and out (1.5 s). */
function RoundCard({ beat, n }: { beat: Beat; n: number }) {
  const t = useTranslations("room");
  const len = beatSeconds(beat);
  const outAt = Math.max(len - 0.45, 0.9);
  const shown = useAfter(beat.startsAt + 150);
  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: beat.startsAt,
    deps: [len, n],
    build: (scope, { reduced }) => {
      const tl = new Timeline(reduced);
      const line = marked(scope, "round");
      tl.to(line, { y: [30, 0], opacity: [0, 1] }, 0.15, 0.6, gs.p3Out);
      tl.to(line, { y: -24, opacity: 0 }, outAt, 0.35, gs.p2In);
      return tl.seq;
    },
  });
  return (
    <div
      ref={ref}
      className={cn(
        SCENE_MIN_H,
        "flex items-center justify-center px-1.5 pb-10 text-center text-on-brand",
      )}
    >
      <p
        data-round
        aria-hidden
        style={{ opacity: 0 }}
        className={cn("text-[34px] sm:text-[58px]", BIG)}
      >
        {t("round", { n })}
      </p>
      <output aria-live="polite" className="sr-only">
        {shown ? t("round", { n }) : ""}
      </output>
    </div>
  );
}
