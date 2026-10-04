"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { MiniCard } from "@/components/ui/mini-card";
import { themeId } from "@/game/theme-id";
import type { Lang, Theme } from "@/game/types";
import { gs } from "@/lib/motion";
import { fetchHand, type HandCard, handKey } from "./draft-api";

/**
 * The theme's hand (up to 8: the most picked and liked, then its starters),
 * asked for when the draw starts so it is there when the table lands. A typed
 * theme has none.
 */
export function usePickHand(theme: Theme | null, lang: Lang) {
  const id = theme && theme.set !== null ? themeId(theme) : "";
  return useQuery({
    queryKey: handKey(id, lang),
    queryFn: () => fetchHand(id, lang),
    enabled: id !== "",
    staleTime: 60_000,
  });
}

/**
 * The hand peeking from the bottom edge, fanned out: a tap puts that
 * character on the card. Fixed to the bottom of the window (lifted over the
 * phone's chat bar by `--dock`); it drops away once the card is confirmed or
 * the time is up. The entrance (cards rising, the label) is the screen's
 * timeline, on `data-t="hand"` and `data-t="label"`, from these from-styles.
 */
export function PickHand({
  cards,
  theme,
  phone,
  open,
  timeUp,
  onPick,
}: {
  /** The cards to show (already drawn for this viewer). */
  cards: HandCard[];
  /** The theme's name, for the label. */
  theme: string;
  phone: boolean;
  /** The card can still change; otherwise the hand leaves. */
  open: boolean;
  /** Out of time: it leaves a little quicker. */
  timeUp: boolean;
  onPick: (card: HandCard) => void;
}) {
  const t = useTranslations("pickCard");
  if (!cards.length) return null;
  const width = phone ? 70 : 92;
  const mid = (cards.length - 1) / 2;

  return (
    <motion.div
      initial={false}
      animate={open ? { y: 0, opacity: 1 } : { y: 200, opacity: 0 }}
      transition={
        timeUp
          ? { duration: 0.4, delay: 0.1, ease: gs.p1Out }
          : { duration: 0.5, delay: 0.1, ease: gs.p2In }
      }
      className="pointer-events-none fixed inset-x-0 bottom-[calc(-60px+var(--dock))] z-[1] flex flex-col items-center gap-2 sm:bottom-[-70px]"
    >
      <span
        data-t="label"
        style={{ opacity: 0 }}
        className="flex max-w-[calc(100vw-32px)] items-center gap-1.5 font-bold text-[13px] text-ink-muted"
      >
        <Heart
          aria-hidden
          className="size-3.5 shrink-0 fill-current text-no"
          strokeWidth={0}
        />
        <span className="truncate">{t("handLabel", { theme })}</span>
      </span>
      <div className="flex items-start justify-center">
        {cards.map((card, i) => {
          const k = i - mid;
          const likes =
            card.likes > 0 ? t("handLikes", { count: card.likes }) : null;
          return (
            <button
              key={card.id}
              type="button"
              disabled={!open}
              aria-label={likes ? `${card.name}, ${likes}` : card.name}
              onClick={() => onPick(card)}
              style={{
                transform: `rotate(${k * 6}deg) translateY(${Math.abs(k) * 8}px)`,
              }}
              className="-mx-[9px] sm:-mx-1.5 pointer-events-auto rounded-md transition-[translate] duration-200 ease-soft hover:-translate-y-2 focus-visible:-translate-y-2"
            >
              <div
                data-t="hand"
                style={{ opacity: 0, transform: "translateY(160px)" }}
              >
                <MiniCard
                  image={card.imageUrl}
                  name={card.name}
                  width={width}
                  className="text-left"
                  sub={
                    likes ? (
                      <>
                        <Heart
                          aria-hidden
                          className="size-[11px] fill-current text-no"
                          strokeWidth={0}
                        />
                        {card.likes}
                      </>
                    ) : undefined
                  }
                />
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
