"use client";

import { Popover } from "@base-ui/react/popover";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { giveUp } from "@/server/actions";

/** Red "Give up" in the match header; asks first, then reveals your card. Gone once you're out. */
export function GiveUpButton() {
  const t = useTranslations("turn.giveUp");
  const { me, code } = useRoomContext();
  const { act, pending } = useRoomAction();
  const [open, setOpen] = useState(false);
  if (me.gaveUp || me.discoveredAt !== null || me.away) return null;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={buttonClass("danger", "sm", "h-10 max-sm:w-10 max-sm:px-0")}
      >
        <Flag strokeWidth={2} />
        <span className="max-sm:sr-only">{t("button")}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(300px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-3 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <Popover.Title className="font-semibold">{t("sure")}</Popover.Title>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  const r = await act(() => giveUp(code));
                  if (r.ok) setOpen(false);
                }}
              >
                {t("yes")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                {t("no")}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
