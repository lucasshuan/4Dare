// Each seat in a room has its colour (--seat-1..4 in globals.css), kept all match long.

const SEAT_COLORS = 4;

/** The CSS colour of a seat (0-based, in join order). */
export const seatColor = (seat: number) =>
  `var(--seat-${(seat % SEAT_COLORS) + 1})`;
