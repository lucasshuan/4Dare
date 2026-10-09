"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CharacterSheetBody } from "./character-sheet";

/**
 * A sheet opened from inside the app: a panel sliding in from the right over
 * the list (from the bottom on phones). Closing goes back, so the list is
 * where it was.
 */
export function SheetPanel({ id }: { id: string }) {
  const t = useTranslations("library.sheet");
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setOpen(false);
      }}
      onOpenChangeComplete={(next) => {
        if (!next) router.back();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-300 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 top-7 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[28px] bg-surface text-ink shadow-pop outline-none transition-transform duration-[440ms] ease-soft data-ending-style:translate-y-[102%] data-starting-style:translate-y-[102%] data-ending-style:duration-[260ms] sm:inset-y-2.5 sm:right-2.5 sm:left-auto sm:w-[min(560px,calc(100vw-20px))] sm:rounded-[28px] sm:data-ending-style:translate-x-[calc(100%+24px)] sm:data-starting-style:translate-x-[calc(100%+24px)] sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-y-0">
          <Dialog.Title className="sr-only">{id}</Dialog.Title>
          <CharacterSheetBody
            id={id}
            mode="panel"
            close={
              <Dialog.Close
                aria-label={t("close")}
                className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken transition-transform duration-150 active:scale-[0.92]"
              >
                <X className="size-5" strokeWidth={1.75} />
              </Dialog.Close>
            }
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
