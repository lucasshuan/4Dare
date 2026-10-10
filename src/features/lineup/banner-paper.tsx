"use client";

import {
  animate,
  m,
  useMotionValue,
  usePresence,
  useTransform,
} from "motion/react";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { paperLighting, paperPeel } from "./banner-paper-geometry";

const TIMES = [0, 0.15, 0.38, 0.55, 0.78, 1];
// Peel only advances to completion; the incoming motion traverses it backwards.
const PEEL = [0, 0.13, 0.4, 0.7, 1, 1];
const X = [0, 0.8, 3, 18, 55, 105];
const Y = [0, -0.8, -4, -38, -115, -220];
const SCALE = [1, 1.005, 1.025, 1.12, 1.19, 1.22];
const ROTATION = [0, 0.3, 1, 6, 17, 28];
const OPACITY = [1, 1, 1, 1, 0.7, 0];
const SHADOW = "0 1px 0 rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.32)";

function sample(values: readonly number[], progress: number) {
  const at = Math.max(0, Math.min(1, progress));
  const end = TIMES.findIndex((time) => time >= at);
  if (end <= 0) return values[0];
  const fraction = (at - TIMES[end - 1]) / (TIMES[end] - TIMES[end - 1]);
  return values[end - 1] + (values[end] - values[end - 1]) * fraction;
}

