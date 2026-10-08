"use client";

import { m, useAnimate, useReducedMotionConfig } from "motion/react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRoomContext } from "@/features/data/room-context";
import { countUnread } from "@/game/chat";
import { cn } from "@/lib/cn";
import { insideChat } from "@/lib/focus";
import { useMedia } from "@/lib/hooks/use-media";
import { useClock } from "@/lib/hooks/use-server-clock";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { useSettings } from "@/lib/settings";
import { playSound } from "@/lib/sound";
import { type Bubble, ChatBubbles } from "./chat-bubbles";
import { ChatCompose } from "./chat-compose";
import { ChatHead } from "./chat-head";
import { ChatList } from "./chat-list";
import {
  ANNOUNCE_MS,
  BUBBLE_MS,
  HOP,
  HOP_TIMES,
  isUnread,
  lastTextLine,
  newestId,
  OPEN_SHARE,
  readSeen,
  SHUT,
  unreadSenders,
  writeSeen,
} from "./chat-ui";
import { useChat } from "./use-chat";

/** Below `sm`: the bar along the bottom instead of the 340 px tab. */
const PHONE = "(max-width: 639.98px)";
/** A mouse or trackpad: opening the chat may focus its field (a touch screen would raise the keyboard). */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * The room chat: a tab at the bottom right on wide windows, a bar along the
 * bottom on phones. Fixed at z-[35], after the screens in the DOM, its root
 * marked `data-chat` (see src/lib/focus.ts); while mounted it sets `--dock`
 * on <html> so screens and toasts keep clear of it. Mounted by RoomStage in
 * the lobby, the match and the results. It starts folded (the body is not
 * rendered then); a message from someone else while folded turns the head
 * blue, counts, hops the tab and, on desktop, pops a bubble above it.
 */
export function RoomChat() {
  const t = useTranslations("chat");
  const { code, me, serverTime, playerById, view } = useRoomContext();
  // What for?'s presenter knows the mission: a word against telling
  const hostHint = view.lu?.presenterId === me.id && view.phase !== "finished";
  const clock = useClock();
  const { messages, send, retry, status } = useChat(code);
  const phone = useMedia(PHONE);
  const { chatBubbles } = useSettings();
  const finePointer = useMedia(FINE_POINTER);
  const reduced = useReducedMotionConfig() ?? false;
  const name = useDisplayName();
  const bodyId = useId();
  const headRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hop, animate] = useAnimate<HTMLDivElement>();

  const [open, setOpen] = useState(false);
  // the body stays while the tab folds, and goes once it has
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  // the last line read here (localStorage); null until the first load
  const [seen, setSeen] = useState<number | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pop, setPop] = useState(0);
  const [said, say] = useAnnouncer();
  const focus = useFocusPlace();
  const keyboard = useKeyboard(phone && focus === "chat");
  const windowHeight = useWindowHeight();

  const now = serverTime();
  const newest = newestId(messages);

  // The first load marks everything there as read (no flood), unless this
  // browser has read the room before.
  useEffect(() => {
    if (status !== "ready" || seen !== null) return;
    const stored = readSeen(code);
    const start = stored ?? newest;
    if (stored === null) writeSeen(code, start);
    setSeen(start);
  }, [status, seen, code, newest]);

  // Open, everything is read as it comes.
  useEffect(() => {
    if (!open || seen === null || newest <= seen) return;
    writeSeen(code, newest);
    setSeen(newest);
  }, [open, seen, newest, code]);

  // New lines from others while folded: a sound plays, the tab hops, the
  // count pops, a bubble shows (desktop) and the live region says it.
  const known = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (seen === null) return;
    const at = serverTime();
    if (known.current === null) {
      known.current = new Set(
        messages.filter((m) => m.id > 0).map((m) => m.id),
      );
      // a line that came in just before the chat loaded (a reload) still pops
      if (!open && !phone)
        setBubbles(
          messages
            .filter((m) => isUnread(m, seen, me.id) && at - m.at < BUBBLE_MS)
            .map((m) => ({ line: m, until: m.at + BUBBLE_MS })),
        );
      return;
    }
    const knownIds = known.current;
    const fresh = messages.filter((m) => m.id > 0 && !knownIds.has(m.id));
    for (const m of fresh) knownIds.add(m.id);
    const arrivals = open ? [] : fresh.filter((m) => isUnread(m, seen, me.id));
    const latest = arrivals[arrivals.length - 1];
    if (!latest) return;
    playSound("chat");
    setPop((n) => n + 1);
    if (!reduced && hop.current)
      animate(
        hop.current,
        { y: HOP },
        { duration: 0.6, times: HOP_TIMES, ease: "linear" },
      );
    if (!phone)
      // a burst keeps the newest few, so the stack never climbs off the window
      setBubbles((b) =>
        [
          ...b,
          ...arrivals.map((m) => ({ line: m, until: at + BUBBLE_MS })),
        ].slice(-3),
      );
    const p = playerById(latest.by) ?? latest.author;
    say(t("line", { name: p ? name(p) : "", text: latest.text ?? "" }));
  }, [
    messages,
    seen,
    open,
    phone,
    reduced,
    me.id,
    serverTime,
    playerById,
    hop,
    animate,
    say,
    t,
    name,
  ]);

  // Bubbles leave after their time (a stopped lab clock keeps them).
  useEffect(() => {
    if (bubbles.length === 0 || clock.frozen) return;
    const next = Math.min(...bubbles.map((b) => b.until));
    const wait = (next - serverTime()) / (clock.rate || 1);
    const id = window.setTimeout(() => {
      const at = serverTime();
      setBubbles((b) => b.filter((x) => x.until > at));
    }, Math.max(0, wait) + 10);
    return () => window.clearTimeout(id);
  }, [bubbles, clock.frozen, clock.rate, serverTime]);

  const toggle = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      setExpanded(true);
      setBubbles([]);
    }
  }, []);

  // A mouse opens straight into the field; a touch screen waits for a tap.
  useEffect(() => {
    if (open && finePointer) inputRef.current?.focus({ preventScroll: true });
  }, [open, finePointer]);

  // Phones: while another field has focus the folded bar hides, so it never
  // rides the keyboard over the pick, ask or guess field.
  const hidden = phone && !open && focus === "other";
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--dock",
      hidden
        ? "0px"
        : phone
          ? `calc(${SHUT.phone}px + env(safe-area-inset-bottom))`
          : `${SHUT.desktop}px`,
    );
  }, [hidden, phone]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--dock");
    },
    [],
  );

  // Escape folds the open chat while the focus is inside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !insideChat(e.target)) return;
      toggle(false);
      headRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  const unread =
    open || seen === null ? 0 : countUnread(messages, seen, me.id, now);
  const faces =
    open || seen === null ? [] : unreadSenders(messages, seen, me.id);
  const shut = phone ? SHUT.phone : SHUT.desktop;
  let tall = Math.round(
    windowHeight * (phone ? OPEN_SHARE.phone : OPEN_SHARE.desktop),
  );
  // the keyboard is up: the sheet rides above it and fits what is left
  if (keyboard.lift > 0)
    tall = Math.min(tall, Math.max(shut, keyboard.room - 16));

  return (
    <div
      data-chat
      style={keyboard.lift > 0 ? { bottom: keyboard.lift } : undefined}
      className={cn(
        "fixed right-4 bottom-0 z-[35] w-[340px] max-sm:inset-x-2 max-sm:w-auto",
        hidden && "hidden",
      )}
    >
      {phone || !chatBubbles ? null : <ChatBubbles bubbles={bubbles} />}
      <div
        ref={hop}
        className={cn(
          unread > 0 && !reduced && "animate-nudge motion-reduce:animate-none",
        )}
      >
        <m.aside
          aria-label={t("title")}
          initial={false}
          animate={{ height: open ? tall : shut }}
          transition={
            reduced
              ? { duration: 0.2, ease: "easeOut" }
              : {
                  duration: 0.5,
                  ease: open ? gs.backOut(1.15) : gs.p3InOut,
                }
          }
          onAnimationComplete={() => {
            if (!open) setExpanded(false);
          }}
          className="box-content flex flex-col overflow-hidden rounded-t-[20px] border border-line border-b-0 bg-surface text-ink shadow-dock max-sm:rounded-t-[22px] max-sm:pb-[env(safe-area-inset-bottom)]"
        >
          <ChatHead
            ref={headRef}
            open={open}
            unread={unread}
            faces={faces}
            last={lastTextLine(messages)}
            phone={phone}
            bodyId={bodyId}
            pop={pop}
            onToggle={() => toggle(!open)}
          />
          {expanded ? (
            <div
              id={bodyId}
              className="flex min-h-0 flex-1 flex-col border-line border-t"
            >
              <ChatList messages={messages} onRetry={retry} />
              <ChatCompose
                ref={inputRef}
                hint={hostHint ? t("hostHint") : null}
                text={draft}
                onText={setDraft}
                onSend={send}
              />
            </div>
          ) : null}
        </m.aside>
      </div>
      <p aria-live="polite" className="sr-only">
        {open ? "" : said}
      </p>
    </div>
  );
}

