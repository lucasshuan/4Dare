"use client";

import type { AnimationSequence } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import { beatOf } from "@/features/stage/stage";
import { useStage } from "@/features/stage/stage-context";
import {
  PHONE,
  type TimelineInfo,
  useStageTimeline,
} from "@/features/stage/use-stage-timeline";
import { DRAW } from "@/game/show-timing/draw";
import type { ShowView } from "@/game/types";
import { useMedia } from "@/lib/hooks/use-media";
import { useClock } from "@/lib/hooks/use-server-clock";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatColor, seatInk } from "@/lib/seats";
import { DrawUrn, drawSequence, drawTimes } from "./draw-urn";
import { ringSequence, type TimeMap, WhoRing } from "./who-ring";

export interface PickIntroProps {
  /** The theme show (its draw or target beat is running). */
  show: ShowView;
}

/** The slip's paper: its padding around the header (desktop / phone), px. */
const PAPER_X = { desktop: 44, phone: 30 };

/**
 * The draw and "for whom", as one scene (spec B §2-3): the avatars hop into
 * the logo's 4, it shakes like a jar and spits out a slip, and the slip is
 * the "for whom" header itself (you pick for, the face, the name), laid out
 * at its final size and place from the first frame: it shoots up from the
 * bubble edge-on, spinning, then falls into that place and never moves
 * again. At the target beat only its paper dissolves; the hint and the ring
 * of who picks for whom come in under it.
 *
 * Mounted after the draw (a reload mid-target), there is no slip: the header
 * comes in on its own. The stage lab's stopped clock always shows the slip's
 * frames, what a player who watched the draw sees.
 */
