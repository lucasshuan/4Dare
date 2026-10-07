"use client";

import { Check } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useSceneShow, useStepStarted } from "@/features/room/match-frame";
import { ColdOpen } from "@/features/stage/cold-open";
import {
  BIG,
  beatSeconds,
  marked,
  rouletteSteps,
  SCENE_MIN_H,
  showOf,
  Timeline,
} from "@/features/stage/scene-kit";
import { beatOf, markOf } from "@/features/stage/stage";
import { useStage } from "@/features/stage/stage-context";
import {
  ThemeStage,
  TONES,
  themeCardId,
  usePreloadRule,
} from "@/features/stage/theme-stage";
import {
  layoutRect,
  PHONE,
  useStageTimeline,
} from "@/features/stage/use-stage-timeline";
import { type ThemeSet, themeSetEmoji } from "@/game/theme-sets";
import {
  type Lang,
  type PlayerView,
  SHOW_MARKS,
  type VoteView,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { dur, ease, gs } from "@/lib/motion";
import { voteTheme } from "@/server/actions";

/** Cards are dealt like a hand: each starts tilted its own way (on desktop, the left column one way and the right the other). */
const TILT = [-7, 5, -5, 7];
const spring = { type: "spring", stiffness: 320, damping: 32 } as const;
const OPENING_BEATS = ["curtain", "intro", "round"] as const;
const RESULT_BEATS = ["tie_spin", "settle"] as const;
const THEME_BEATS = ["theme", "rule"] as const;

/** The show that plays the vote's result: the theme show, or the Impostor's deal. */
const resultShow = (view: { settings: { game: string } }) =>
  view.settings.game === "impostor" ? "deal" : "theme";

/** A card lit by the roulette or left as the winner, and one dimmed beside it. */
const LIT = { opacity: 1, scale: 1.04, filter: "saturate(1)" };
const DIM = { opacity: 0.35, scale: 0.95, filter: "saturate(0.4)" };
const PLAIN = { opacity: 1, scale: 1, filter: "saturate(1)" };
type Look = typeof PLAIN;
const from = (a: Look, b: Look) => ({
  opacity: [a.opacity, b.opacity],
  scale: [a.scale, b.scale],
  filter: [a.filter, b.filter],
});

/**
 * The theme vote, inside the opening and theme shows: the cold open (or
 * "Round N") first; then the line comes in alone, rises into the heading and
 * the cards are dealt (they take votes from the clock's start); when the vote
 * closes, the tie roulette, the losers dim and leave, and the winner flies to
 * the middle as the theme hero.
 */
export function VoteScreen() {
  const { view } = useRoomContext();
  // the Impostor's deal show plays the result out like the theme show
  const kind = resultShow(view);
  const opening = useSceneShow("opening", OPENING_BEATS);
  const result = useSceneShow(kind, RESULT_BEATS);
  const theme = useSceneShow(kind, THEME_BEATS);
  // once the vote has its theme, the cards stay only for the roulette and the
  // winner settling: after the rule the screen fades out to the pick, and cards
  // mounted again there would fly the winner back from the hero
  const vote = view.vote?.chosen === null || result ? view.vote : null;
  usePreloadRule(showOf(view, kind));
  // layoutId: voters land on cards, the winner flies to the theme stage; the
  // layout features start loading during the cold open
  return (
    <LayoutMotion>
      {opening ? (
        <ColdOpen show={opening} />
      ) : theme ? (
        <ThemeStage show={theme} from="vote" />
      ) : vote ? (
        <Vote v={vote} />
      ) : null}
    </LayoutMotion>
  );
}

function Vote({ v }: { v: VoteView }) {
  const t = useTranslations("room.vote");
  const ts = useTranslations("stageOpening.vote");
  const lang = useLocale() as Lang;
  const { view, code, playerById } = useRoomContext();
  const { beat } = useStage();
  const started = useStepStarted();
  const phone = useMedia(PHONE);
  const { act } = useRoomAction();
  // The click shows at once; the server's answer replaces it.
  // the vote as the player just made it (null: taken back), until the server answers
  const [optimistic, setOptimistic] = useState<{ vote: number | null } | null>(
    null,
  );
  const entrance = beatOf(showOf(view, "opening"), "entrance");
  const show = showOf(view, resultShow(view));
  // the vote has its theme (its show may still wait behind the opening): clicks do nothing
  const result = v.chosen !== null && show !== null;
  const spinning = beat?.kind === "tie_spin";
  const chosen = v.chosen;
  const tied = v.tied.join(" ");
  // the match this vote is for: the room counts it once the vote has its theme
  const match = chosen === null ? view.round + 1 : view.round;
  const k = phone ? 0.84 : 0.7;

  // the heading keeps the room of the shrunken line, so the cards sit right under it;
  // measured on an invisible copy of the line, so the tie title (one line) never sets it
  const title = useRef<HTMLHeadingElement>(null);
  const titleCopy = useRef<HTMLSpanElement>(null);
  const [titleH, setTitleH] = useState(0);
  useLayoutEffect(() => {
    const el = titleCopy.current;
    if (!el) return;
    const measure = () => setTitleH(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // the line alone in the middle, rising into the heading; the deal; the sub and the footer
  const enter = useStageTimeline<HTMLDivElement>({
    startsAt: entrance?.startsAt ?? 0,
    deps: [k, lang, v.options.length],
    build: (scope, { reduced }) => {
      const tl = new Timeline(reduced);
      const line = title.current;
      if (line && reduced)
        tl.to(line, { y: [0, 0], scale: [k, k], opacity: [0, 1] }, 0.2, 0.2);
      else if (line) {
        const r = layoutRect(line, scope);
        const centre = scope.offsetHeight / 2 - (r.y + r.height / 2);
        tl.to(
          line,
          { y: [centre + 30, centre], opacity: [0, 1], scale: [1, 1] },
          0.2,
          0.6,
          gs.p3Out,
        );
        tl.to(line, { y: 0, scale: k }, 1, 0.7, gs.p3InOut);
      }
      tl.to(
        marked(scope, "deal"),
        (i) => ({ y: [90, 0], opacity: [0, 1], rotate: [TILT[i] ?? 0, 0] }),
        (i) => (reduced ? 1.3 : 1.3 + i * 0.09),
        0.7,
        gs.backOut(1.3),
      );
      tl.to(
        marked(scope, "sub"),
        { opacity: [0, 1], y: [8, 0] },
        1.5,
        0.4,
        gs.p1Out,
      );
      tl.to(marked(scope, "foot"), { opacity: [0, 1] }, 1.9, 0.4, gs.p1Out);
      return tl.seq;
    },
  });

  // the theme show on this screen: the roulette on a tie, then the settle
  const after = useStageTimeline<HTMLDivElement>({
    startsAt: show && chosen !== null ? show.startsAt : null,
    deps: [show?.startsAt, show?.first, chosen, tied],
    build: (scope, { reduced }) => {
      const tl = new Timeline(reduced);
      if (!show || chosen === null) return tl.seq;
      const boxes = marked(scope, "settle");
      const glows = marked(scope, "glow");
      const looks: Look[] = boxes.map(() => PLAIN);
      const go = (i: number, look: Look, at: number, d: number) => {
        tl.to(boxes[i], from(looks[i], look), at, d, gs.p1Out, "fade");
        looks[i] = look;
      };
      const spin = beatOf(show, "tie_spin");
      if (spin && v.tied.length > 1) {
        if (reduced)
          for (const i of boxes.keys()) go(i, i === chosen ? LIT : DIM, 0, 0.2);
        else {
          const steps = rouletteSteps(
            v.tied,
            chosen,
            spin.until - spin.startsAt,
          );
          for (const i of boxes.keys()) {
            const changes = steps
              .map((s) => ({ at: s.at / 1000, lit: s.lit === i }))
              .filter((c, n, all) => n === 0 || c.lit !== all[n - 1].lit);
            changes.forEach((c, n) => {
              const d = Math.min(0.14, (changes[n + 1]?.at ?? c.at + 1) - c.at);
              go(i, c.lit ? LIT : DIM, c.at, d);
              tl.to(
                glows[i],
                { opacity: n === 0 ? [0, c.lit ? 1 : 0] : c.lit ? 1 : 0 },
                c.at,
                d,
                gs.p1Out,
                "skip",
              );
            });
          }
        }
      }
      const settle = beatOf(show, "settle");
      if (settle) {
        const off = (settle.startsAt - show.startsAt) / 1000;
        const len = beatSeconds(settle);
        const mark = (m: { first: number; later: number }) =>
          off + Math.min(markOf(m, show.first) / 1000, len);
        const dimAt = mark(SHOW_MARKS.settleDim);
        const leaveAt = mark(SHOW_MARKS.settleLeave);
        for (const i of boxes.keys())
          go(i, i === chosen ? LIT : DIM, dimAt, 0.4);
        let n = 0;
        boxes.forEach((box, i) => {
          if (i === chosen) return;
          tl.to(
            box,
            { opacity: 0, y: [0, 30] },
            leaveAt + 0.05 * n++,
            0.35,
            gs.p1Out,
          );
        });
        tl.to(
          [...marked(scope, "headbox"), ...marked(scope, "footbox")],
          { opacity: [1, 0] },
          leaveAt,
          0.3,
          gs.p1Out,
        );
      }
      return tl.seq;
    },
  });

  const mine = optimistic ? optimistic.vote : v.yourVote;
  const voterIds = new Set(v.votes.map((x) => x.byId));
  const waiting = view.players.filter((p) => !voterIds.has(p.id));
  // a tap on the theme already chosen takes the vote back
  const choose = async (i: number) => {
    if (result || !started) return;
    const next = i === mine ? null : i;
    setOptimistic({ vote: next });
    await act(() => voteTheme(code, next));
    setOptimistic(null);
  };

  return (
    <div ref={enter} className={cn(SCENE_MIN_H, "flex flex-col")}>
      <div
        ref={after}
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col pb-2 sm:pb-6"
      >
        <div
          data-headbox
          className="flex flex-col items-center px-5 pt-2 text-center sm:pt-16 sm:short:pt-6"
        >
          <div
            className="relative flex w-full justify-center"
            style={titleH ? { height: titleH * k } : undefined}
          >
            <span
              ref={titleCopy}
              aria-hidden
              className={cn(
                "pointer-events-none invisible absolute inset-x-0 mx-auto block h-fit max-w-[340px] text-[34px] sm:max-w-[720px] sm:text-[58px]",
                BIG,
              )}
            >
              {ts("line")}
            </span>
            <h1
              ref={title}
              id="vote-title"
              style={{ opacity: 0 }}
              className={cn(
                "h-fit max-w-[340px] origin-top text-[34px] sm:max-w-[720px] sm:text-[58px]",
                BIG,
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={spinning ? "tie" : "line"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: dur.base } }}
                  exit={{ opacity: 0, transition: { duration: dur.fast } }}
                  className="block"
                >
                  {spinning ? t("tieTitle") : ts("line")}
                </m.span>
              </AnimatePresence>
            </h1>
          </div>
          <p
            data-sub
            style={{ opacity: 0 }}
            className="mt-2 grid max-w-[340px] text-balance text-[15px] text-ink-muted sm:max-w-[560px] sm:text-[17px]"
          >
            {/* both lines in one cell: the taller one keeps the room, so the cards never move */}
            <span
              className={cn("col-start-1 row-start-1", spinning && "invisible")}
            >
              {t("subtitle")}
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1",
                !spinning && "invisible",
              )}
            >
              {t("tie")}
            </span>
          </p>
        </div>

        <fieldset
          aria-label={t("title")}
          className="mt-[22px] flex min-w-0 flex-col gap-2 sm:mx-auto sm:mt-9 sm:grid sm:w-full sm:max-w-[920px] sm:grid-cols-2 sm:gap-4"
        >
          {v.options.map((option, i) => (
            <m.div
              // biome-ignore lint/suspicious/noArrayIndexKey: the options never move
              key={i}
              layoutId={themeCardId(code, match, i)}
              className="flex min-w-0 flex-1"
            >
              <div
                data-deal
                style={{
                  opacity: 0,
                  transform: `translateY(90px) rotate(${TILT[i] ?? 0}deg)`,
                }}
                className="flex min-w-0 flex-1"
              >
                <div data-settle className="flex min-w-0 flex-1">
                  <OptionCard
                    index={i}
                    label={t("option", { n: i + 1 })}
                    set={option.set}
                    theme={option[lang]}
                    voters={v.votes
                      .filter((x) => x.option === i)
                      .map((x) => playerById(x.byId))
                      .filter((p): p is PlayerView => !!p)}
                    total={v.total}
                    mine={mine === i}
                    open={!result}
                    disabled={!started}
                    onChoose={() => choose(i)}
                  />
                </div>
              </div>
            </m.div>
          ))}
        </fieldset>

        <div data-footbox className="mt-auto pt-6">
          <div data-foot style={{ opacity: 0 }}>
            <Footer
              voted={v.votes.length}
              total={v.total}
              waiting={waiting}
              hasVote={mine !== null && !result}
            />
          </div>
        </div>
        <output aria-live="polite" className="sr-only">
          {spinning ? t("tie") : ""}
        </output>
      </div>
    </div>
  );
}

function OptionCard({
  index,
  label,
  set,
  theme,
  voters,
  total,
  mine,
  open,
  disabled,
  onChoose,
}: {
  index: number;
  label: string;
  set: ThemeSet | null;
  theme: string;
  voters: PlayerView[];
  total: number;
  mine: boolean;
  /** Still taking votes (false once the vote has its theme). */
  open: boolean;
  /** Before the clock starts: not clickable yet. */
  disabled: boolean;
  onChoose: () => void;
}) {
  const t = useTranslations("room.vote");
  const tSets = useTranslations("common.themeSets");
  const tone = TONES[index % TONES.length];
  const emoji = themeSetEmoji(set);
  const live = open && !disabled;
  const share = total ? voters.length / total : 0;
  return (
    <m.button
      type="button"
      aria-pressed={mine}
      aria-disabled={!open || undefined}
      disabled={disabled}
      onClick={onChoose}
      animate={{ y: mine && open ? -6 : 0 }}
      transition={{ y: { duration: 0.3, ease: gs.backOut(2) } }}
      whileHover={live ? { y: -8, rotate: index % 2 ? 0.8 : -0.8 } : undefined}
      whileTap={live ? { scale: 0.97 } : undefined}
      className={cn(
        "group relative flex min-h-[104px] min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] px-4 py-3 text-left outline-offset-4 sm:min-h-[200px] sm:rounded-xl sm:p-6 sm:short:min-h-40",
        tone.card,
        open ? "shadow-card" : "cursor-default",
        disabled && "cursor-default",
        mine && "shadow-[0_0_0_3px_var(--canvas),0_0_0_6px_var(--ink)]",
      )}
    >
      {/* the light sweeping across the card the roulette is on */}
      <span
        data-glow
        aria-hidden
        style={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)] dark:bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]"
      />

      <span className="relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-xs uppercase tracking-[0.08em]">
          {emoji ? (
            <span aria-hidden className="text-base leading-none">
              {emoji}
            </span>
          ) : null}
          <span className="truncate opacity-70">
            {set ? tSets(set) : label}
          </span>
        </span>
        <AnimatePresence>
          {mine ? (
            <m.span
              key="mine"
              initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={spring}
              className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-ink py-1 pr-2.5 pl-1.5 font-semibold text-on-ink text-xs"
            >
              <Check className="size-4" strokeWidth={2.75} />
              <span>{t("yourVote")}</span>
            </m.span>
          ) : null}
        </AnimatePresence>
      </span>

      <span
        className={cn(
          "relative my-1 flex flex-1 items-center text-balance font-display font-extrabold tracking-[-0.02em] sm:my-2.5",
          theme.length > 18
            ? "text-[24px] leading-[1.1] sm:text-[clamp(24px,2.4vw,32px)]"
            : "text-[27px] leading-[1.06] sm:text-[clamp(30px,3vw,38px)]",
        )}
      >
        {theme}
      </span>

      <span className="relative flex min-h-8 items-center justify-between gap-3">
        <span className="-space-x-2 flex">
          <AnimatePresence initial={false}>
            {voters.map((p) => (
              <m.span
                key={p.id}
                layoutId={`voter-${p.id}`}
                initial={{ opacity: 0, scale: 0.3, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.45, ease: gs.backOut(2.2) }}
                className="rounded-pill"
              >
                <Avatar avatar={p.avatar} size={32} seat={p.colorSlot} />
              </m.span>
            ))}
          </AnimatePresence>
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={voters.length}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: dur.base, ease: ease.soft }}
            className="font-semibold text-sm tabular-nums"
          >
            {t("votes", { count: voters.length })}
          </m.span>
        </AnimatePresence>
      </span>

      {/* share of the room behind this theme */}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 bottom-0 h-1.5 opacity-40", tone.bar)}
      />
      <m.span
        aria-hidden
        initial={false}
        animate={{ scaleX: share }}
        transition={{ duration: 0.5, ease: gs.backOut(1.4) }}
        className={cn(
          "absolute bottom-0 left-0 h-1.5 w-full origin-left",
          tone.fill,
        )}
      />
    </m.button>
  );
}

