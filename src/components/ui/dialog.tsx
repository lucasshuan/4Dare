"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The box a modal takes. It never changes with what is inside (a tab switch
 * keeps it still); the content scrolls instead. "panel": a fixed box in the
 * middle (settings, account), the whole screen on phones; "wide" a bigger one;
 * "compact" as tall as its content, on phones too.
 */
export const MODAL_SIZE = {
  panel:
    "inset-0 m-auto h-[min(600px,calc(100dvh-2rem))] w-[min(800px,calc(100vw-2rem))] rounded-xl max-sm:h-dvh max-sm:w-screen max-sm:rounded-none",
  /** A bigger fixed box (the room's advanced settings, a profile); the whole screen on phones. */
  wide: "inset-0 m-auto h-[min(820px,calc(100dvh-2rem))] w-[min(1120px,calc(100vw-2rem))] rounded-xl max-sm:h-dvh max-sm:w-screen max-sm:rounded-none",
  /** A spacious form with a margin on every screen, including phones. */
  full: "inset-0 m-auto h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] rounded-[24px] sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] lg:h-[calc(100dvh-4rem)] lg:w-[min(1440px,calc(100vw-4rem))] lg:rounded-[28px]",
  compact:
    "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[min(600px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl",
} as const;

/** Creation forms keep their preview beside the fields when there is room. */
export const FORM_MODAL_LAYOUT = cn(
  "fixed z-50 flex flex-col overflow-hidden bg-surface text-ink shadow-pop outline-none transition-[scale,opacity] duration-300 ease-soft data-ending-style:scale-[0.98] data-starting-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:opacity-0 lg:grid lg:grid-cols-[minmax(0,28%)_minmax(0,1fr)]",
  MODAL_SIZE.full,
);

/** A modal with a title bar (its title and a close button) over a scrim; the body fills the rest. */
export function Modal({
  open,
  onOpenChange,
  title,
  icon,
  size = "panel",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  icon?: ReactNode;
  size?: keyof typeof MODAL_SIZE;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-surface text-ink shadow-pop outline-none transition-[scale,opacity] duration-200 ease-soft data-ending-style:scale-[0.97] data-starting-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:opacity-0",
            MODAL_SIZE[size],
            className,
          )}
        >
          <div className="flex shrink-0 items-center gap-2.5 border-line border-b py-3 pr-3 pl-5 sm:pl-6">
            {icon ? (
              <span className="flex text-ink [&_svg]:size-6">{icon}</span>
            ) : null}
            <Dialog.Title className="min-w-0 truncate font-bold font-display text-[22px] tracking-[-0.01em]">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("close")}
              className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 ease-soft hover:bg-sunken hover:text-ink"
            >
              <X className="size-5" strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
