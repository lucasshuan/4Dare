"use client";

// What for?'s TV chair, above the seats when the room plays with a
// presenter: who presents, "I'll present" and "Leave the chair"; the host
// can seat anyone there or empty it. Empty, the room draws one at the start.
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Tv } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";

export function TvChair({
  players,
  chairId,
  meId,
  host,
  pending,
  onSeat,
}: {
  players: PlayerView[];
  chairId: string | null;
  meId: string;
  /** The viewer is the room's host. */
  host: boolean;
  pending: boolean;
  onSeat: (seat: string | null) => void;
}) {
  const t = useTranslations("lobby");
  const name = useDisplayName();
  const [open, setOpen] = useState(false);
  const sitting = players.find((p) => p.id === chairId) ?? null;
  const mine = chairId === meId;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border-[1.5px] border-line-strong border-dashed bg-surface p-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#2b2622] text-white">
        <Tv className="size-5" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="font-bold text-sm">{t("chairTitle")}</b>
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-muted">
          {sitting ? (
            <>
              <Avatar
                avatar={sitting.avatar}
                size={20}
                seat={sitting.colorSlot}
              />
              <span className="truncate">
                {t("chairOf", { name: name(sitting, sitting.isYou) })}
              </span>
            </>
          ) : (
            t("chairEmpty")
          )}
        </span>
      </span>
      {mine ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => onSeat(null)}
          className="h-9 rounded-pill border-[1.5px] border-line-strong px-4 font-bold text-sm"
        >
          {t("stand")}
        </button>
      ) : !sitting ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => onSeat(meId)}
          className="h-9 rounded-pill bg-ink px-4 font-bold text-on-ink text-sm"
        >
          {t("sit")}
        </button>
      ) : null}
      {host ? (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            aria-label={t("seatSomeone")}
            className={cn(
              "grid size-9 place-items-center rounded-pill text-ink-muted hover:bg-sunken",
              open && "bg-sunken",
            )}
          >
            <ChevronDown className="size-4.5" strokeWidth={2.25} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="bottom"
              align="end"
              sideOffset={6}
              className="z-50"
            >
              <Popover.Popup className="flex w-64 flex-col gap-1 rounded-md bg-surface p-2 shadow-pop outline-none">
                <span className="px-2 py-1 font-semibold text-[12px] text-ink-muted">
                  {t("seatSomeone")}
                </span>
                {players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={pending || p.id === chairId}
                    onClick={() => {
                      setOpen(false);
                      onSeat(p.id);
                    }}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left font-semibold text-sm hover:bg-sunken disabled:opacity-40"
                  >
                    <Avatar avatar={p.avatar} size={24} seat={p.colorSlot} />
                    <span className="truncate">{name(p, p.isYou)}</span>
                  </button>
                ))}
                {sitting ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setOpen(false);
                      onSeat(null);
                    }}
                    className="rounded-sm px-2 py-1.5 text-left font-semibold text-no text-sm hover:bg-sunken"
                  >
                    {t("emptyChair")}
                  </button>
                ) : null}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ) : null}
    </div>
  );
}
