"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CharacterSheetBody } from "./character-sheet";

/**
 * A sheet opened from inside the app: a full-height panel sliding in from the
 * right over the list, like the side menu does from the left. Closing goes
 * back, so the list is where it was.
 */
export function SheetPanel({ id }: { id: string }) {
  const t = useTranslations("library.sheet");
  const router = useRouter();
  // shut on the first paint, then open: a dialog mounted open skips its slide in
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);
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
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(560px,100vw)] flex-col overflow-hidden bg-surface text-ink shadow-pop outline-none transition-transform duration-[420ms] ease-soft data-ending-style:translate-x-[104%] data-starting-style:translate-x-[104%] data-ending-style:duration-[260ms] data-ending-style:ease-[cubic-bezier(0.4,0,1,1)]">
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
