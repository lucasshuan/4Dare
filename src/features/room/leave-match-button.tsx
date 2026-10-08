"use client";

import { Popover } from "@base-ui/react/popover";
import { DoorClosed, DoorOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { useRoomContext } from "@/features/data/room-context";
import { useLeaveMatch } from "@/features/data/use-current-match";
import { useRouter } from "@/i18n/navigation";
import { GAME_PATHS } from "@/lib/routes";

/**
 * The "Leave" button's look, in the match header and the lobby alike, so it
 * reads as the way out at a glance: the "no" colour, soft at rest; solid when
 * pointed at (its door swings open); a deeper red that sinks when pressed. The
 * focus ring is ink, which shows on the coloured backdrops where sky would not.
 */
export const leaveButtonClass = buttonClass(
  "secondary",
  "sm",
  "group h-10 border-no bg-no-soft text-no transition-[translate,scale,background-color,border-color,color] hover:bg-no hover:text-on-no focus-visible:bg-no focus-visible:text-on-no focus-visible:outline-ink! active:translate-y-px active:scale-95 active:border-[var(--no-deep)] active:bg-[var(--no-deep)] active:text-on-no max-sm:w-10 max-sm:px-0",
);

/** The door on "Leave": shut at rest, open while pointed at or focused. */
export function LeaveIcon() {
  return (
    <>
      <DoorClosed
        strokeWidth={1.75}
        className="group-hover:hidden group-focus-visible:hidden"
      />
      <DoorOpen
        strokeWidth={1.75}
        className="hidden group-hover:block group-focus-visible:block"
      />
    </>
  );
}

/** "Leave" in the match header: out of the match for good, after a quick "sure?". */
export function LeaveMatchButton() {
  const t = useTranslations("common.currentMatch");
  const { view, me, code } = useRoomContext();
  const router = useRouter();
  const { leave, pending } = useLeaveMatch();
  const [open, setOpen] = useState(false);
  if (me.away) return null;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={leaveButtonClass}>
        <LeaveIcon />
        <span className="max-sm:sr-only">{t("leaveShort")}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(300px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-3 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <Popover.Title className="font-semibold">
              {t("leaveSure")}
            </Popover.Title>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  if (!(await leave(code))) return;
                  setOpen(false);
                  router.push(GAME_PATHS[view.settings.game]);
                }}
              >
                {t("leaveYes")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                {t("stay")}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
