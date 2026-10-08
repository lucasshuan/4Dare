"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Game cards side by side, scrolling sideways (snap, swipe, arrows) instead of
 * wrapping, so more games never push the page into a vertical scroll; phones
 * get a grid of two a row.
 */
export function GamesCarousel({ children }: { children: ReactNode }) {
  const t = useTranslations("home.games");
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  // Only a row wider than the screen scrolls.
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth + 4);
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const step = (direction: 1 | -1) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({
      left: direction * card.offsetWidth,
      behavior: "smooth",
    });
  };

  const arrow = (direction: 1 | -1) => (
    <button
      type="button"
      aria-label={direction === 1 ? t("next") : t("previous")}
      onClick={() => step(direction)}
      className={cn(
        "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-pill bg-surface text-ink shadow-pop transition-[opacity,transform] duration-200 ease-soft hover:scale-105 max-sm:hidden",
        direction === 1 ? "-right-3" : "-left-3",
      )}
    >
      {direction === 1 ? (
        <ChevronRight className="size-5" strokeWidth={2} />
      ) : (
        <ChevronLeft className="size-5" strokeWidth={2} />
      )}
    </button>
  );

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={measure}
        className={cn(
          "group/games grid grid-cols-2 gap-[3px] sm:-mx-8 sm:flex sm:gap-0 sm:px-8",
          overflowing
            ? "snap-x snap-mandatory scroll-px-4 overflow-x-auto scroll-smooth sm:scroll-px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "overflow-visible",
        )}
      >
        {Children.map(children, (child) => (
          <div className="shrink-0 snap-start">{child}</div>
        ))}
      </div>
      {edges.start ? null : arrow(-1)}
      {edges.end ? null : arrow(1)}
    </div>
  );
}
