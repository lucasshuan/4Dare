import type { Messages } from "next-intl";

/**
 * Namespaces only the room (and the dev labs that draw it) show. The hub
 * pages leave them, and the server-only `meta`, out of their HTML; the room's
 * layout hands every namespace to its pages.
 */
const ROOM_ONLY: readonly (keyof Messages)[] = [
  "game",
  "room",
  "turn",
  "result",
  "lobby",
  "stageOpening",
  "stageDraw",
  "stageCast",
  "pickCard",
  "chat",
  "impostor",
  "lineup",
  "meta",
];

/** The messages a hub page needs in the browser. */
export const hubMessages = (all: Messages): Partial<Messages> =>
  Object.fromEntries(
    Object.entries(all).filter(
      ([ns]) => !ROOM_ONLY.includes(ns as keyof Messages),
    ),
  );
