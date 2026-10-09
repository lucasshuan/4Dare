import type { Messages } from "next-intl";

/**
 * Namespaces only the room (and the dev labs that draw it) show. The hub
 * pages leave them, and the server-only `meta`, out of their HTML; the room's
 * layout hands every namespace to its pages.
 */
const ROOM_ONLY: readonly (keyof Messages)[] = [
  "room",
  "lobby",
  "chat",
  "whoAmI",
  "impostor",
  "lineup",
  "meta",
];

/**
 * Namespaces only their own page shows (long texts: rules, legal pages).
 * The page hands them down itself, with `PageMessages`.
 */
export const PAGE_ONLY = [
  "howTo",
  "library",
  "workshop",
  "community",
  "legal",
  "news",
] as const satisfies readonly (keyof Messages)[];
export type PageNamespace = (typeof PAGE_ONLY)[number];

/** The messages a hub page needs in the browser. */
export const hubMessages = (all: Messages): Partial<Messages> =>
  Object.fromEntries(
    Object.entries(all).filter(
      ([ns]) =>
        !ROOM_ONLY.includes(ns as keyof Messages) &&
        !(PAGE_ONLY as readonly string[]).includes(ns),
    ),
  );
