"use client";

import type { LucideIcon } from "lucide-react";
import {
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  createContext,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// The host's hand on the lobby's people: pick a card up (anywhere but the
// face, which opens the person's quick card, and the menu key), carry it, and
// drop it on another card, a free seat or the watchers. The card lifts into a
// floating copy that trails the pointer on a spring and leans into the move;
// where it would land lights up with what the drop will do. On a phone the
// card is held a moment first, so a swipe still scrolls.

export type DragKind = "player" | "watcher";
export interface DragItem {
  kind: DragKind;
  id: string;
}

/** What a card can land on: a player, someone watching, a free seat (its index) or the watchers' area. */
export type DropKind = "player" | "watcher" | "seat" | "watchers";
export interface DropTarget {
  kind: DropKind;
  id: string;
}

/** What a drop there would do, as the target says it; null when it can't land there. */
export interface Verdict {
  label: string;
  icon: LucideIcon;
}

interface Lifted {
  item: DragItem;
  face: ReactNode;
  width: number;
  height: number;
}

interface Hover {
  target: DropTarget;
  verdict: Verdict;
}

interface BoardValue {
  enabled: boolean;
  lifted: DragItem | null;
  hover: Hover | null;
  /** Cards that can take the lifted one. */
  canTake: (target: DropTarget) => boolean;
  /** The card that just landed: hidden until its floating copy gets there. */
  landing: string | null;
  start: (
    e: ReactPointerEvent<HTMLElement>,
    item: DragItem,
    face: () => ReactNode,
  ) => void;
}

const BoardContext = createContext<BoardValue | null>(null);

const MOUSE_SLOP = 5;
const TOUCH_SLOP = 8;
const HOLD_MS = 260;
/** How near an edge of the scrolling list the pointer scrolls it. */
const EDGE = 56;

const same = (a: DropTarget | null, b: DropTarget | null) =>
  a?.kind === b?.kind && a?.id === b?.id;

function scrollerOf(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      p.scrollHeight > p.clientHeight
    )
      return p;
  }
  return null;
}

