import type { RoomState } from "@/game/types";

/**
 * The parts of a room toPublicRoom reads. The room list reads only these,
 * never a room's history (listing.test.ts fails if toPublicRoom starts
 * reading something else).
 */
export const LISTED = [
  "code",
  "phase",
  "hostId",
  "updatedAt",
  "settings",
  "players",
] as const;

export type ListedRoom = Pick<RoomState, (typeof LISTED)[number]>;

/** The same fields as a PostgREST select (`code` and `phase` are columns too). */
export const LISTED_COLUMNS =
  "code, phase, hostId:state->hostId, updatedAt:state->updatedAt, settings:state->settings, players:state->players";
