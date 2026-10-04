"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CardContent, SearchItem } from "@/game/character-search";
import type { PickView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import {
  type DraftCard,
  draftKey,
  fromDraft,
  putDraft,
  saveOutcome,
  toDraft,
} from "./draft-api";

/** Quiet time after the last keystroke before the card is saved. */
export const DRAFT_DEBOUNCE_MS = 600;
/** The last save, if the card changed since the last accepted one: this long before the deadline… */
export const FINAL_FLUSH_MS = 1500;
/** …plus up to this much, so the pickers' last saves don't land together. */
export const FINAL_JITTER_MS = 400;
/** A save that failed for a passing reason (a lost race, the rate limit, the network) is tried again after this. */
export const DRAFT_RETRY_MS = 1000;

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
  retry: number;
  /** Bumped when the server's draft changed under a save in flight: its answer no longer says what the server holds. */
  epoch: number;
  /** Random is drawing: the server's draft may turn into the draw at any moment. */
  drawing: number;
  /** A save went out (or was in flight) while Random drew: the two raced on the server. */
  raced: boolean;
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
 * draft); `pause` holds the autosave while Confirm runs; `drawing` and
 * `drawn` bracket a Random draw, which the server saves as the draft itself.
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
    retry: 0,
    epoch: 0,
    drawing: 0,
    raced: false,
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
    window.clearTimeout(s.retry);
    if (s.drawing) s.raced = true;
    const epoch = s.epoch;
    s.inflight = putDraft(room, draft).then((r) => {
      const outcome = saveOutcome(r);
      if (outcome === "saved") {
        if (epoch === s.epoch) s.accepted = key;
      } else if (outcome === "closed") {
        // confirmed, out of time, not seated: nothing more to save
        s.stopped = true;
      } else {
        // still unsaved: the next change, the final flush or this retry sends it again
        s.retry = window.setTimeout(() => void send(), DRAFT_RETRY_MS);
      }
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

  /** Random starts drawing: hold the server's drafts until it is back. */
  const drawing = useCallback(() => {
    const s = saver.current as Saver;
    if (!s.drawing) s.raced = s.inflight !== null;
    s.drawing++;
  }, []);

  /**
   * Random is back. `card` is the draw the server saved as the draft (null
   * when it failed); `kept` says whether the card shows it, or moved on
   * meanwhile (a hand card, typing). Call it before showing the draw.
   */
  const drawn = useCallback(
    (card: DraftCard | null, kept: boolean) => {
      const s = saver.current as Saver;
      s.drawing = Math.max(0, s.drawing - 1);
      if (!card) return;
      const key = draftKey(card);
      s.known.add(key);
      if (kept && !s.raced) {
        s.accepted = key;
        return;
      }
      // The server's draft is now the draw, or a save of ours that raced it:
      // what saves in flight report no longer holds. Save the card again.
      s.epoch++;
      if (kept) {
        // nothing saved matches: the autosave sends the draw once the card shows it
        s.accepted = "\u0000";
        return;
      }
      s.accepted = key;
      void send();
    },
    [send],
  );

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
    if (!s.restored || !now.active || s.drawing || s.known.has(serverKey))
      return;
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
    // a restored card is what the server holds (a draw: see drawn)
    if (content.kind === "picked" && content.via === "restore") {
      s.known.add(key);
      return;
    }
    if (key === s.accepted || s.paused) return;
    const { deadline: end, clock: now } = latest.current;
    // in the last moments a debounce would outlast the clock
    const late = end !== null && now.now() >= end - FINAL_FLUSH_MS;
    const typing =
      focused &&
      !pictured &&
      !late &&
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
    () => () => {
      const s = saver.current as Saver;
      window.clearTimeout(s.timer);
      window.clearTimeout(s.retry);
    },
    [],
  );

  return { flush, pause, drawing, drawn };
}
