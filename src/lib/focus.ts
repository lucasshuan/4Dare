// The room chat sits beside the match screens and keeps its own keyboard:
// screens that grab focus or keys (step fields, reveals, paste targets) leave
// it alone while the player is typing there.

/** The chat's root carries this attribute. */
export const CHAT_SELECTOR = "[data-chat]";

/** Whether an event target (or any node) sits inside the chat. */
export function insideChat(target: EventTarget | null | undefined): boolean {
  if (typeof Node === "undefined" || !(target instanceof Node)) return false;
  const el = target instanceof Element ? target : target.parentElement;
  return !!el?.closest(CHAT_SELECTOR);
}

/** True unless the player is typing in the chat: a step field may take the focus. */
export function focusIsFree(): boolean {
  if (typeof document === "undefined") return true;
  return !insideChat(document.activeElement);
}
