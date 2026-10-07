"use client";

import { Popover } from "@base-ui/react/popover";
import { Eye } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CardBack } from "@/components/ui/card-frame";
import { CharacterCard } from "@/components/ui/character-card";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import type { CardView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { useGameOption } from "@/lib/settings";

/**
 * Your card, big: the character over your name and colour. With "hidden
 * card" on, it stays face down until you hold it (for screens others see).
 */
export function MyCard({
  card,
  className,
}: {
  card: CardView;
  className?: string;
}) {
  const t = useTranslations("impostor.card");
  const { me } = useRoomContext();
  const name = useDisplayName();
  const hidden = useGameOption("impostor", "hiddenCard");
  const [held, setHeld] = useState(false);
  const covered = hidden && !held;
  const hold = hidden
    ? {
        onPointerDown: () => setHeld(true),
        onPointerUp: () => setHeld(false),
        onPointerLeave: () => setHeld(false),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === " " || e.key === "Enter") setHeld(true);
        },
        onKeyUp: () => setHeld(false),
      }
    : {};
  const face = (
    <CharacterCard
      card={card}
      hidden={covered}
      owner={name(me, true)}
      seat={me.colorSlot}
      title={t("hold")}
      className={className}
    />
  );
  return hidden ? (
    <button
      type="button"
      {...hold}
      aria-label={t("holdLabel")}
      className="block w-full select-none rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-sky"
    >
      {face}
    </button>
  ) : (
    face
  );
}

/**
 * Your card as a small button for the header: its picture and name; it opens
 * the card big. With "hidden card" on, the button shows only the back.
 */
export function MyCardButton({ card }: { card: CardView }) {
  const t = useTranslations("impostor.card");
  const hidden = useGameOption("impostor", "hiddenCard");
  const { me } = useRoomContext();
  const still = useReducedMotion() ?? false;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("open")}
        className="flex h-10 max-w-48 items-center gap-2 rounded-pill bg-surface py-1 pr-3.5 pl-1 font-semibold text-sm shadow-card max-sm:max-w-[32vw] transition-transform duration-200 ease-soft hover:-translate-y-px"
      >
        <span className="flex size-8 shrink-0 overflow-hidden rounded-pill">
          {hidden ? (
            <CardBack seat={me.colorSlot} className="rounded-pill" />
          ) : (
            <Portrait src={card.imageUrl} className="rounded-pill" />
          )}
        </span>
        <span className="min-w-0 truncate">
          {hidden ? t("yours") : card.name}
        </span>
        <Eye className="size-4 shrink-0 text-ink-muted" strokeWidth={2} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-50">
          <Popover.Popup className="w-[min(300px,calc(100vw-2rem))] origin-(--transform-origin) outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <m.div
              initial={still ? false : { rotateY: -20 }}
              animate={{ rotateY: 0 }}
              className={cn("perspective-[800px]")}
            >
              <MyCard card={card} />
            </m.div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