export function DragBoard({
  enabled,
  verdict,
  onDrop,
  children,
}: {
  enabled: boolean;
  /** What dropping `item` on `target` would do, or null. */
  verdict: (item: DragItem, target: DropTarget) => Verdict | null;
  /** Lands it: the lists move at once, the server follows. */
  onDrop: (item: DragItem, target: DropTarget) => void;
  children: ReactNode;
}) {
  const still = useReducedMotion() ?? false;
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [landing, setLanding] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const verdictRef = useRef(verdict);
  verdictRef.current = verdict;
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  // where the copy is: the pointer sets it, a spring trails it
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = still
    ? { stiffness: 2000, damping: 100 }
    : { stiffness: 900, damping: 55, mass: 0.7 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  // it leans into the move, and rights itself when the pointer stops
  const vx = useVelocity(sx);
  const lean = useSpring(
    useTransform(vx, [-1600, 0, 1600], still ? [0, 0, 0] : [-9, 0, 9], {
      clamp: true,
    }),
    { stiffness: 400, damping: 30 },
  );
  const scale = useMotionValue(1);

  const session = useRef<{
    item: DragItem;
    offset: { x: number; y: number };
    from: DOMRect;
    scroller: HTMLElement | null;
    pointer: { x: number; y: number };
    hover: Hover | null;
    frame: number;
    cleanup: () => void;
  } | null>(null);

  const hitTest = useCallback((px: number, py: number) => {
    const s = session.current;
    if (!s) return;
    let next: Hover | null = null;
    for (const el of document.elementsFromPoint(px, py)) {
      const kind = (el as HTMLElement).dataset?.drop as DropKind | undefined;
      if (!kind) continue;
      const target: DropTarget = {
        kind,
        id: (el as HTMLElement).dataset.dropId ?? "",
      };
      if (target.kind === s.item.kind && target.id === s.item.id) break;
      const v = verdictRef.current(s.item, target);
      if (v) {
        next = { target, verdict: v };
        break;
      }
      // a card that says no hides the area behind it
      if (target.kind !== "watchers") break;
    }
    if (!same(next?.target ?? null, s.hover?.target ?? null)) {
      s.hover = next;
      setHover(next);
    }
  }, []);

  const finish = useCallback(
    async (drop: boolean) => {
      const s = session.current;
      if (!s) return;
      session.current = null;
      s.cleanup();
      const target = drop ? s.hover?.target : undefined;
      setHover(null);
      setSettling(true);
      const fly = (to: { left: number; top: number }) =>
        Promise.all([
          animate(x, to.left, { duration: 0 }),
          animate(y, to.top, { duration: 0 }),
          animate(scale, 1, { duration: still ? 0 : 0.22, ease: "easeOut" }),
          new Promise((r) => setTimeout(r, still ? 0 : 260)),
        ]);
      if (target) {
        setLanding(s.item.id);
        dropRef.current(s.item, target);
        // the card is in its new place two frames later: fly there
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        const el = document.querySelector<HTMLElement>(
          `[data-person="${CSS.escape(s.item.id)}"]`,
        );
        const to = el?.getBoundingClientRect() ?? s.from;
        await fly(to);
      } else {
        await fly(s.from);
      }
      setLifted(null);
      setLanding(null);
      setSettling(false);
    },
    [x, y, scale, still],
  );

  const start = useCallback(
    (
      e: ReactPointerEvent<HTMLElement>,
      item: DragItem,
      face: () => ReactNode,
    ) => {
      if (!enabled || session.current || settling) return;
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      const el = e.currentTarget;
      const touch = e.pointerType === "touch";
      const origin = { x: e.clientX, y: e.clientY };
      let begun = false;
      let hold = 0;

      const begin = (px: number, py: number) => {
        begun = true;
        const from = el.getBoundingClientRect();
        const scroller = scrollerOf(el);
        x.jump(from.left + (px - origin.x));
        y.jump(from.top + (py - origin.y));
        sx.jump(from.left);
        sy.jump(from.top);
        scale.set(1);
        animate(scale, still ? 1 : 1.07, {
          type: "spring",
          stiffness: 500,
          damping: 22,
        });
        navigator.vibrate?.(8);
        const prevent = (ev: Event) => ev.preventDefault();
        window.addEventListener("touchmove", prevent, { passive: false });
        window.addEventListener("contextmenu", prevent);
        document.body.style.setProperty("cursor", "grabbing");
        document.body.style.setProperty("user-select", "none");
        const tick = () => {
          const s = session.current;
          if (!s) return;
          const box = s.scroller?.getBoundingClientRect();
          if (s.scroller && box) {
            const up = s.pointer.y - box.top;
            const down = box.bottom - s.pointer.y;
            const speed =
              up < EDGE
                ? -Math.ceil(((EDGE - up) / EDGE) * 14)
                : down < EDGE
                  ? Math.ceil(((EDGE - down) / EDGE) * 14)
                  : 0;
            if (speed) {
              s.scroller.scrollTop += speed;
              hitTest(s.pointer.x, s.pointer.y);
            }
          }
          s.frame = requestAnimationFrame(tick);
        };
        session.current = {
          item,
          offset: { x: origin.x - from.left, y: origin.y - from.top },
          from,
          scroller,
          pointer: { x: px, y: py },
          hover: null,
          frame: requestAnimationFrame(tick),
          cleanup: () => {
            const s = session.current;
            if (s) cancelAnimationFrame(s.frame);
            window.removeEventListener("touchmove", prevent);
            // the long press's menu stays off a moment longer
            setTimeout(
              () => window.removeEventListener("contextmenu", prevent),
              400,
            );
            document.body.style.removeProperty("cursor");
            document.body.style.removeProperty("user-select");
          },
        };
        setLifted({
          item,
          face: face(),
          width: from.width,
          height: from.height,
        });
        hitTest(px, py);
      };

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const dx = ev.clientX - origin.x;
        const dy = ev.clientY - origin.y;
        if (!begun) {
          const far = Math.hypot(dx, dy);
          if (touch) {
            // a swipe before the hold is a scroll
            if (far > TOUCH_SLOP) stop();
            return;
          }
          if (far < MOUSE_SLOP) return;
          begin(ev.clientX, ev.clientY);
        }
        const s = session.current;
        if (!s) return;
        s.pointer = { x: ev.clientX, y: ev.clientY };
        x.set(ev.clientX - s.offset.x);
        y.set(ev.clientY - s.offset.y);
        hitTest(ev.clientX, ev.clientY);
      };
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        stop();
        if (begun) void finish(ev.type === "pointerup");
      };
      const key = (ev: KeyboardEvent) => {
        if (ev.key !== "Escape") return;
        stop();
        if (begun) void finish(false);
      };
      const stop = () => {
        window.clearTimeout(hold);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        window.removeEventListener("keydown", key);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      window.addEventListener("keydown", key);
      if (touch)
        hold = window.setTimeout(() => {
          begin(origin.x, origin.y);
          const s = session.current;
          if (s) {
            x.set(origin.x - s.offset.x);
            y.set(origin.y - s.offset.y);
          }
        }, HOLD_MS);
    },
    [enabled, settling, x, y, sx, sy, scale, still, hitTest, finish],
  );

  // leaving the page mid-drag lets go
  useEffect(() => () => session.current?.cleanup(), []);

  const value = useMemo<BoardValue>(
    () => ({
      enabled,
      lifted: lifted?.item ?? null,
      hover,
      landing,
      canTake: (target) =>
        !!lifted &&
        !settling &&
        !(target.kind === lifted.item.kind && target.id === lifted.item.id) &&
        !!verdictRef.current(lifted.item, target),
      start,
    }),
    [enabled, lifted, hover, landing, settling, start],
  );

  return (
    <BoardContext value={value}>
      {children}
      {lifted
        ? createPortal(
            <m.div
              aria-hidden="true"
              style={{
                x: sx,
                y: sy,
                rotate: lean,
                scale,
                width: lifted.width,
                height: lifted.height,
              }}
              initial={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
              animate={{
                boxShadow: settling
                  ? "0 2px 6px rgba(20,16,40,0.10)"
                  : "0 22px 44px -12px rgba(20,16,40,0.35), 0 6px 14px rgba(20,16,40,0.12)",
              }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none fixed top-0 left-0 z-[60] origin-center cursor-grabbing rounded-md"
            >
              {lifted.face}
            </m.div>,
            document.body,
          )
        : null}
    </BoardContext>
  );
}

const NONE: BoardValue = {
  enabled: false,
  lifted: null,
  hover: null,
  landing: null,
  canTake: () => false,
  start: () => {},
};

/** The board around a card; a quiet one outside any. */
export const useBoard = () => useContext(BoardContext) ?? NONE;

/** Whether `target` is where the lifted card would land now, and what it would do. */
export function useDropState(target: DropTarget) {
  const board = useBoard();
  const over = same(board.hover?.target ?? null, target);
  return {
    over,
    verdict: over ? (board.hover?.verdict ?? null) : null,
    /** Some card is lifted and could land here. */
    open: board.canTake(target),
  };
}

/** The props a drop target's element carries, so the board finds it under the pointer. */
export const dropProps = (target: DropTarget) => ({
  "data-drop": target.kind,
  "data-drop-id": target.id,
});
