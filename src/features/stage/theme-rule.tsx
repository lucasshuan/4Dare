"use client";

import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { MiniCard } from "@/components/ui/mini-card";
import type { Beat, ExampleCard, Lang, RuleExamples } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { gs } from "@/lib/motion";
import { BIG, beatSeconds, marked, Timeline } from "./scene-kit";
import { PHONE, useStageTimeline } from "./use-stage-timeline";

/** The rule cards' width (px), desktop and phone. */
export const RULE_CARD = { desktop: 112, phone: 84 } as const;

/** A card's name in this language; a missing Japanese name falls back to English. */
export const cardName = (card: ExampleCard, lang: Lang) =>
  card.names[lang] ?? card.names.en ?? card.names.pt ?? "";

/** Where each card comes up from and settles: [from rotate, to rotate, at]. */
const RISE = [
  [-14, -3, 0.7],
  [12, 2, 1.15],
  [10, 4, 1.7],
] as const;

/**
 * The rule, first match only: "Every character must be from this theme."
 * With examples, two ✓ cards come up into a dashed frame and a ✗ card comes
 * up, gets its badge and falls out; without (a typed theme, or a theme with
 * too few known characters), the sentence alone. Times from the rule beat's
 * start; the box leaves 0.4 s before the beat ends.
 */
export function RuleScene({
  beat,
  rule,
}: {
  beat: Beat;
  rule: RuleExamples | null;
}) {
  const t = useTranslations("stageOpening.rule");
  const lang = useLocale() as Lang;
  const phone = useMedia(PHONE);
  const width = phone ? RULE_CARD.phone : RULE_CARD.desktop;
  const len = beatSeconds(beat);
  const outAt = Math.max(len - 0.4, rule ? 3.6 : 1);
  const cards = rule
    ? [...rule.fits, ...(rule.misfit ? [rule.misfit] : [])]
    : [];

  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: beat.startsAt,
    deps: [len, lang, cards.map((c) => c.id).join(" ")],
    build: (scope, { reduced, phone }) => {
      const tl = new Timeline(reduced);
      tl.to(
        marked(scope, "sentence"),
        { opacity: [0, 1], y: [20, 0] },
        0,
        0.5,
        gs.p3Out,
      );
      tl.to(
        marked(scope, "frame"),
        { opacity: [0, 1], scale: [0.9, 1] },
        0.3,
        0.4,
        gs.p1Out,
      );
      marked(scope, "example").forEach((card, i) => {
        const [from, to, at] = RISE[i] ?? RISE[2];
        tl.to(
          card,
          { y: [240, 0], rotate: [from, to], opacity: [0, 1] },
          at,
          i === 2 ? 0.55 : 0.6,
          gs.backOut(i === 2 ? 1.4 : 1.6),
        );
        // still: the badge is already on as its card fades in
        tl.to(
          marked(card, "badge"),
          { scale: [0, 1] },
          reduced ? at : 1.4 + i * 0.45,
          0.35,
          gs.backOut(3),
        );
      });
      tl.to(
        marked(scope, "example", "misfit"),
        { x: [0, phone ? 40 : 90], y: 300, rotate: 50, opacity: 0 },
        2.8,
        0.8,
        gs.p2In,
      );
      tl.to(
        marked(scope, "rule"),
        { opacity: [1, 0], y: [0, -20] },
        outAt,
        0.4,
        gs.p1Out,
      );
      return tl.seq;
    },
  });

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div
        data-rule
        className="flex w-full flex-col items-center gap-[18px] px-1.5 pb-10 text-center sm:gap-[26px]"
      >
        <p
          data-sentence
          aria-hidden
          style={{ opacity: 0 }}
          className={cn(
            "max-w-[320px] text-[23px] sm:max-w-[620px] sm:text-[34px]",
            BIG,
          )}
        >
          {t("title")}
        </p>
        {cards.length ? (
          <div
            data-frame
            style={{
              opacity: 0,
              borderColor: "color-mix(in oklab, var(--no) 70%, transparent)",
            }}
            className="relative flex h-[150px] w-[330px] max-w-full items-center justify-center gap-2.5 rounded-[28px] border-[3px] border-dashed sm:h-[196px] sm:w-[520px] sm:gap-[18px]"
          >
            {cards.map((card, i) => {
              const fits = i < 2;
              return (
                <MiniCard
                  key={card.id}
                  data-example={fits ? "fits" : "misfit"}
                  style={{
                    opacity: 0,
                    transform: `translateY(240px) rotate(${RISE[i]?.[0] ?? 0}deg)`,
                  }}
                  image={card.imageUrl}
                  name={cardName(card, lang)}
                  width={width}
                  badge={
                    <span
                      data-badge
                      role="img"
                      aria-label={fits ? t("fits") : t("misfit")}
                      style={{ transform: "scale(0)" }}
                      className={cn(
                        "flex size-[30px] items-center justify-center rounded-full",
                        fits ? "bg-yes text-on-yes" : "bg-no text-on-no",
                      )}
                    >
                      {fits ? (
                        <Check className="size-[17px]" strokeWidth={3} />
                      ) : (
                        <X className="size-[17px]" strokeWidth={3} />
                      )}
                    </span>
                  }
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
