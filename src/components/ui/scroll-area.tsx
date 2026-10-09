"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A vertical scroller whose bar floats over the content instead of taking a
 * strip of its own (the browsers' bars leave one beside a full-width cover).
 * The thumb follows the scroll and can be dragged; wheel, touch and keys
 * scroll as usual.
 */
export function ScrollArea({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight + 1) return setThumb(null);
      const height = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
      const top =
        (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height);
      setThumb({ top, height });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // the box and what's inside it both change the bar
    const sizes = new ResizeObserver(update);
    sizes.observe(el);
    if (el.firstElementChild) sizes.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      sizes.disconnect();
    };
  }, []);

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !thumb) return;
    e.preventDefault();
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startTop = el.scrollTop;
    const ratio =
      (el.scrollHeight - el.clientHeight) / (el.clientHeight - thumb.height);
    const move = (ev: PointerEvent) => {
      el.scrollTop = startTop + (ev.clientY - startY) * ratio;
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

  return (
    <div className={cn("relative min-h-0", className)}>
      <div
        ref={ref}
        className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div>{children}</div>
      </div>
      {thumb ? (
        <div
          aria-hidden
          onPointerDown={drag}
          style={{ top: thumb.top, height: thumb.height }}
          className="group absolute right-0 z-20 flex w-3 cursor-default touch-none justify-end"
        >
          <span className="w-1.5 rounded-pill bg-(--scroll-thumb) transition-[width,background-color] duration-150 group-hover:w-2 group-hover:bg-(--scroll-thumb-hover) group-active:w-2 group-active:bg-(--scroll-thumb-hover)" />
        </div>
      ) : null}
    </div>
  );
}
