"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { type KeyboardEvent, useState } from "react";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";

/**
 * Each game's photos, in order: moments of real matches played by the
 * e2e/game-shots.spec.ts run (public/game-shots/<game>/<moment>-<lang>.jpg).
 */
const MOMENTS = {
  "who-am-i": ["pick", "turn", "found"],
  impostor: ["question", "vote", "caught"],
  lineup: ["auction", "boards", "score"],
} as const satisfies Record<GameKey, readonly string[]>;

/** Photos of a real match, side by side; a click opens one big, to go through and close. */
export function GameShots({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.shots");
  const locale = useLocale();
  const moments: readonly string[] = MOMENTS[game];
  const [open, setOpen] = useState<number | null>(null);
  // photos not taken yet (a language, a game) leave their place empty
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const src = (m: string) => `/game-shots/${game}/${m}-${locale}.jpg`;
  const caption = (m: string) => t(`${game}.${m}` as Parameters<typeof t>[0]);
  const go = (step: number) =>
    setOpen((i) =>
      i === null ? i : (i + step + moments.length) % moments.length,
    );
  const keys = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  };

  return (
    <section aria-label={t("label")} className={cn("min-w-0", className)}>
      <ul className="grid grid-cols-3 gap-3">
        {moments.map((m, i) => (
          <li key={m} className={cn("min-w-0", missing.has(m) && "invisible")}>
            <button
              type="button"
              aria-label={t("open", { caption: caption(m) })}
              onClick={() => setOpen(i)}
              className="group relative block aspect-video w-full overflow-hidden bg-sunken shadow-card"
            >
              <Image
                src={src(m)}
                alt=""
                fill
                sizes="(min-width: 1280px) 260px, 33vw"
                onError={() => setMissing((s) => new Set(s).add(m))}
                className="object-cover transition-transform duration-300 ease-soft group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpen(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup
            onKeyDown={keys}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 outline-none transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0 sm:p-10"
          >
            {open !== null ? (
              <>
                <Dialog.Title className="sr-only">
                  {caption(moments[open])}
                </Dialog.Title>
                <div className="relative aspect-video w-[min(100%,calc((100dvh-9rem)*16/9))] overflow-hidden shadow-pop">
                  <Image
                    src={src(moments[open])}
                    alt={caption(moments[open])}
                    fill
                    sizes="92vw"
                    className="object-contain"
                  />
                </div>
                {(
                  [
                    [-1, "prev", ChevronLeft, "left-3 sm:left-5"],
                    [1, "next", ChevronRight, "right-3 sm:right-5"],
                  ] as const
                ).map(([step, key, Icon, side]) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={t(key)}
                    onClick={() => go(step)}
                    className={cn(
                      "-translate-y-1/2 absolute top-1/2 flex size-11 items-center justify-center rounded-pill bg-white/15 text-white transition-colors hover:bg-white/25",
                      side,
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2} />
                  </button>
                ))}
                <Dialog.Close
                  aria-label={t("close")}
                  className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-pill bg-white/15 text-white transition-colors hover:bg-white/25 sm:top-5 sm:right-5"
                >
                  <X className="size-6" strokeWidth={2} />
                </Dialog.Close>
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
