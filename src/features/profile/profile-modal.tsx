"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MODAL_SIZE } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import { closeProfile } from "./open-profile";
import { ProfileLoader } from "./profile-screen-view";

/**
 * A profile opened from a link inside the app: a modal over the page it came
 * from (a match keeps going behind it), with no address of its own. The close
 * button floats over the cover; the profile scrolls under it.
 */
export function ProfileModal({ handle }: { handle: string }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(true);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setOpen(false);
      }}
      onOpenChangeComplete={(next) => {
        if (!next) closeProfile();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-canvas text-ink shadow-pop outline-none transition-[scale,opacity] duration-200 ease-soft data-ending-style:scale-[0.97] data-starting-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:opacity-0",
            MODAL_SIZE.wide,
          )}
        >
          <Dialog.Title className="sr-only">@{handle}</Dialog.Title>
          <Dialog.Close
            aria-label={t("close")}
            className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-pill bg-surface/85 text-ink-muted shadow-sm backdrop-blur transition-colors duration-200 ease-soft hover:bg-surface hover:text-ink"
          >
            <X className="size-5" strokeWidth={1.75} />
          </Dialog.Close>
          {/* a floating bar: the browser's gutter left a strip beside the cover */}
          <ScrollArea className="flex-1">
            <ProfileLoader handle={handle} mode="modal" />
          </ScrollArea>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
