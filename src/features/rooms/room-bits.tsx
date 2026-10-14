"use client";

import { Gamepad2, Plus, Sparkles, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Face } from "@/components/ui/face";
import type { Avatar, Phase, PublicRoom } from "@/game/types";
import { cn } from "@/lib/cn";
import { seatColor } from "@/lib/seats";
import s from "./room-bits.module.css";

/** A room younger than this is "just opened". */
const NEW_MS = 90_000;

type Kind = "new" | "wait" | "full" | "vote" | "play";
type Label =
  | "new"
  | "wait"
  | "full"
  | "theme"
  | "odd"
  | "auction"
  | "boards"
  | "playing";

/** What a listed room's pill says, from its status and (in a match) its phase. */
export function roomStatus(
  r: Pick<PublicRoom, "status" | "game" | "phase" | "createdAt">,
  now: number,
): { kind: Kind; label: Label } {
  if (r.status === "open")
    return now - r.createdAt < NEW_MS
      ? { kind: "new", label: "new" }
      : { kind: "wait", label: "wait" };
  if (r.status === "full") return { kind: "full", label: "full" };
  const p: Phase = r.phase;
  if (r.game === "who-am-i" && (p === "voting" || p === "theming"))
    return { kind: "vote", label: "theme" };
  if (r.game === "impostor" && p === "talking")
    return { kind: "vote", label: "odd" };
  if (r.game === "lineup") {
    if (["bidding", "queueing", "choosing", "halftime", "trading"].includes(p))
      return { kind: "vote", label: "auction" };
    if (p === "defending") return { kind: "play", label: "boards" };
  }
  return { kind: "play", label: "playing" };
}

/** The live dot: a soft ping around it. */
export function LiveDot({
  color,
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(s.live, className)}
      style={color ? ({ "--live": color } as CSSProperties) : undefined}
    />
  );
}

/** The room's status as a pill: waiting (live), just opened, full, voting or playing. */
export function RoomStatus({
  room,
  now,
  className,
}: {
  room: Pick<PublicRoom, "status" | "game" | "phase" | "createdAt">;
  now: number;
  className?: string;
}) {
  const t = useTranslations("home.rooms.status");
  const { kind, label } = roomStatus(room, now);
  return (
    <span className={cn(s.pill, s[kind], className)}>
      {kind === "wait" ? <LiveDot color="currentColor" /> : null}
      {kind === "new" ? <Sparkles strokeWidth={2} /> : null}
      {kind === "vote" ? <Timer strokeWidth={2} /> : null}
      {kind === "play" ? <Gamepad2 strokeWidth={2} /> : null}
      {t(label)}
    </span>
  );
}

/** A pill in one of the status looks, with any label (the join dialog's "waiting"). */
export const pillClass = (kind: Kind) => cn(s.pill, s[kind]);

/**
 * A room's seats, in order: the faces seated (in their colours), then your
 * seat when there's one free (your face shows in it on hover of a parent with
 * the `room-hover` class), then the empty ones. `fresh` pops the seat taken
 * last and flashes who sat there.
 */
export function Seats({
  seated,
  seats,
  open,
  me,
  fresh,
  joined,
  className,
  style,
}: {
  seated: { avatar: Avatar; colorSlot: number }[];
  seats: number;
  open: boolean;
  me: Avatar | null;
  /** The seat just taken (it pops). */
  fresh?: number | null;
  /** The flash over it: "<name> joined". */
  joined?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useTranslations("home.rooms");
  return (
    <div className={cn(s.seats, className)} style={style}>
      {Array.from({ length: seats }, (_, i) => {
        const p = seated[i];
        if (p)
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
              key={i}
              className={cn(s.seat, i === fresh && s.pop)}
            >
              <Face
                avatar={p.avatar}
                className={s.face}
                style={{ "--ring": seatColor(p.colorSlot) } as CSSProperties}
              />
              {i === fresh && joined ? (
                <span className={s.flash}>{joined}</span>
              ) : null}
            </span>
          );
        if (open && i === seated.length)
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
              key={i}
              className={cn(s.seat, s.empty, s.yours)}
              title={t("yourSeat")}
            >
              <Plus strokeWidth={2.25} aria-hidden="true" />
              {me ? (
                <span className={s.ghost}>
                  <Face avatar={me} className={s.face} />
                </span>
              ) : null}
            </span>
          );
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
          <span key={i} className={cn(s.seat, s.empty)} />
        );
      })}
    </div>
  );
}

/** One bar a seat, filled as they're taken; `fresh` is the one just filled. */
export function Meter({
  taken,
  seats,
  fresh,
  className,
}: {
  taken: number;
  seats: number;
  fresh?: number | null;
  className?: string;
}) {
  return (
    <span className={cn(s.meter, className)} aria-hidden="true">
      {Array.from({ length: seats }, (_, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: one bar a seat
          key={i}
          className={cn(i < taken && s.taken, i === fresh && s.fresh)}
        />
      ))}
    </span>
  );
}
