"use client";

import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { fireConfetti } from "@/components/ui/confetti";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import { thumbUrl } from "@/game/character-search";
import { themeSetEmoji } from "@/game/theme-sets";
import {
  type Beat,
  type Lang,
  type PlayerView,
  SHOW_MARKS,
  type ShowView,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { useClock } from "@/lib/hooks/use-server-clock";
import { gs } from "@/lib/motion";
import {
  beatSeconds,
  marked,
  SCENE_MIN_H,
  Timeline,
  useFireAt,
} from "./scene-kit";
import { beatOf, markAt } from "./stage";
import { useStage } from "./stage-context";
import { RULE_CARD, RuleScene } from "./theme-rule";
import { useStageTimeline } from "./use-stage-timeline";

export interface ThemeStageProps {
  /** The theme show (its theme or rule beat is running). */
  show: ShowView;
  /** How the theme was chosen: by the vote (the winner card flies in) or typed by the host. */
  from: "vote" | "typed";
}

/** One colour per vote option, so a theme keeps its colour from the vote to the hero. */
export const TONES = [
  {
    card: "bg-butter text-on-butter",
    bar: "bg-on-butter/25",
    fill: "bg-on-butter",
  },
  { card: "bg-sky-soft text-ink", bar: "bg-sky/30", fill: "bg-sky" },
  {
    card: "bg-apricot-soft text-ink",
    bar: "bg-apricot/30",
    fill: "bg-apricot",
  },
] as const;

/** The vote's winner card and the hero share this, so the winner flies to the centre. */
export const THEME_CARD = "theme-card";
/** The flight: 0.9 s, overshooting a little (the prototype's back.out(1.2)). */
const FLIGHT = { layout: { duration: 0.9, ease: gs.backOut(1.2) } } as const;

/**
 * The theme show's scene over the vote or theming screen: the chosen theme as
 * a big card in the middle (the vote's winner flies there; a typed theme
 * pops), confetti, then the card goes up towards the header's tag. On the
 * room's first match the rule follows, with its cards or as a sentence.
 */
export function ThemeStage({ show, from }: ThemeStageProps) {
  const tv = useTranslations("room.vote");
  const tr = useTranslations("stageOpening.rule");
  const lang = useLocale() as Lang;
  const { view } = useRoomContext();
  const { beat } = useStage();
  const theme = beatOf(show, "theme");
  const rule = beatOf(show, "rule");
  usePreloadRule(show);
  const name = view.theme?.[lang] ?? "";
  return (
    <div
      className={cn(
        SCENE_MIN_H,
        "relative flex flex-col items-center justify-center",
      )}
    >
      {/* the hero lands with layoutId (from the vote's winning card) */}
      {theme ? (
        <LayoutMotion>
          <Hero beat={theme} from={from} />
        </LayoutMotion>
      ) : null}
      {rule ? <RuleScene beat={rule} rule={show.rule} /> : null}
      <output aria-live="polite" className="sr-only">
        {beat?.kind === "rule"
          ? tr("title")
          : name
            ? tv("announce", { theme: name })
            : ""}
      </output>
    </div>
  );
}

function Hero({ beat, from }: { beat: Beat; from: "vote" | "typed" }) {
  const tv = useTranslations("room.vote");
  const tt = useTranslations("room.theming");
  const lang = useLocale() as Lang;
  const withNames = useWithNames();
  const { view, playerById } = useRoomContext();
  const clock = useClock();
  const v = view.vote;
  const chosen = from === "vote" ? (v?.chosen ?? null) : null;
  const theme = view.theme ?? (v && chosen !== null ? v.options[chosen] : null);
  const name = theme?.[lang] ?? "";
  const tone = TONES[(chosen ?? 0) % TONES.length];
  const emoji = theme?.set ? themeSetEmoji(theme.set) : "✍️";
  const voters =
    v && chosen !== null
      ? v.votes
          .filter((x) => x.option === chosen)
          .map((x) => playerById(x.byId))
          .filter((p): p is PlayerView => !!p)
      : [];
  const host = view.players.find((p) => p.isHost);
  // the winner flies in (shared layout) only when the scene starts live on the vote screen
  const [flew] = useState(
    () => from === "vote" && clock.now() - beat.startsAt < 300,
  );
  const len = beatSeconds(beat);
  // up towards the header's tag: at +2.2 s, or 0.4 s before a shorter beat ends
  const outAt = Math.max(Math.min(2.2, len - 0.4), 1);
  useFireAt(markAt(beat, SHOW_MARKS.themeWash), () => fireConfetti());

  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: beat.startsAt,
    deps: [len, flew, lang],
    build: (scope, { reduced, phone }) => {
      const tl = new Timeline(reduced);
      tl.to(
        marked(scope, "kicker"),
        { opacity: [0, 1], y: [10, 0] },
        0,
        0.4,
        gs.p1Out,
      );
      if (!flew)
        tl.to(
          marked(scope, "card"),
          { opacity: [0.6, 1], scale: [0.55, 1] },
          0.05,
          0.9,
          gs.backOut(1.2),
        );
      tl.to(
        marked(scope, "hero"),
        { scale: [1, 0.6], y: [0, phone ? -260 : -290], opacity: [1, 0] },
        outAt,
        0.55,
        gs.p3In,
      );
      return tl.seq;
    },
  });

  const size =
    name.length > 24
      ? "text-[36px] sm:text-[60px]"
      : name.length > 14
        ? "text-[42px] sm:text-[72px]"
        : "text-[50px] sm:text-[84px]";

  return (
    <div ref={ref} className="flex w-full justify-center">
      <div
        data-hero
        className="flex w-full flex-col items-center gap-[18px] pb-10"
      >
        <h1
          data-kicker
          style={{ opacity: 0 }}
          className="inline-flex items-center rounded-pill bg-sunken px-3 py-1 font-semibold text-ink-muted text-xs uppercase tracking-[0.08em]"
        >
          {tv("chosenTitle")}
        </h1>
        <m.div
          layoutId={THEME_CARD}
          transition={FLIGHT}
          className="w-[330px] max-w-full sm:w-[620px]"
        >
          <div
            data-card
            style={
              flew ? undefined : { opacity: 0.6, transform: "scale(0.55)" }
            }
            className={cn(
              "flex min-h-[190px] flex-col rounded-[36px] p-5 shadow-pop sm:min-h-[290px] sm:p-[30px]",
              tone.card,
            )}
          >
            <span className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-[0.08em]">
              <span aria-hidden className="text-lg leading-none">
                {emoji}
              </span>
              <span className="opacity-75">{tv("chosen")}</span>
            </span>
            <span
              className={cn(
                "my-2.5 flex flex-1 items-center justify-center text-balance break-words text-center font-display font-extrabold tracking-[-0.02em]",
                size,
                "leading-[1.06]",
              )}
            >
              {name}
            </span>
            {from === "typed" || chosen === null ? (
              host ? (
                <span className="block min-h-8 text-balance text-center font-semibold text-sm leading-8">
                  {withNames((n) =>
                    tt("chosenBy", { name: n(host, host.isYou) }),
                  )}
                </span>
              ) : null
            ) : (
              <span className="flex min-h-8 items-center justify-between gap-3 font-semibold text-sm">
                <span className="-space-x-2 flex">
                  {voters.map((p) => (
                    <Avatar
                      key={p.id}
                      avatar={p.avatar}
                      isGuest={p.isGuest}
                      name={p.name}
                      size={30}
                      className="ring-2 ring-surface/80"
                    />
                  ))}
                </span>
                <span className="tabular-nums">
                  {tv("votes", { count: voters.length })}
                </span>
              </span>
            )}
          </div>
        </m.div>
      </div>
    </div>
  );
}

/**
 * Fetches the rule cards' pictures as soon as a theme show with cards is in
 * the view, so they are in the cache when the rule beat comes.
 */
export function usePreloadRule(show: ShowView | null) {
  const urls = show?.rule
    ? [...show.rule.fits, ...(show.rule.misfit ? [show.rule.misfit] : [])]
        .map((c) => c.imageUrl)
        .join("\n")
    : "";
  useEffect(() => {
    if (!urls) return;
    for (const url of urls.split("\n"))
      for (const w of [RULE_CARD.desktop, RULE_CARD.phone]) {
        const src = thumbUrl(url, w * 2);
        if (src) new Image().src = src;
      }
  }, [urls]);
}
