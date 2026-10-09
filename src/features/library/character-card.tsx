"use client";

import { ImageIcon, Upload } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { characterPath } from "@/lib/routes";
import type { LibraryCard } from "@/server/community-contract";
import { TasteTag } from "./taste";

/**
 * A character on the list: its picture (a little stack behind it when it has
 * more than one, fanning out on hover), its taste, how to help when it has no
 * picture, its name and work, and who made it. Opens its sheet over the
 * list.
 */
export function CharacterCard({
  card,
  index,
  fresh = false,
}: {
  card: LibraryCard;
  /** Its place among the cards that arrived together, for the stagger. */
  index: number;
  /** Just made here: a ring for a moment. */
  fresh?: boolean;
}) {
  const t = useTranslations("library.card");
  const withNames = useWithNames();
  const many = card.pictures > 1;
  const by = card.by;
  return (
    <m.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.42,
        ease: ease.soft,
        delay: Math.min(index, 12) * 0.026,
      }}
      className="[contain-intrinsic-block-size:auto_280px] [content-visibility:auto]"
    >
      <Link
        href={characterPath(card.id)}
        scroll={false}
        className="group/card grid gap-2.5 rounded-[22px] text-left outline-offset-4"
      >
        <span className="relative isolate block">
          {many ? (
            <>
              <span
                aria-hidden="true"
                className="-z-10 absolute inset-[8px_10px_4px] rounded-[20px] border border-line bg-sky-soft transition-transform duration-[420ms] ease-soft group-hover/card:-translate-x-2.5 group-hover/card:-translate-y-1 group-hover/card:-rotate-[7deg]"
              />
              <span
                aria-hidden="true"
                className="-z-10 absolute inset-[8px_10px_4px] rounded-[20px] border border-line bg-surface transition-transform duration-[420ms] ease-soft group-hover/card:translate-x-2.5 group-hover/card:-translate-y-1.5 group-hover/card:rotate-[6deg]"
              />
            </>
          ) : null}
          <span
            className={cn(
              "block overflow-hidden rounded-[22px] shadow-card transition-[translate,rotate,box-shadow] duration-[360ms] ease-soft group-hover/card:-translate-y-[5px] group-hover/card:-rotate-[0.6deg]",
              fresh && "shadow-[0_0_0_3px_var(--sky),var(--shadow-card)]",
            )}
          >
            <Portrait src={card.imageUrl} className="rounded-none" />
          </span>
          {card.taste ? (
            <TasteTag
              taste={card.taste}
              className={cn(
                "absolute top-2 left-2 z-[1]",
                many ? "max-w-[calc(100%-64px)]" : "max-w-[calc(100%-16px)]",
              )}
            />
          ) : null}
          {many ? (
            <span
              role="img"
              aria-label={t("pictures", { n: card.pictures })}
              className="absolute top-2 right-2 z-[1] inline-flex h-6 items-center gap-1 rounded-pill bg-surface/90 px-2 font-medium font-mono text-[11.5px] text-ink"
            >
              <ImageIcon className="size-3.5" strokeWidth={2} />
              {card.pictures}
            </span>
          ) : null}
          {card.imageUrl ? null : (
            <span className="absolute inset-x-2 bottom-2 z-[1] flex h-8 items-center justify-center gap-1.5 rounded-pill bg-surface/90 font-bold text-[12.5px] text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-colors duration-200 group-hover/card:bg-ink group-hover/card:text-on-ink">
              <Upload className="size-3.5" strokeWidth={2} />
              {t("send")}
            </span>
          )}
        </span>
        <span className="grid min-w-0 gap-px px-1">
          <b className="font-bold font-display text-[16.5px] leading-tight tracking-[-0.005em] [overflow-wrap:anywhere]">
            {card.name}
          </b>
          {card.origin ? (
            <small className="truncate text-[13px] text-ink-muted">
              {card.origin}
            </small>
          ) : null}
          {by ? (
            <span className="truncate font-semibold text-[12px] text-ink-muted">
              {withNames((n) => t("by", { name: n(by) }))}
            </span>
          ) : null}
        </span>
      </Link>
    </m.div>
  );
}
