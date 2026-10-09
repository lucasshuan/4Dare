"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The box a modal takes. It never changes with what is inside (a tab switch
 * keeps it still); the content scrolls instead. "panel": a fixed box in the
 * middle (settings, account), the whole screen on phones; "wide" a bigger one. "full": the whole
 * screen always (a profile).
 */
const SIZE = {
  panel:
    "inset-0 m-auto h-[min(600px,calc(100dvh-2rem))] w-[min(800px,calc(100vw-2rem))] rounded-xl max-sm:h-dvh max-sm:w-screen max-sm:rounded-none",
  /** A bigger fixed box (the room's advanced settings); the whole screen on phones. */
  wide: "inset-0 m-auto h-[min(820px,calc(100dvh-2rem))] w-[min(1120px,calc(100vw-2rem))] rounded-xl max-sm:h-dvh max-sm:w-screen max-sm:rounded-none",
  full: "inset-0 h-dvh w-screen",
} as const;

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
  size?: keyof typeof SIZE;
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
            SIZE[size],
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
