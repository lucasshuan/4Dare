"use client";

import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import type { CardContent } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { CardNameField } from "./card-name-field";
import { CardPicture } from "./card-picture";

export type { CardContent } from "@/game/character-search";

export type PickCardState = "editing" | "confirmed" | "timeUp";

/** Card scale once it is settled (confirmed or out of time), grown down from its top. */
export const CARD_SETTLED_SCALE = 1.08;

const sticker =
  "pointer-events-none absolute whitespace-nowrap font-display font-extrabold uppercase tracking-[0.02em]";

/**
 * The pick card, which is the form: the picture (ghost preview, flip, drop,
 * inline crop, swap tray), the name field with its list, the origin line and
 * the "New!" seal. Props-driven: the screen owns the content and saves it.
 * Width 224 on phones, 270 from `sm` (override with `className`).
 */
export function PickCard({
  value,
  onChange,
  lang,
  targetName,
  state,
  stamp,
  onNewImage,
  onLibraryImage,
  className,
  autoFocus,
  onFocusChange,
}: {
  value: CardContent;
  onChange: (next: CardContent) => void;
  lang: Lang;
  /** The target's display name, for the field's label "Character for {name}". */
  targetName: string;
  /** confirmed / timeUp: read-only, scale 1.08 from the top. */
  state: PickCardState;
  /** "Time! That's the one." slammed over the card. */
  stamp: boolean;
  /** Uploads a new character's picture; resolves to its URL, or null when it failed. */
  onNewImage: (file: Blob) => Promise<string | null>;
  /** Replaces a library character's picture (`replaceCharacterImage`). */
  onLibraryImage: (characterId: string, file: Blob) => Promise<void>;
  className?: string;
  /** Focus the name field on mount (desktop, when the pick starts). */
  autoFocus?: boolean;
  /** The name field gained or lost focus (the screen holds draft echoes meanwhile). */
  onFocusChange?: (focused: boolean) => void;
}): ReactNode {
  const t = useTranslations("pickCard");
  const tPick = useTranslations("room.pick");
  const editing = state === "editing";
  const [focused, setFocused] = useState(false);

  const origin =
    value.kind === "picked"
      ? value.card.origin
        ? t("fromLibrary", { origin: value.card.origin })
        : t("fromLibraryNoOrigin")
      : value.kind === "new"
        ? t("newCharacterLine")
        : "";

  return (
    <m.div
      data-pick-card={value.kind}
      initial={false}
      animate={{ scale: editing ? 1 : CARD_SETTLED_SCALE }}
      transition={{
        duration: state === "timeUp" ? 0.4 : 0.5,
        ease: gs.backOut(2),
      }}
      style={{ transformOrigin: "50% 0%" }}
      className={cn(
        "relative z-[5] flex w-[224px] flex-col gap-2.5 rounded-[28px] bg-surface px-3 pt-3 pb-4 shadow-pop sm:w-[270px]",
        className,
      )}
    >
      <CardPicture
        value={value}
        onChange={onChange}
        editable={editing}
        compact={focused && editing}
        onNewImage={onNewImage}
        onLibraryImage={onLibraryImage}
      />
      <CardNameField
        value={value}
        onChange={onChange}
        lang={lang}
        label={tPick("searchLabel", { name: targetName })}
        readOnly={!editing}
        autoFocus={autoFocus}
        onFocusChange={(on) => {
          setFocused(on);
          onFocusChange?.(on);
        }}
      />
      <span className="mx-1 min-h-[18px] text-balance font-medium text-[13px] text-ink-muted leading-[18px]">
        {origin}
      </span>

      <AnimatePresence initial={false}>
        {value.kind === "new" ? (
          <m.span
            key="seal"
            aria-hidden="true"
            initial={{ scale: 2.2, rotate: -20 }}
            animate={{ scale: 1, rotate: 8 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: gs.backOut(2.4) }}
            className={cn(
              sticker,
              "-right-4 top-5 z-[4] rounded-sm bg-butter px-3 py-1.5 text-[15px] text-on-butter",
            )}
          >
            {t("newSeal")}
          </m.span>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {stamp ? (
          <m.div
            key="stamp"
            role="status"
            initial={{ x: "-50%", y: "-50%", scale: 2.4, rotate: -16 }}
            animate={{ x: "-50%", y: "-50%", scale: 1, rotate: -8 }}
            transition={{ duration: 0.45, ease: gs.backOut(2.6) }}
            className={cn(
              sticker,
              "top-[42%] left-1/2 z-30 rounded-md bg-no px-[18px] py-2.5 text-[26px] text-on-no shadow-pop sm:text-[34px]",
            )}
          >
            {t("timeUp")}
          </m.div>
        ) : null}
      </AnimatePresence>
    </m.div>
  );
}