export function PickIntro({ show }: PickIntroProps) {
  const t = useTranslations("stageDraw");
  const withNames = useWithNames();
  const displayName = useDisplayName();
  const { view, playerById } = useRoomContext();
  const clock = useClock();
  const phone = useMedia(PHONE);
  const { beat } = useStage();
  const draw = beatOf(show, "draw");
  const target = beatOf(show, "target");
  const [slip] = useState(
    () => !!draw && (clock.frozen || beat?.kind === "draw"),
  );
  const person = playerById(view.pick?.targetId);
  const order = useMemo(
    () =>
      view.players
        .filter((p) => p.turnOrder !== null)
        .sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0)),
    [view.players],
  );
  const youIndex = order.findIndex((p) => p.id === view.youId);
  const name = person ? displayName(person) : "";
  const first = show.first;

  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: draw?.startsAt ?? target?.startsAt ?? null,
    deps: [
      slip,
      first,
      name,
      person?.id,
      order.map((p) => p.id).join(),
      youIndex,
      draw?.startsAt,
      draw?.until,
      target?.startsAt,
      target?.until,
    ],
    build: (scope, info) => {
      if (!target) return [];
      fitName(scope, info.phone);
      const v = first ? "first" : "later";
      // e2e shortens the beats (DARE_SHOW_SCALE): the scene then plays faster, whole
      const kD = draw
        ? Math.min(1, (draw.until - draw.startsAt) / DRAW.draw[v])
        : 1;
      const kT = Math.min(1, (target.until - target.startsAt) / DRAW.target[v]);
      const t0 = draw?.startsAt ?? target.startsAt;
      const td = (target.startsAt - t0) / 1000;
      const seq: AnimationSequence = [];
      if (slip && draw)
        seq.push(
          ...drawSequence(scope, {
            times: drawTimes(order.length, first),
            reduced: info.reduced,
            phone: info.phone,
            map: { at: (s) => s * kD, d: (s) => s * kD },
          }),
        );
      seq.push(
        ...targetSequence(scope, info, {
          slip,
          first,
          n: order.length,
          length: DRAW.target[v] / 1000,
          map: { at: (s) => td + s * kT, d: (s) => s * kT },
        }),
      );
      return seq;
    },
  });

  if (!person || !target) return null;
  const color = seatColor(person.colorSlot);
  const ink = seatInk(person.colorSlot);

  return (
    <div
      ref={ref}
      data-pick-intro
      className="relative isolate flex min-h-[calc(100dvh-112px-var(--dock))] w-full flex-col text-center short:min-h-[calc(100dvh-88px-var(--dock))] sm:min-h-[calc(100dvh-120px-var(--dock))] sm:short:min-h-[calc(100dvh-88px-var(--dock))]"
    >
      <div
        data-scene
        className="relative flex w-full flex-1 flex-col items-center justify-center"
      >
        {/* "for whom": laid out from the start, so the slip lands where it stays */}
        <div className="flex flex-col items-center gap-5 pb-[30px] sm:gap-[26px]">
          <div className="flex flex-col items-center gap-3 sm:gap-3.5">
            <div
              data-slip
              className="relative flex w-max max-w-none flex-col items-center gap-3 sm:gap-3.5"
              style={
                slip
                  ? { zIndex: 0, opacity: 0, transform: "scale(0.12)" }
                  : { zIndex: 2 }
              }
            >
              {slip ? (
                <div
                  data-paper
                  aria-hidden="true"
                  className="-inset-x-[30px] -top-6 -bottom-[22px] sm:-inset-x-11 sm:-top-[30px] sm:-bottom-[26px] pointer-events-none absolute -z-10 rounded-[24px] bg-surface shadow-pop"
                />
              ) : null}
              <span
                data-slip-pre
                className="font-bold text-[19px] text-ink-muted sm:text-2xl"
                style={slip ? undefined : { opacity: 0 }}
              >
                {t("target.youPickFor")}
              </span>
              <span
                data-slip-face
                className="relative flex rounded-pill"
                style={
                  slip ? undefined : { transform: "scale(0.2) rotate(-20deg)" }
                }
              >
                <Avatar
                  avatar={person.avatar}
                  isGuest={person.isGuest}
                  name={person.name}
                  size={64}
                  className="size-[120px] text-[48px] sm:size-[150px] sm:text-[60px]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-pill"
                  style={{ outline: `6px solid ${color}`, outlineOffset: 6 }}
                />
              </span>
              <h2
                data-slip-name
                className="m-0 whitespace-nowrap font-display font-extrabold text-[64px] leading-[1.02] tracking-[-0.03em] sm:text-[96px]"
                style={slip ? { color: ink } : { color: ink, opacity: 0 }}
              >
                {name}
              </h2>
            </div>
            <p
              data-hint
              className="m-0 max-w-[300px] text-balance font-semibold text-[18px] text-ink sm:max-w-[560px] sm:text-[22px]"
              style={{ opacity: 0 }}
            >
              {withNames((n) => t("target.hint", { name: n(person) }))}
            </p>
          </div>
          <WhoRing
            players={order}
            youIndex={youIndex}
            color={color}
            phone={phone}
            label={t("target.ringLabel")}
            // two players pick for each other, not "for someone"
            caption={t("target.ring", { count: order.length })}
          />
        </div>

        {slip ? (
          <div
            aria-hidden={beat?.kind === "draw" ? undefined : true}
            className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-[26px] text-on-brand sm:gap-[30px]"
          >
            <h2
              data-draw-line
              className="m-0 max-w-[330px] text-balance font-display font-extrabold text-[28px] leading-[1.02] tracking-[-0.03em] sm:max-w-[700px] sm:text-[46px]"
              style={{ opacity: 0, transform: "translateY(24px)" }}
            >
              {t("draw.line", { count: order.length })}
            </h2>
            <DrawUrn />
            <div
              data-draw-row
              className="flex gap-[26px] sm:gap-[60px]"
              aria-hidden="true"
            >
              {order.map((p) => (
                <span
                  key={p.id}
                  data-draw-av
                  className="flex"
                  style={{ opacity: 0, transform: "translateY(40px)" }}
                >
                  <Avatar
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={52}
                    className="sm:size-17 sm:text-[28px]"
                  />
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The name is one line at 96 / 64 px; a long one shrinks until it fits the
 * slip's paper inside the screen. Measured on each build (before anything
 * else is), so the slip and the screen are one size.
 */
function fitName(scope: HTMLElement, phone: boolean) {
  const el = scope.querySelector<HTMLElement>("[data-slip-name]");
  if (!el) return;
  el.style.fontSize = "";
  const room =
    scope.clientWidth - 2 * (phone ? PAPER_X.phone : PAPER_X.desktop) - 16;
  const width = el.scrollWidth;
  if (room > 0 && width > room) {
    const size = Number.parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = `${Math.floor((size * room) / width)}px`;
  }
}

/**
 * "For whom" (spec B §3.3): the slip's paper dissolves (or, without a slip,
 * the header comes in), the hint rises, the ring builds itself, and the
 * whole scene fades out 0.4 s before the beat ends, as the pick table lands.
 */
function targetSequence(
  scope: HTMLElement,
  info: TimelineInfo,
  o: {
    slip: boolean;
    first: boolean;
    n: number;
    /** The beat's length in the scene's own seconds. */
    length: number;
    map: TimeMap;
  },
): AnimationSequence {
  const { at, d } = o.map;
  const q = (s: string) => scope.querySelector<HTMLElement>(s);
  const scene = q("[data-scene]");
  const paper = q("[data-paper]");
  const pre = q("[data-slip-pre]");
  const face = q("[data-slip-face]");
  const name = q("[data-slip-name]");
  const hint = q("[data-hint]");
  if (!scene || !pre || !face || !name || !hint) return [];
  const seq: AnimationSequence = [];
  const hintAt = o.first ? 0.65 : 0.3;
  const exit = o.length - 0.4;

  if (info.reduced) {
    if (paper)
      seq.push([paper, { opacity: [1, 0] }, { at: at(0), duration: 0.2 }]);
    else
      seq.push(
        [pre, { opacity: [0, 1], y: [0, 0] }, { at: at(0), duration: 0.2 }],
        [
          face,
          { opacity: [0, 1], scaleX: [1, 1], scaleY: [1, 1], rotate: [0, 0] },
          { at: at(0), duration: 0.2 },
        ],
        [
          name,
          { opacity: [0, 1], scaleX: [1, 1], scaleY: [1, 1] },
          { at: at(0), duration: 0.2 },
        ],
      );
    seq.push(
      [hint, { opacity: [0, 1], y: [0, 0] }, { at: at(hintAt), duration: 0.2 }],
      ...ringSequence(scope, { first: o.first, reduced: true, map: o.map }),
      [scene, { opacity: [1, 0] }, { at: at(exit), duration: d(0.4) }],
    );
    return seq;
  }

  if (paper)
    seq.push([
      paper,
      { opacity: [1, 0], scaleX: [1, 1.12], scaleY: [1, 1.12] },
      { at: at(0), duration: d(0.35), ease: gs.p2Out },
    ]);
  else
    seq.push(
      [
        pre,
        { opacity: [0, 1], y: [10, 0] },
        { at: at(0), duration: d(0.4), ease: gs.p1Out },
      ],
      [
        face,
        { scaleX: [0.2, 1], scaleY: [0.2, 1], rotate: [-20, 0] },
        { at: at(0.1), duration: d(0.7), ease: gs.backOut(2) },
      ],
      [
        name,
        { opacity: [0, 1], scaleX: [1.6, 1], scaleY: [1.6, 1] },
        { at: at(0.45), duration: d(0.45), ease: gs.p3Out },
      ],
    );
  seq.push(
    [
      hint,
      { opacity: [0, 1], y: [14, 0] },
      {
        at: at(hintAt),
        duration: d(o.first ? 0.5 : 0.4),
        ease: gs.p3Out,
      },
    ],
    ...ringSequence(scope, { first: o.first, reduced: false, map: o.map }),
    [
      scene,
      { opacity: [1, 0], scaleX: [1, 0.94], scaleY: [1, 0.94] },
      { at: at(exit), duration: d(0.4), ease: gs.p1Out },
    ],
  );
  return seq;
}
