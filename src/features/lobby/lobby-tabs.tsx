"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { dur, ease } from "@/lib/motion";

const spring = { type: "spring", stiffness: 480, damping: 34 } as const;

/** Where the tabs stand in a rail on the left: phones keep them in a row on top. */
const RAIL = "(min-width: 640px)";

export interface LobbyTab {
  key: string;
  label: string;
  icon: LucideIcon;
  /** In a chip beside the label (none for settings). */
  count?: string;
  panel: ReactNode;
}

/**
 * The lobby's panel of tabs (players, past matches, the room's settings), as
 * the profile's: a rail of icon-over-label keys on the left, a row of them on
 * top on phones. A sunken pill slides to the chosen one; its panel slides in from the
 * side it was picked on while the other slides out. Arrow keys, Home and End
 * move between the tabs.
 */
export function LobbyTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: LobbyTab[];
}) {
  const id = useId();
  const still = useReducedMotion() ?? false;
  const rail = useMedia(RAIL);
  const [current, setCurrent] = useState(tabs[0].key);
  // 1 when moving on (down the rail, right on phones), -1 back: the panels slide that way
  const [dir, setDir] = useState(1);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === current),
  );
  const active = tabs[index];

  const choose = (i: number) => {
    if (i === index) return;
    setDir(i > index ? 1 : -1);
    setCurrent(tabs[i].key);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const last = tabs.length - 1;
    const from = buttons.current.indexOf(e.target as HTMLButtonElement);
    if (from < 0) return;
    const on = rail ? "ArrowDown" : "ArrowRight";
    const back = rail ? "ArrowUp" : "ArrowLeft";
    const next =
      e.key === on
        ? from === last
          ? 0
          : from + 1
        : e.key === back
          ? from === 0
            ? last
            : from - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    choose(next);
    buttons.current[next]?.focus();
  };

  const shift = still ? 0 : 24;
  const along = (v: number) => (rail ? { x: 0, y: v } : { x: v, y: 0 });
  const slide = {
    enter: (d: number) => ({ opacity: 0, ...along(d * shift) }),
    center: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: dur.base, ease: ease.soft },
    },
    exit: (d: number) => ({
      opacity: 0,
      ...along(-d * shift),
      transition: { duration: dur.fast, ease: ease.soft },
    }),
  };

  return (
    // in a parent of fixed height the panel takes what the tabs leave and scrolls inside
    <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-5">
      <div
        role="tablist"
        aria-label={label}
        aria-orientation={rail ? "vertical" : "horizontal"}
        onKeyDown={onKeyDown}
        className="grid shrink-0 auto-cols-fr grid-flow-col gap-1 max-sm:border-line max-sm:border-b max-sm:pb-3 sm:flex sm:w-[88px] sm:flex-col sm:self-start"
      >
        {/* the pill's layoutId needs the layout features */}
        <LayoutMotion>
          {tabs.map((tab, i) => {
            const on = i === index;
            const Icon = tab.icon;
            // one height for all, with a count or without
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${tab.key}`}
                aria-selected={on}
                aria-controls={`${id}-panel-${tab.key}`}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(i)}
                className={cn(
                  "group relative flex h-[88px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 font-semibold text-[12px] leading-tight transition-colors duration-200 ease-soft",
                  on ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {on ? (
                  <m.span
                    layoutId={`${id}-pill`}
                    transition={spring}
                    className="absolute inset-0 rounded-lg bg-sunken"
                  />
                ) : (
                  <span className="absolute inset-0 rounded-lg transition-colors duration-200 ease-soft group-hover:bg-sunken/60" />
                )}
                <Icon
                  className={cn(
                    "relative size-6 transition-colors duration-200 ease-soft",
                    on && "text-sky",
                  )}
                  strokeWidth={1.75}
                />
                <span className="relative">{tab.label}</span>
                {tab.count ? (
                  <m.span
                    // a new count pops in
                    key={tab.count}
                    initial={still ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={spring}
                    className={cn(
                      "relative rounded-pill px-2 font-semibold text-xs/5 tabular-nums transition-colors duration-200 ease-soft",
                      on ? "bg-sky-soft text-sky" : "bg-sunken text-ink-muted",
                    )}
                  >
                    {tab.count}
                  </m.span>
                ) : null}
              </button>
            );
          })}
        </LayoutMotion>
      </div>
      {/* both panels share one cell while they swap, so the page does not jump */}
      <div className="grid min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain">
        <AnimatePresence initial={false} custom={dir}>
          <m.div
            key={active.key}
            role="tabpanel"
            id={`${id}-panel-${active.key}`}
            aria-labelledby={`${id}-tab-${active.key}`}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="min-w-0 [grid-area:1/1]"
          >
            {active.panel}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
