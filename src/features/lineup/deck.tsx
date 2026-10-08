"use client";

// Boards one at a time, big enough to read: the one in the middle whole, the
// edges of its neighbours peeking on both sides so it is plain there are
// more. A finger slide on a phone (the browser's own scroll snapping, no
// library), arrows and the ← → keys on a computer. The vote, the tiebreak and
// the break all use it.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";

export interface DeckItem {
  id: string;
  /** The slide: a board in a FitBoard fills it. */
  slide: ReactNode;
  /** Under the deck while this one is in the middle. */
  cap?: ReactNode;
  /** A dot in this colour (your vote). */
  mark?: string | null;
}

/** As wide as the window and its height allow (a board is 2:3), never wider than 400. */
const SLIDE_W =
  "min(76vw, calc((100dvh - var(--deck-chrome, 300px)) * 0.6667), 400px)";

export function BoardDeck({
  items,
  start = 0,
  onActive,
  onPick,
  className,
}: {
  items: DeckItem[];
  /** The slide it opens on. */
  start?: number;
  onActive?: (index: number) => void;
  /** A tap on the slide in the middle. */
  onPick?: (index: number) => void;
  className?: string;
}) {
  const t = useTranslations("lineup.deck");
  const view = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(start);
  const touch = useMedia("(pointer: coarse)");
  const [hint, setHint] = useState(true);

  const go = useCallback((i: number, smooth = true) => {
    const el = view.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // open on `start` without a slide past the others
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on mount
  useEffect(() => {
    go(start, false);
    setActive(start);
  }, []);

  // the slide nearest the middle is the active one
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let gap = Infinity;
        for (let i = 0; i < el.children.length; i++) {
          const c = el.children[i] as HTMLElement;
          const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
          if (d < gap) {
            gap = d;
            best = i;
          }
        }
        setActive((a) => (a === best ? a : best));
        setHint(false);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    onActive?.(active);
  }, [active, onActive]);

  // ← → turn the deck (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey)
        return;
      if (e.key === "ArrowLeft") go(Math.max(0, active - 1));
      else if (e.key === "ArrowRight")
        go(Math.min(items.length - 1, active + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items.length, go]);

  // on a phone, the deck says it moves: a little push towards the next and back
  useEffect(() => {
    if (!touch || items.length < 2) return;
    const el = view.current;
    if (!el) return;
    const from = el.scrollLeft;
    const ids = [
      window.setTimeout(
        () => el.scrollTo({ left: from + 48, behavior: "smooth" }),
        700,
      ),
      window.setTimeout(
        () => el.scrollTo({ left: from, behavior: "smooth" }),
        1100,
      ),
    ];
    return () => ids.forEach(window.clearTimeout);
  }, [touch, items.length]);

  const arrow = (dir: -1 | 1) => {
    const to = active + dir;
    const off = to < 0 || to >= items.length;
    return (
      <button
        type="button"
        aria-label={dir < 0 ? t("prev") : t("next")}
        disabled={off}
        onClick={() => go(to)}
        className="hidden size-13 shrink-0 place-items-center rounded-pill bg-surface text-ink shadow-card transition-opacity disabled:opacity-30 sm:grid"
      >
        {dir < 0 ? (
          <ChevronLeft className="size-6" strokeWidth={2.6} />
        ) : (
          <ChevronRight className="size-6" strokeWidth={2.6} />
        )}
      </button>
    );
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-2.5", className)}>
      <div className="flex w-full items-center justify-center gap-3.5">
        {arrow(-1)}
        <div
          ref={view}
          className="flex w-full min-w-0 max-w-[1100px] snap-x snap-mandatory gap-[min(4vw,34px)] overflow-x-auto overscroll-x-contain py-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingInline: `calc((100% - ${SLIDE_W}) / 2)`,
            maskImage:
              "linear-gradient(90deg, rgba(0,0,0,0.25), #000 12%, #000 88%, rgba(0,0,0,0.25))",
          }}
        >
          {items.map((it, i) => (
            <div
              key={it.id}
              className={cn(
                "shrink-0 snap-center transition-[scale,opacity] duration-300 ease-soft",
                i === active ? "scale-100" : "scale-[0.86] opacity-50",
              )}
              style={{ width: SLIDE_W }}
            >
              {/* the one in the middle takes a tap; a neighbour comes to the middle */}
              <button
                type="button"
                className="block w-full cursor-pointer text-left"
                onClick={() => (i === active ? onPick?.(i) : go(i))}
                tabIndex={i === active ? 0 : -1}
                aria-current={i === active}
              >
                {it.slide}
              </button>
            </div>
          ))}
        </div>
        {arrow(1)}
      </div>
      <div className="grid place-items-center">
        {items[active]?.cap ?? null}
      </div>
      {items.length > 1 ? (
        <div className="flex h-3 items-center gap-[7px]" aria-hidden="true">
          {items.map((it, i) => (
            <i
              key={it.id}
              className={cn(
                "block h-[9px] rounded-pill transition-[width,opacity] duration-200",
                i === active ? "w-[26px] opacity-85" : "w-[9px] opacity-30",
              )}
              style={{
                background: it.mark ?? "currentColor",
                ...(it.mark ? { opacity: 1 } : null),
              }}
            />
          ))}
        </div>
      ) : null}
      {touch && hint && items.length > 1 ? (
        <span className="inline-flex items-center gap-1.5 font-bold text-[13px] opacity-75">
          <span aria-hidden="true">👆</span>
          {t("swipe")}
        </span>
      ) : null}
    </div>
  );
}
