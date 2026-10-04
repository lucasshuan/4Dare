"use client";

import type { AnimationSequence } from "motion/react";
import { useRef } from "react";
import { gs, mirror } from "@/lib/motion";
import { layoutRect, useStageTimeline } from "../use-stage-timeline";

const DOTS = ["var(--seat-1)", "var(--seat-2)", "var(--seat-3)"];

/**
 * A 4-second test scene for useStageTimeline: three dots hop into a jar
 * (distances measured, so a resize rebuilds them), the jar shakes, a bar and a
 * readout follow the clock. Reloading at any `at` lands on the same frame.
 */
export function TimelineDemo({ startsAt }: { startsAt: number }) {
  const readout = useRef<HTMLSpanElement>(null);
  const ref = useStageTimeline<HTMLDivElement>({
    startsAt,
    deps: [],
    build: (scope, { reduced }) => {
      const jar = scope.querySelector<HTMLElement>("[data-demo-jar]");
      const dots = [...scope.querySelectorAll<HTMLElement>("[data-demo-dot]")];
      const bar = scope.querySelector<HTMLElement>("[data-demo-bar]");
      if (!jar || !bar) return [];
      const to = layoutRect(jar, scope);
      const sequence: AnimationSequence = [
        [bar, { scaleX: [0, 1] }, { duration: 4, ease: "linear", at: 0 }],
        [
          (t: number) => {
            if (readout.current) readout.current.textContent = t.toFixed(2);
          },
          [0, 4],
          { duration: 4, ease: "linear", at: 0 },
        ],
      ];
      dots.forEach((dot, i) => {
        const from = layoutRect(dot, scope);
        const dx = to.x + to.width / 2 - (from.x + from.width / 2);
        const at = 0.4 + 0.35 * i;
        sequence.push(
          reduced
            ? [dot, { opacity: [1, 0] }, { duration: 0.2, at }]
            : [
                dot,
                { x: [0, dx * 0.5, dx], y: [0, -44, 0], scale: [1, 1, 0.4] },
                {
                  duration: 0.6,
                  at,
                  y: { ease: [gs.p2Out, mirror(gs.p2Out)] },
                  x: { ease: "linear" },
                },
              ],
        );
      });
      if (!reduced)
        sequence.push([
          jar,
          { rotate: [0, -12, 10, -6, 0] },
          { duration: 0.6, at: 1.9, ease: gs.sineInOut },
        ]);
      return sequence;
    },
  });
  return (
    <div
      ref={ref}
      data-demo
      className="relative flex h-24 w-full max-w-[520px] items-center gap-3 rounded-2xl bg-surface px-4 shadow-card"
    >
      {DOTS.map((color) => (
        <span
          key={color}
          data-demo-dot
          className="size-6 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ))}
      <span className="flex-1" />
      <span
        data-demo-jar
        className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-butter font-bold font-display text-on-butter"
      >
        4
      </span>
      <span className="absolute inset-x-4 bottom-2 h-1 overflow-hidden rounded-full bg-line">
        <span
          data-demo-bar
          className="block h-full origin-left bg-sky"
          style={{ transform: "scaleX(0)" }}
        />
      </span>
      <span
        ref={readout}
        data-demo-t
        className="absolute top-2 right-4 font-mono text-ink-muted text-xs"
      >
        0.00
      </span>
    </div>
  );
}
