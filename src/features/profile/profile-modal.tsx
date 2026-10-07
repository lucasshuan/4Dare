"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { profilePath } from "./profile-link";
import { ProfileLoader } from "./profile-screen-view";

/**
 * A profile opened from a link inside the app: the whole screen over the
 * page it came from (a match keeps going behind it). Its address bar and
 * close button stay put; only the profile scrolls. Closing goes back.
 */
export function ProfileModal({ handle }: { handle: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setOpen(false);
      }}
      onOpenChangeComplete={(next) => {
        if (!next) router.back();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-canvas text-ink outline-none transition-[scale,opacity] duration-200 ease-soft data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <div className="flex shrink-0 items-center gap-2.5 border-line border-b bg-surface py-2.5 pr-3 pl-4 sm:pl-5">
            <Dialog.Title className="m-0 inline-flex min-w-0 items-center truncate rounded-pill bg-sunken px-3 py-1 font-medium font-mono text-[13px] text-ink-muted">
              {host}
              {profilePath("")}
              <b className="font-medium text-ink">{handle}</b>
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("close")}
              className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 ease-soft hover:bg-sunken hover:text-ink"
            >
              <X className="size-5" strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ProfileLoader handle={handle} mode="modal" />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