function Footer({
  voted,
  total,
  waiting,
  hasVote,
}: {
  voted: number;
  total: number;
  waiting: PlayerView[];
  hasVote: boolean;
}) {
  const t = useTranslations("room.vote");
  const ts = useTranslations("stageOpening.vote");
  const withNames = useWithNames();
  return (
    <div className="flex min-h-12 flex-col items-center gap-1 text-center">
      <span className="flex items-center gap-2.5">
        <span className="flex gap-[5px]" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <m.span
              // biome-ignore lint/suspicious/noArrayIndexKey: one dot per seat
              key={i}
              initial={false}
              animate={{
                scale: i < voted ? 1 : 0.7,
                opacity: i < voted ? 1 : 0.3,
              }}
              transition={{ duration: 0.3, ease: gs.backOut(3) }}
              className="size-2.5 rounded-full bg-ink"
            />
          ))}
        </span>
        <span className="font-semibold text-sm">
          {t("progress", { done: voted, total })}
        </span>
      </span>
      <span className="text-balance font-medium text-[13px] text-ink-muted">
        {voted === 0
          ? ts("waitingEveryone")
          : waiting.length
            ? withNames((n) =>
                t("waitingFor", {
                  names: waiting.map((p) => n(p, p.isYou)).join(", "),
                }),
              )
            : t("allVoted")}
        {hasVote && waiting.length ? ` · ${t("change")}` : ""}
      </span>
    </div>
  );
}
