"use client";

// What for?'s presenter chair, above the room's lists when the room plays
// with a presenter: whoever sits in it presents ("I'll present", "Leave the
// chair"); the host can seat anyone there, empty it, or draw one. Empty, everyone plays.
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Dices } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HOST_MIN_PEOPLE } from "@/game/lineup/rules";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { seatColor } from "@/lib/seats";

/** A little TV with antennas: the presenter's face on its screen, in their colour; static when empty. */
function TvFace({ player }: { player: PlayerView | null }) {
  const color = player ? seatColor(player.colorSlot) : "var(--line-strong)";
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex h-[50px] w-[58px] shrink-0 items-end justify-center"
    >
      <span className="absolute top-0 left-1/2 h-[22%]">
        <i className="-left-px absolute bottom-0 block h-full w-0.5 origin-bottom -rotate-[28deg] bg-[#8c8c8c]" />
        <i className="-left-px absolute bottom-0 block h-full w-0.5 origin-bottom rotate-[28deg] bg-[#8c8c8c]" />
      </span>
      <span
        className="relative grid h-[80%] w-full place-items-center rounded-[22%] shadow-[inset_0_-3px_0_rgba(0,0,0,0.2),0_3px_8px_rgba(18,22,31,0.25)]"
        style={{ background: color }}
      >
        <span
          className="block h-[74%] w-[74%] overflow-hidden rounded-[26%/30%] bg-[#0c100e] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.4)]"
          style={
            player
              ? undefined
              : ({
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 5px)",
                } as CSSProperties)
          }
        >
          {player ? (
            <Avatar
              avatar={player.avatar}
              size={44}
              className="size-full rounded-none"
            />
          ) : null}
        </span>
      </span>
    </span>
  );
}

export function TvChair({
  players,
  here,
  chairId,
  meId,
  host,
  pending,
  onSeat,
  onDraw,
}: {
  players: PlayerView[];
  /** How many people are here: a presenter needs HOST_MIN_PEOPLE. */
  here: number;
  chairId: string | null;
  meId: string;
  /** The viewer is the room's host. */
  host: boolean;
  pending: boolean;
  onSeat: (seat: string | null) => void;
  onDraw: () => void;
}) {
  const t = useTranslations("lobby");
  const name = useDisplayName();
  const [open, setOpen] = useState(false);
  const sitting = players.find((p) => p.id === chairId) ?? null;
  const mine = chairId === meId;
  const few = here < HOST_MIN_PEOPLE;
  const ring = sitting ? seatColor(sitting.colorSlot) : null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[22px] p-3.5 sm:flex-nowrap sm:px-4.5 sm:py-4",
        !ring && "bg-surface shadow-[inset_0_0_0_2px_var(--line-strong)]",
      )}
      style={
        ring
          ? {
              background: `linear-gradient(120deg, color-mix(in oklab, ${ring} 18%, var(--surface)), var(--surface))`,
              boxShadow: `inset 0 0 0 2px color-mix(in oklab, ${ring} 45%, transparent)`,
            }
          : undefined
      }
    >
      <m.span
        key={sitting?.id ?? "empty"}
        className="grid shrink-0 place-items-center"
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
      >
        <TvFace player={sitting} />
      </m.span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono font-semibold text-[11px] text-ink-muted uppercase tracking-[0.08em]">
          {t("chairTitle")}
        </span>
        <b className="truncate font-display font-extrabold text-[17px] leading-[1.1] sm:text-[21px]">
          {sitting
            ? t("chairOf", { name: name(sitting, sitting.isYou) })
            : t("chairWho")}
        </b>
        <small className="font-semibold text-[12px] text-ink-muted sm:text-[13.5px]">
          {few ? t("chairFew") : sitting ? t("chairSeated") : t("chairEmpty")}
        </small>
      </span>
      <span className="flex items-center gap-1.5 max-sm:w-full max-sm:justify-end">
        {!sitting && host ? (
          <Button
            size="sm"
            disabled={pending || few}
            onClick={onDraw}
            className="shrink-0"
          >
            <Dices strokeWidth={2} className="size-4.5!" />
            {t("drawChair")}
          </Button>
        ) : null}
        {mine ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onSeat(null)}
            className="shrink-0"
          >
            {t("stand")}
          </Button>
        ) : !sitting ? (
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => onSeat(meId)}
            className="shrink-0"
          >
            {t("sit")}
          </Button>
        ) : null}
        {host ? (
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
              aria-label={t("seatSomeone")}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-pill text-ink-muted hover:bg-sunken",
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
      </span>
    </div>
  );
}
