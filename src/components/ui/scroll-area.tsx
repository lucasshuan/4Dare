"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** What the thumb needs from whatever scrolls: a box, the page, anything. */
interface Scroller {
  /** Fires when the scroll position changes. */
  events: EventTarget;
  top: () => number;
  /** The visible height. */
  view: () => number;
  /** The whole height. */
  total: () => number;
  scrollTo: (top: number) => void;
}

interface Thumb {
  top: number;
  height: number;
}

const forElement = (el: HTMLElement): Scroller => ({
  events: el,
  top: () => el.scrollTop,
  view: () => el.clientHeight,
  total: () => el.scrollHeight,
  scrollTo: (top) => {
    el.scrollTop = top;
  },
});

const forPage = (): Scroller => {
  const root = document.documentElement;
  return {
    events: window,
    top: () => window.scrollY,
    view: () => root.clientHeight,
    total: () => root.scrollHeight,
    scrollTo: (top) => window.scrollTo({ top }),
  };
};

/**
 * The floating bar's thumb for a scroller: it follows the scroll and can be
 * dragged. `watch` are the boxes whose size changes it. The bar shows only
 * when there is something to scroll.
 */
function useThumb(make: () => Scroller | null, watch: () => Element[]) {
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const scroller = useRef<Scroller | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: both are read once, on mount
  useEffect(() => {
    const s = make();
    if (!s) return;
    scroller.current = s;
    const update = () => {
      const view = s.view();
      const total = s.total();
      if (total <= view + 1) return setThumb(null);
      const height = Math.max(32, (view / total) * view);
      setThumb({ top: (s.top() / (total - view)) * (view - height), height });
    };
    update();
    s.events.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // the box and what's inside it both change the bar
    const sizes = new ResizeObserver(update);
    for (const el of watch()) sizes.observe(el);
    return () => {
      s.events.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      sizes.disconnect();
    };
  }, []);

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = scroller.current;
    if (!s || !thumb) return;
    e.preventDefault();
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startTop = s.top();
    const ratio = (s.total() - s.view()) / (s.view() - thumb.height);
    const move = (ev: PointerEvent) => {
      s.scrollTo(startTop + (ev.clientY - startY) * ratio);
    };
    const up = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  };

  return { thumb, drag };
}

function ThumbBar({
  thumb,
  drag,
  className,
}: {
  thumb: Thumb | null;
  drag: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Where it sits: absolute in a box, fixed on the page. */
  className: string;
}) {
  if (!thumb) return null;
  return (
    <div
      aria-hidden
      onPointerDown={drag}
      style={{ top: thumb.top, height: thumb.height }}
      className={cn(
        "group right-0 z-20 flex w-3 cursor-default touch-none justify-end",
        className,
      )}
    >
      <span className="w-1.5 rounded-pill bg-(--scroll-thumb) transition-[width,background-color] duration-150 group-hover:w-2 group-hover:bg-(--scroll-thumb-hover) group-active:w-2 group-active:bg-(--scroll-thumb-hover)" />
    </div>
  );
}

/**
 * A vertical scroller whose bar floats over the content instead of taking a
 * strip of its own (the browsers' bars leave one beside a full-width cover).
 * The thumb follows the scroll and can be dragged; wheel, touch and keys
 * scroll as usual. `className` sizes the box (give it a height: `flex-1` in
 * a column, `max-h-*`); `contentClassName` lays out what's inside.
 */
export function ScrollArea({
  className,
  contentClassName,
  children,
}: {
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { thumb, drag } = useThumb(
    () => (ref.current ? forElement(ref.current) : null),
    () => (ref.current ? [ref.current, ...ref.current.children] : []),
  );

  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      {/* flex, not h-full: a box with only a max height scrolls too */}
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className={contentClassName}>{children}</div>
      </div>
      <ThumbBar thumb={thumb} drag={drag} className="absolute" />
    </div>
  );
}

/**
 * The same bar for the page itself, on screens with a mouse: the browser's own
 * bar hides (html[data-floating-bar]), so it no longer takes a strip beside a
 * full-width cover. Window scrolling is untouched.
 */
export function PageScrollbar() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const sync = () => setOn(fine.matches);
    sync();
    fine.addEventListener("change", sync);
    return () => fine.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!on) return;
    document.documentElement.dataset.floatingBar = "";
    return () => {
      delete document.documentElement.dataset.floatingBar;
    };
  }, [on]);
  return on ? <PageThumb /> : null;
}

function PageThumb() {
  const { thumb, drag } = useThumb(forPage, () => [
    document.documentElement,
    document.body,
  ]);
  return <ThumbBar thumb={thumb} drag={drag} className="fixed" />;
}
