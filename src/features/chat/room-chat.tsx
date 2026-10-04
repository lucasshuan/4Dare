"use client";

/**
 * The room chat: a tab at the bottom right on wide windows, a bar along the
 * bottom on phones. Fixed at z-[35], after the screens in the DOM, its root
 * marked `data-chat` (see src/lib/focus.ts); while mounted it sets `--dock`
 * on <html> so screens and toasts keep clear of it. Mounted by RoomStage in
 * the lobby, the match and the results. Placeholder until the chat lands
 * (WP11): renders nothing and leaves `--dock` at 0.
 */
export function RoomChat() {
  return null;
}
