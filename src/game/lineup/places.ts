// The match's points and podium places; apart from the engine so the shared
// steps can rank a finished match without importing the rules.
import type { PlayerId } from "../types";
import type { LineupMatch } from "./types";

/** The match's points so far, by player. */
export function luTotals(lu: LineupMatch): Record<PlayerId, number> {
  const totals: Record<PlayerId, number> = {};
  for (const id of lu.dealt) totals[id] = 0;
  for (const r of lu.rounds)
    for (const [id, p] of Object.entries(r.points))
      totals[id] = (totals[id] ?? 0) + p;
  return totals;
}

/** Places on the podium by points: equal points share the place (1, 1, 3). */
export function luPlaces(lu: LineupMatch): Record<PlayerId, number> {
  const totals = luTotals(lu);
  const sorted = Object.values(totals).sort((a, b) => b - a);
  return Object.fromEntries(
    Object.entries(totals).map(([id, p]) => [id, sorted.indexOf(p) + 1]),
  );
}
