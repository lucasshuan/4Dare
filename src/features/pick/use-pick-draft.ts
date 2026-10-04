"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CardContent, SearchItem } from "@/game/character-search";
import type { PickView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import { draftKey, fromDraft, putDraft, toDraft } from "./draft-api";

/** Quiet time after the last keystroke before the card is saved. */
export const DRAFT_DEBOUNCE_MS = 600;
/** The last save, if the card changed since the last accepted one: this long before the deadline… */
export const FINAL_FLUSH_MS = 1500;
/** …plus up to this much, so the pickers' last saves don't land together. */
export const FINAL_JITTER_MS = 400;

interface Saver {
  /** Key of the last draft the server accepted (or gave us). */
  accepted: string;
  /** Every draft this page sent, drew or restored: a view echoing one of them is old news. */
  known: Set<string>;
  /** The card was filled from the server's draft (or there was none). Nothing is saved before. */
  restored: boolean;
  inflight: Promise<void> | null;
  again: boolean;
  timer: number;
  /** Refused for good (the card is closed): stop saving. */
  stopped: boolean;
  /** Confirm is under way: hold the autosave. */
  paused: boolean;
  image: string | null;
}

/**
 * Keeps the server's copy of the pick card (its draft) in step with the card,
 * so the clock running out picks whatever is on it (plan 1.5):
 * - saves 600 ms after typing stops; at once on a row, a hand card, a picture
 *   or a blur (Random saves its own draw on the server);
 * - one ordered request at a time; nothing while a picture uploads (the
 *   upload route saves it) or after the deadline;
 * - a last save at deadline − 1.5 s (+ up to 0.4 s) only if the card changed
 *   since the last accepted save, and a keepalive one when the page goes away;
 * - fills the card from the server's draft on mount (reload, rejoin), and
 *   later only when the server's draft is new to this page and the field is
 *   neither focused nor holding unsaved changes.
 * `flush` sends what is unsaved now (Confirm of a new name needs the stored
 * draft); `pause` holds the autosave while Confirm runs.
 */
export function usePickDraft({
  code,
  pick,
  content,
  setContent,
  focused,
  deadline,
  items,
  active,
}: {
  code: string;
  pick: PickView;
  content: CardContent;
  setContent: (card: CardContent) => void;
  /** The name field has the focus. */
  focused: boolean;
  /** The pick clock's deadline (server ms). */
  deadline: number | null;
  /** The character index (undefined while it loads). */
  items: readonly SearchItem[] | undefined;
  /** The card can still change: picking, not confirmed, not out of time. */
  active: boolean;
}) {
  const clock = useClock();
  const saver = useRef<Saver | null>(null);
  saver.current ??= {
    accepted: draftKey(pick.draft),
    known: new Set([draftKey(pick.draft)]),
    restored: false,
    inflight: null,
    again: false,
    timer: 0,
    stopped: false,
    paused: false,
    image: content.kind === "new" ? content.imageUrl : null,
  };
  const latest = useRef({ content, active, deadline, focused, code, clock });
  latest.current = { content, active, deadline, focused, code, clock };

  const send = useCallback((force = false): Promise<void> => {
    const s = saver.current as Saver;
    if (s.inflight) {
      s.again = true;
      return s.inflight;
    }
    const {
      content: card,
      active: open,
      deadline: end,
      code: room,
    } = latest.current;
    if (!open || s.stopped || (s.paused && !force) || !s.restored)
      return Promise.resolve();
    if (card.kind === "new" && card.uploading) return Promise.resolve();
    if (end !== null && latest.current.clock.now() >= end)
      return Promise.resolve();
    const draft = toDraft(card);
    const key = draftKey(draft);
    if (key === s.accepted) return Promise.resolve();
    s.known.add(key);
    s.inflight = putDraft(room, draft).then((r) => {
      if (r.ok) s.accepted = key;
      // closed (confirmed, out of time, not seated): nothing more to save
      else if (r.status === 403 || r.status === 409) s.stopped = true;
    });
    return s.inflight.finally(() => {
      s.inflight = null;
      if (s.again) {
        s.again = false;
        void send();
      }
    });
  }, []);

  const flush = useCallback(async () => {
    const s = saver.current as Saver;
    window.clearTimeout(s.timer);
    if (s.inflight) await s.inflight;
    await send(true);
  }, [send]);

  const pause = useCallback((on: boolean) => {
    const s = saver.current as Saver;
    s.paused = on;
    if (on) window.clearTimeout(s.timer);
  }, []);

  // the card as the server left it, once (reload, rejoin): a library id waits for the index
  useEffect(() => {
    const s = saver.current as Saver;
    if (s.restored) return;
    if (pick.confirmed || !pick.draft) {
      s.restored = true;
      return;
    }
    const card = fromDraft(pick.draft, items);
    if (!card) return;
    s.restored = true;
    s.accepted = draftKey(pick.draft);
    s.known.add(s.accepted);
    // the player started over while the index loaded: their card wins
    if (latest.current.content.kind === "empty") setContent(card);
  }, [pick.confirmed, pick.draft, items, setContent]);

  // a draft saved elsewhere (another tab, a draw): only into an idle, saved card
  const serverKey = draftKey(pick.draft);
  useEffect(() => {
    const s = saver.current as Saver;
    const now = latest.current;
    if (!s.restored || !now.active || s.known.has(serverKey)) return;
    const local = draftKey(toDraft(now.content));
    if (serverKey === local) return;
    if (now.focused || local !== s.accepted || s.inflight) return;
    const card = fromDraft(pick.draft, items);
    if (!card) return;
    s.accepted = serverKey;
    s.known.add(serverKey);
    setContent(card);
  }, [serverKey, pick.draft, items, setContent]);

  // the autosave
  useEffect(() => {
    const s = saver.current as Saver;
    const image = content.kind === "new" ? content.imageUrl : null;
    const pictured = image !== s.image;
    s.image = image;
    window.clearTimeout(s.timer);
    if (!s.restored || !active) return;
    const key = draftKey(toDraft(content));
    // a draw is saved by the server, a restored card is what it holds
    if (
      content.kind === "picked" &&
      (content.via === "random" || content.via === "restore")
    ) {
      if (content.via === "random") s.accepted = key;
      s.known.add(key);
      return;
    }
    if (key === s.accepted || s.paused) return;
    const typing =
      focused &&
      !pictured &&
      (content.kind === "typing" ||
        content.kind === "new" ||
        content.kind === "empty");
    if (typing)
      s.timer = window.setTimeout(() => void send(), DRAFT_DEBOUNCE_MS);
    else void send();
  }, [content, focused, active, send]);

  // the last save before the deadline, only if something is unsaved
  useEffect(() => {
    if (!active || deadline === null || clock.frozen) return;
    const at = deadline - FINAL_FLUSH_MS + Math.random() * FINAL_JITTER_MS;
    const wait = (at - clock.now()) / clock.rate;
    if (wait < 0) return;
    const id = window.setTimeout(() => void flush(), wait);
    return () => window.clearTimeout(id);
  }, [active, deadline, clock, flush]);

  // leaving the page: one keepalive save of what is unsaved
  useEffect(() => {
    const onHide = () => {
      const s = saver.current as Saver;
      const now = latest.current;
      if (!s.restored || !now.active || s.stopped) return;
      if (now.content.kind === "new" && now.content.uploading) return;
      if (now.deadline !== null && now.clock.now() >= now.deadline) return;
      const draft = toDraft(now.content);
      if (draftKey(draft) === s.accepted) return;
      void putDraft(now.code, draft, { keepalive: true });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  useEffect(
    () => () => window.clearTimeout((saver.current as Saver).timer),
    [],
  );

  return { flush, pause };
}