/** The last thing to announce, at most one every ANNOUNCE_MS (the newest wins). */
function useAnnouncer() {
  const [said, setSaid] = useState("");
  const last = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const say = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    const wait = Math.max(0, last.current + ANNOUNCE_MS - Date.now());
    timer.current = window.setTimeout(() => {
      last.current = Date.now();
      setSaid(text);
    }, wait);
  }, []);
  return [said, say] as const;
}

const NOT_TYPED = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Whether this element raises a keyboard. */
function editable(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NOT_TYPED.has(el.type);
}

/** Where the typing focus is: nowhere, in the chat, or in another field. */
function useFocusPlace(): "none" | "chat" | "other" {
  const [place, setPlace] = useState<"none" | "chat" | "other">("none");
  useEffect(() => {
    let frame = 0;
    // read after the focus has moved (focusout fires before the next focusin)
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = document.activeElement;
        setPlace(!editable(el) ? "none" : insideChat(el) ? "chat" : "other");
      });
    };
    read();
    document.addEventListener("focusin", read);
    document.addEventListener("focusout", read);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", read);
      document.removeEventListener("focusout", read);
    };
  }, []);
  return place;
}

/**
 * While `active` (the chat's field has focus on a phone): how far the
 * on-screen keyboard covers the bottom of the layout viewport, and the
 * height left visible above it.
 */
function useKeyboard(active: boolean) {
  const [state, setState] = useState({ lift: 0, room: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setState({ lift: 0, room: 0 });
      return;
    }
    const update = () =>
      setState({
        lift: Math.max(
          0,
          Math.round(window.innerHeight - vv.height - vv.offsetTop),
        ),
        room: Math.round(vv.height),
      });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return state;
}

const onResize = (change: () => void) => {
  window.addEventListener("resize", change);
  return () => window.removeEventListener("resize", change);
};

/** The window's inner height, following resizes. */
function useWindowHeight() {
  return useSyncExternalStore(
    onResize,
    () => window.innerHeight,
    () => 800,
  );
}