/** A moving diagonal peel with a visible reverse, followed by a soft throw. */
export function BannerPaper({
  kind,
  reduced,
  className,
  surfaceClassName,
  children,
  overlay,
  pin,
  badge,
}: {
  kind: "photo" | "mission";
  reduced: boolean;
  className: string;
  surfaceClassName: string;
  children: ReactNode;
  overlay: ReactNode;
  pin?: ReactNode;
  badge?: ReactNode;
}) {
  const photo = kind === "photo";
  const delay = photo ? 0 : 0.45;
  const peelRatio = photo ? 0.8 : 0.7;
  const rotation = photo ? -3 : -2.5;
  const [present, safeToRemove] = usePresence();
  const duration = present ? (photo ? 0.72 : 0.52) : photo ? 1.1 : 0.82;
  // Another paper mounting or leaving may replace the presence callback.
  // Read its latest value without restarting this paper's animation clock.
  const finishRemoval = useEffectEvent(() => safeToRemove?.());
  const [settled, setSettled] = useState(false);
  const peeling = !reduced && (!settled || !present);
  const ref = useRef<HTMLDivElement>(null);
  const width = useMotionValue(100);
  const height = useMotionValue(150);
  // One clock drives the fold, flight and fade. The mission waits at the
  // fully peeled, invisible starting pose; independent tweens cannot drift.
  const progress = useMotionValue(1);
  // Once a departing sheet has faded, freeze its rendering at the endpoint.
  // The clock still finishes normally, preserving presence and loop timing.
  const renderProgress = useTransform(progress, (value) =>
    !present && value >= 0.4 ? 1 : value,
  );
  const peel = useTransform(renderProgress, (value) =>
    sample(PEEL, value / peelRatio),
  );
  const transform = useTransform(renderProgress, (value) => {
    const direction = present ? -1 : 1;
    return `translate(${sample(X, value) * direction}%,${sample(Y, value)}%) rotate(${rotation + sample(ROTATION, value) * direction}deg) scale(${sample(SCALE, value)})`;
  });
  const opacity = useTransform(renderProgress, (value) =>
    present
      ? sample(OPACITY, value)
      : 1 - Math.max(0, Math.min(1, (value - 0.16) / 0.24)),
  );
  const geometry = useTransform([peel, width, height], (values: number[]) =>
    paperPeel(values[0], values[1], values[2]),
  );
  const frontClip = useTransform(geometry, (value) => value.frontClip);
  const reverseClip = useTransform(geometry, (value) => value.reverseClip);
  const reflection = useTransform(geometry, (value) => value.reflection);
  const frontShadeTransform = useTransform(
    geometry,
    (value) => value.frontShadeTransform,
  );
  const reverseShadeTransform = useTransform(
    geometry,
    (value) => value.reverseShadeTransform,
  );
  const lighting = useTransform([width, height], (values: number[]) =>
    paperLighting(values[0], values[1]),
  );
  const lightHeight = useTransform(lighting, (value) => value.height);
  const frontLightWidth = useTransform(lighting, (value) => value.frontWidth);
  const reverseLightWidth = useTransform(
    lighting,
    (value) => value.reverseWidth,
  );

  // Use the layout box, not transformed bounds. Resize and text reflow are
  // measured once; animation progress never re-renders React.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = (entries?: ResizeObserverEntry[]) => {
      const size = entries?.[0]?.borderBoxSize[0];
      width.set(Math.max(1, size?.inlineSize ?? node.offsetWidth));
      height.set(Math.max(1, size?.blockSize ?? node.offsetHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width, height]);

  useEffect(() => {
    if (reduced) {
      progress.set(0);
      if (!present) finishRemoval();
      return;
    }
    if (present && settled) return;
    const playback = animate(progress, present ? 0 : 1, {
      duration,
      delay: present ? delay : 0,
      ease: "linear",
      onComplete: () => {
        if (present) setSettled(true);
        else finishRemoval();
      },
    });
    return () => playback.stop();
  }, [delay, duration, present, progress, reduced, settled]);

  return (
    <m.div
      ref={ref}
      data-banner-paper={kind}
      className={cn("relative", className, peeling && "[&_*]:shadow-none")}
      initial={false}
      style={
        reduced
          ? { opacity: 1, transform: `rotate(${rotation}deg)` }
          : {
              opacity,
              transform,
              willChange: peeling ? "transform, opacity" : undefined,
            }
      }
    >
      {!peeling && present && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ boxShadow: SHADOW }}
        />
      )}
      <m.div
        className={cn("relative overflow-hidden", surfaceClassName)}
        style={{
          clipPath: peeling ? frontClip : undefined,
          willChange: peeling ? "clip-path" : undefined,
        }}
      >
        {children}
        {peeling && (
          <m.span
            className="pointer-events-none absolute top-0 left-0 origin-top-left bg-linear-to-r from-black/22 to-transparent"
            style={{
              width: frontLightWidth,
              height: lightHeight,
              transform: frontShadeTransform,
              willChange: "transform",
            }}
          />
        )}
      </m.div>
      {peeling && (
        <m.div
          data-paper-reverse=""
          className="pointer-events-none absolute inset-0 origin-top-left rounded-[inherit]"
          style={{ transform: reflection, willChange: "transform" }}
        >
          <m.div
            className="absolute inset-0 overflow-hidden rounded-[inherit]"
            style={{
              clipPath: reverseClip,
              backgroundColor: photo ? "#f1eadb" : "var(--kraft)",
              willChange: "clip-path",
            }}
          >
            <div className={cn(surfaceClassName, "opacity-[0.07]")}>
              {children}
            </div>
            <m.span
              className="pointer-events-none absolute top-0 left-0 origin-top-left"
              style={{
                width: reverseLightWidth,
                height: lightHeight,
                transform: reverseShadeTransform,
                willChange: "transform",
                backgroundImage:
                  "linear-gradient(to right, transparent, rgba(0,0,0,0.14) 41.6667%, rgba(255,255,255,0.65) 91.6667%, rgba(255,255,255,0.85))",
              }}
            />
          </m.div>
        </m.div>
      )}
      <m.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: present ? 1 : 0 }}
        transition={{ duration: present ? 0 : 0.12 }}
      >
        {overlay}
      </m.div>
      {(reduced || settled) && present && (
        <>
          {badge}
          {pin}
        </>
      )}
    </m.div>
  );
}
