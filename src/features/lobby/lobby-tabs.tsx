"use client";

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
import { dur, ease } from "@/lib/motion";

const spring = { type: "spring", stiffness: 480, damping: 34 } as const;

export interface LobbyTab {
  key: string;
  label: string;
  /** In a chip beside the label. */
  count: string;
  panel: ReactNode;
}

/**
 * The lobby's lists (players, past matches) under tabs that read as headings.
 * A sky bar slides under the chosen one; its panel slides in from the side it
 * was picked on while the other slides out. Arrow keys, Home and End move
 * between the tabs.
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
  const [current, setCurrent] = useState(tabs[0].key);
  // 1 when moving right, -1 left: the panels slide that way
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
    const next =
      e.key === "ArrowRight"
        ? from === last
          ? 0
          : from + 1
        : e.key === "ArrowLeft"
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

  const shift = still ? 0 : 28;
  const slide = {
    enter: (d: number) => ({ opacity: 0, x: d * shift }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: dur.base, ease: ease.soft },
    },
    exit: (d: number) => ({
      opacity: 0,
      x: -d * shift,
      transition: { duration: dur.fast, ease: ease.soft },
    }),
  };

  return (
    // in a parent of fixed height the panel takes what the tab bar leaves and scrolls inside
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex shrink-0 gap-6 border-line border-b"
      >
        {/* the bar's layoutId needs the layout features */}
        <LayoutMotion>
          {tabs.map((tab, i) => {
            const on = i === index;
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
                  "relative -mb-px flex items-center gap-2 pb-3 font-semibold text-xl transition-colors duration-200 ease-soft",
                  on ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {tab.label}
                <m.span
                  // a new count pops in
                  key={tab.count}
                  initial={still ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                  className={cn(
                    "rounded-pill px-2 font-semibold text-xs/5 tabular-nums transition-colors duration-200 ease-soft",
                    on ? "bg-sky-soft text-sky" : "bg-sunken text-ink-muted",
                  )}
                >
                  {tab.count}
                </m.span>
                {on ? (
                  <m.span
                    layoutId={`${id}-bar`}
                    transition={spring}
                    className="absolute inset-x-0 bottom-0 h-[3px] rounded-pill bg-sky"
                  />
                ) : null}
              </button>
            );
          })}
        </LayoutMotion>
      </div>
      {/* both panels share one cell while they swap, so the page does not jump */}
      <div className="grid min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain">
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
