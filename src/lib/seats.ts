// Each player in a room has a colour (--seat-1..10 in globals.css), theirs from
// joining until they leave (PlayerView.colorSlot, picked in game/seat-colors.ts).

import type { CSSProperties } from "react";
import { SEAT_COLORS } from "@/game/seat-colors";

const n = (slot: number) => (slot % SEAT_COLORS) + 1;

/** The CSS colour of a player's slot (0-based). */
export const seatColor = (slot: number) => `var(--seat-${n(slot)})`;

/** The colour as text: deeper in the light theme, so it reads on a surface. */
export const seatInk = (slot: number) => `var(--seat-${n(slot)}-ink)`;

/** The colour as a light fill, behind its player. */
export const seatSoft = (slot: number) => `var(--seat-${n(slot)}-soft)`;

/** Text on the full colour. */
export const onSeat = (slot: number) => `var(--on-seat-${n(slot)})`;

/** A light fill in the player's colour, with seat rings on it gapped in the same fill. */
export const seatWash = (slot: number) =>
  ({
    backgroundColor: seatSoft(slot),
    "--ring-gap": seatSoft(slot),
  }) as CSSProperties;
