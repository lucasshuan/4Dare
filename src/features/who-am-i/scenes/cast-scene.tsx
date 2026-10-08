"use client";

import type { AnimationSequence } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CardBack } from "@/components/ui/card-frame";
import { MiniCard } from "@/components/ui/mini-card";
import { Portrait } from "@/components/ui/portrait";
import { useRoomContext } from "@/features/data/room-context";
import { beatOf } from "@/features/stage/stage";
import { useStage } from "@/features/stage/stage-context";
import {
  layoutRect,
  PHONE,
  useStageTimeline,
} from "@/features/stage/use-stage-timeline";
import { thumbUrl } from "@/game/character-search";
import { CAST, CAST_MARKS } from "@/game/show-timing/cast";
import type { PlayerView, ShowView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatColor } from "@/lib/seats";

export interface CastSceneProps {
  /** The cast show (its received, order or entrance beat is running). */
  show: ShowView;
}

/** Table sizes (spec C 2.1): card width and the gap between columns. */
const CARD = { desktop: 150, phone: 80 } as const;
const GAP = { desktop: 26, phone: 8 } as const;
/** Opacity of the columns out of the spotlight, and of away players all along. */
const DIM = 0.55;
/** A name longer than this steps the phone headings down a size, so it fits on 390 px. */
const LONG_NAME = 10;
/** Stands in for the name inside a translated sentence (never typed by anyone). */
const SLOT = "⁣";

/** The text before and after the name in a translated sentence. */
function around(text: string): [string, string] {
  const i = text.indexOf(SLOT);
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + SLOT.length)];
}

/**
 * "Rafa picked yours" and the turn order, played inside the turn screen:
 *
 * - received: your "?" card falls in, big, with who picked it; it settles
 *   into its seat on the table and the others turn face up, in seat order.
 * - order: the columns shuffle into the turn order along an arc, get their
 *   numbers, the first player is spotlit ("Bia starts!"), then the whole
 *   table shrinks up into the strip's place.
 * - entrance: the scene stays (faded out, inert) while the real strip and
 *   body come in under it, so its exit is never cut.
 *
 * One table across both beats: the columns are laid out in turn order and
 * start shifted to their seat slots, so the shuffle is the same element
 * moving. Everything is one timeline on the server clock: a reload or a late
 * join lands on the same frame. Times follow the prototype (scenes-c.js);
 * the later-match variant is spec C 2.5.
 */
export function CastScene({ show }: CastSceneProps) {
  const t = useTranslations("whoAmI.cast");
  const tCard = useTranslations("whoAmI.turn.card");
  const tCommon = useTranslations("common");
  const name = useDisplayName();
  const { view, playerById } = useRoomContext();
  const { beat } = useStage();
  const phone = useMedia(PHONE);
  const received = beatOf(show, "received");
  const order = beatOf(show, "order");

  const seated = [...view.players].sort((a, b) => a.seat - b.seat);
  const ordered = [...view.players].sort(
    (a, b) => (a.turnOrder ?? a.seat + 99) - (b.turnOrder ?? b.seat + 99),
  );
  const mine = view.players.find((p) => p.isYou) ?? null;
  const picker = mine ? playerById(mine.pickedById) : undefined;
  const first = playerById(view.turn?.playerId);
  const v = show.first ? "first" : "later";
  const w = phone ? CARD.phone : CARD.desktop;
  const gap = phone ? GAP.phone : GAP.desktop;
  const longName = (p: PlayerView | undefined) =>
    !!p && name(p, p.isYou).length > LONG_NAME;

  const ref = useStageTimeline<HTMLDivElement>({
    startsAt: received?.startsAt ?? null,
    deps: [
      received?.startsAt,
      received?.until,
      order?.startsAt,
      order?.until,
      show.first,
      ordered.map((p) => `${p.id}:${p.seat}:${p.away}`).join(),
      first?.id,
      picker?.id,
    ],
    build: (scope, { reduced, phone }) => {
      if (!received || !order) return [];
      // e2e runs shorten the beats: squeeze the choreography with them (1 = as designed)
      const nominalR = CAST.received[v] / 1000;
      const nominalO = CAST.order[v] / 1000;
      const fR = Math.min(
        1,
        (received.until - received.startsAt) / 1000 / nominalR,
      );
      const fO = Math.min(1, (order.until - order.startsAt) / 1000 / nominalO);
      const r = (s: number) => s * fR;
      const o0 = (order.startsAt - received.startsAt) / 1000;
      const o = (s: number) => o0 + s * fO;
      const one = <E extends HTMLElement>(sel: string) =>
        scope.querySelector<E>(sel);
      const box = one("[data-cast-box]");
      const row = one("[data-cast-row]");
      const t1 = one("[data-cast-t1]");
      const t2 = one("[data-cast-t2]");
      const kick = one("[data-cast-kick]");
      const call = one("[data-cast-call]");
      const cols = [...scope.querySelectorAll<HTMLElement>("[data-cast-col]")];
      if (!box || !row || !kick || cols.length !== ordered.length) return [];
      const part = (col: HTMLElement, name: string) =>
        col.querySelector<HTMLElement>(`[data-cast-${name}]`);

      // each column starts in its seat slot: the k-th slot, k = its seat rank
      const slots = cols.map((c) => layoutRect(c, scope).x);
      const shift = ordered.map((p, i) => slots[seated.indexOf(p)] - slots[i]);
      const rest = (p: PlayerView) => (p.away ? DIM : 1);
      const firstIx = ordered.findIndex((p) => p.id === first?.id);
      const spot = CAST_MARKS.orderSpot[v] / 1000;
      const leave = nominalO - (show.first ? 0.5 : 0.4);
      const seq: AnimationSequence = [];

      // the columns hold their seat slots until the shuffle
      ordered.forEach((_, i) => {
        seq.push([
          cols[i],
          { x: [shift[i], shift[i]] },
          { at: 0, duration: 0.01 },
        ]);
      });

      if (reduced) {
        // received: the whole table at once, face up; first match: the title gives way to the rule
        if (t1)
          seq.push([t1, { opacity: [0, 1] }, { at: r(0.1), duration: 0.2 }]);
        ordered.forEach((p, i) => {
          seq.push([
            cols[i],
            { opacity: [0, rest(p)] },
            { at: r(0.1), duration: 0.2 },
          ]);
          const card = part(cols[i], "card");
          const label = part(cols[i], "label");
          if (card)
            seq.push([
              card,
              { opacity: [0, 1] },
              { at: r(0.1), duration: 0.2 },
            ]);
          if (label)
            seq.push([
              label,
              { opacity: [0, 1] },
              { at: r(0.1), duration: 0.2 },
            ]);
        });
        if (t1 && t2)
          seq.push([t1, { opacity: [1, 0] }, { at: r(2.4), duration: 0.2 }]);
        if (t2)
          seq.push([t2, { opacity: [0, 1] }, { at: r(2.4), duration: 0.2 }]);
        // order: the row fades out, comes back in turn order with its numbers
        if (t1 && !t2)
          seq.push([t1, { opacity: [1, 0] }, { at: o(0), duration: 0.2 }]);
        if (t2)
          seq.push([t2, { opacity: [1, 0] }, { at: o(0), duration: 0.2 }]);
        seq.push([row, { opacity: [1, 0] }, { at: o(0), duration: 0.2 }]);
        ordered.forEach((_, i) => {
          seq.push([
            cols[i],
            { x: [shift[i], 0] },
            { at: o(0.2), duration: 0.01 },
          ]);
          const badge = part(cols[i], "badge");
          if (badge)
            seq.push([
              badge,
              { opacity: [0, 1] },
              { at: o(0.2), duration: 0.01 },
            ]);
        });
        seq.push([row, { opacity: [0, 1] }, { at: o(0.25), duration: 0.2 }]);
        seq.push([kick, { opacity: [0, 1] }, { at: o(0.1), duration: 0.2 }]);
        seq.push([
          kick,
          { opacity: [1, 0] },
          { at: o(spot - 0.2), duration: 0.2 },
        ]);
        // the first player: the call fades in, the others dim
        if (call)
          seq.push([call, { opacity: [0, 1] }, { at: o(spot), duration: 0.2 }]);
        ordered.forEach((p, i) => {
          if (i === firstIx) {
            const ring = part(cols[i], "ring");
            if (ring)
              seq.push([
                ring,
                { opacity: [0, 1] },
                { at: o(spot), duration: 0.2 },
              ]);
          } else if (firstIx >= 0)
            seq.push([
              cols[i],
              { opacity: [rest(p), DIM] },
              { at: o(spot), duration: 0.2 },
            ]);
        });
        seq.push([box, { opacity: [1, 0] }, { at: o(leave), duration: 0.2 }]);
        return seq;
      }

      // ---- received ----
      if (t1)
        seq.push([
          t1,
          { opacity: [0, 1], y: [14, 0] },
          { at: r(0.1), duration: r(0.45), ease: gs.p1Out },
        ]);
      const myIx = ordered.findIndex((p) => p.isYou);
      const myCol = myIx >= 0 ? cols[myIx] : null;
      const myCard = myCol && part(myCol, "card");
      const myFace = myCol && part(myCol, "face");
      const myLabel = myCol && part(myCol, "label");
      if (myCol)
        seq.push([myCol, { opacity: [1, 1] }, { at: 0, duration: 0.01 }]);
      if (myCard && show.first) {
        // it falls into the middle of the scene, big, then settles into its slot
        const c = layoutRect(myCard, scope);
        const k = phone ? 1.65 : 1.45;
        const dx = scope.offsetWidth / 2 - (c.x + c.width / 2 + shift[myIx]);
        const dy =
          scope.offsetHeight * (phone ? 0.6 : 0.64) - (c.y + c.height / 2);
        seq.push([myCard, { opacity: [0, 1] }, { at: 0, duration: 0.01 }]);
        seq.push([
          myCard,
          { x: [dx, dx], y: [dy - 520, dy], scale: [k, k], rotate: [-16, -3] },
          { at: r(0.3), duration: r(0.8), ease: gs.bounceOut },
        ]);
        if (myFace)
          seq.push([
            myFace,
            { scale: [1, 1.06, 1, 1.06, 1] },
            { at: r(1.0), duration: r(1.0), ease: gs.sineInOut },
          ]);
        seq.push([
          myCard,
          { x: [dx, 0], y: [dy, 0], scale: [k, 1], rotate: [-3, 0] },
          { at: r(2.4), duration: r(0.7), ease: gs.p3InOut },
        ]);
        if (t1)
          seq.push([
            t1,
            { opacity: [1, 0], y: [0, -12] },
            { at: r(2.3), duration: r(0.3), ease: gs.p1Out },
          ]);
        if (t2)
          seq.push([
            t2,
            { opacity: [0, 1], y: [16, 0] },
            {
              at: r(2.55),
              duration: r(0.5),
              opacity: { ease: gs.p1Out },
              y: { ease: gs.p3Out },
            },
          ]);
        if (myLabel)
          seq.push([
            myLabel,
            { opacity: [0, 1] },
            { at: r(2.9), duration: r(0.3), ease: gs.p1Out },
          ]);
      } else if (myCard) {
        // later matches: it drops at table size straight into its slot
        seq.push([myCard, { opacity: [0, 1] }, { at: r(0.2), duration: 0.01 }]);
        seq.push([
          myCard,
          { y: [-240, 0], rotate: [-8, 0] },
          { at: r(0.2), duration: r(0.6), ease: gs.bounceOut },
        ]);
        if (myLabel)
          seq.push([
            myLabel,
            { opacity: [0, 1] },
            { at: r(0.5), duration: r(0.3), ease: gs.p1Out },
          ]);
      }
      // the others turn face up, in seat order
      const flipAt = show.first ? 2.9 : 0.5;
      const flipStep = show.first ? 0.18 : 0.12;
      const flipDur = show.first ? 0.6 : 0.5;
      seated
        .filter((p) => !p.isYou)
        .forEach((p, j) => {
          const i = ordered.indexOf(p);
          const card = part(cols[i], "card");
          const label = part(cols[i], "label");
          const at = r(flipAt + j * flipStep);
          seq.push([
            cols[i],
            { opacity: [0, rest(p)] },
            { at, duration: 0.01 },
          ]);
          if (label)
            seq.push([label, { opacity: [1, 1] }, { at, duration: 0.01 }]);
          if (card) {
            seq.push([card, { opacity: [1, 1] }, { at, duration: 0.01 }]);
            seq.push([
              card,
              { rotateY: [180, 0], y: [30, 0] },
              { at, duration: r(flipDur), ease: gs.backOut(1.6) },
            ]);
          }
        });

      // ---- order ----
      const L = show.first
        ? {
            kickAt: 0.1,
            kickDur: 0.3,
            shuffle: 0.5,
            shuffleDur: 0.9,
            badge: 1.6,
            badgeStep: 0.16,
            badgeDur: 0.45,
            kickOut: 2.4,
            leaveDur: 0.7,
          }
        : {
            kickAt: 0,
            kickDur: 0.25,
            shuffle: 0.2,
            shuffleDur: 0.7,
            badge: 0.9,
            badgeStep: 0.12,
            badgeDur: 0.35,
            kickOut: spot - 0.2,
            leaveDur: 0.6,
          };
      if (t2)
        seq.push([
          t2,
          { opacity: [1, 0] },
          { at: o(0), duration: 0.2 * fO, ease: gs.p1Out },
        ]);
      else if (t1)
        seq.push([
          t1,
          { opacity: [1, 0], y: [0, -12] },
          { at: o(0), duration: 0.2 * fO, ease: gs.p1Out },
        ]);
      seq.push([
        kick,
        { opacity: [0, 1], y: [8, 0] },
        { at: o(L.kickAt), duration: L.kickDur * fO, ease: gs.p1Out },
      ]);
      ordered.forEach((_, i) => {
        const at = o(L.shuffle + i * 0.05);
        // along an arc: even columns over the top, odd ones under
        seq.push([
          cols[i],
          { x: [shift[i], 0], y: [0, i % 2 ? 46 : -46, 0] },
          {
            at,
            duration: L.shuffleDur * fO,
            x: { ease: gs.p2InOut },
            y: { ease: "linear" },
          },
        ]);
        const badge = part(cols[i], "badge");
        if (badge) {
          const bat = o(L.badge + i * L.badgeStep);
          seq.push([badge, { opacity: [0, 1] }, { at: bat, duration: 0.01 }]);
          seq.push([
            badge,
            { scale: [0, 1], rotate: [-40, 0] },
            { at: bat, duration: L.badgeDur * fO, ease: gs.backOut(3) },
          ]);
        }
      });
      seq.push([
        kick,
        { opacity: [1, 0] },
        { at: o(L.kickOut), duration: 0.25 * fO, ease: gs.p1Out },
      ]);
      // the spotlight: the first player grows, wears their seat ring; the others dim
      if (firstIx >= 0) {
        seq.push([
          cols[firstIx],
          { scale: [1, 1.1] },
          { at: o(spot), duration: 0.45 * fO, ease: gs.backOut(2.4) },
        ]);
        const ring = part(cols[firstIx], "ring");
        if (ring)
          seq.push([
            ring,
            { opacity: [0, 1] },
            { at: o(spot), duration: 0.3 * fO, ease: gs.p1Out },
          ]);
        ordered.forEach((p, i) => {
          if (i !== firstIx)
            seq.push([
              cols[i],
              { opacity: [rest(p), DIM] },
              { at: o(spot), duration: 0.4 * fO, ease: gs.p1Out },
            ]);
        });
      }
      if (call) {
        seq.push([
          call,
          { opacity: [0, 1] },
          { at: o(spot + 0.05), duration: 0.01 },
        ]);
        seq.push([
          call,
          { scale: [1.7, 1] },
          { at: o(spot + 0.05), duration: 0.5 * fO, ease: gs.backOut(2) },
        ]);
      }
      // the table shrinks up into the strip's place
      seq.push([
        box,
        { scale: [1, 0.32], y: [0, phone ? -300 : -330], opacity: [1, 0] },
        { at: o(leave), duration: L.leaveDur * fO, ease: gs.p3In },
      ]);
      return seq;
    },
  });

  if (!received || !order) return null;
  const [pickedBefore, pickedAfter] = around(t("pickedYours", { name: SLOT }));
  const [startsBefore, startsAfter] = around(t("starts", { name: SLOT }));

  return (
    <div
      ref={ref}
      // inert: over the strip during the entrance, and never in the way of a click;
      // clipped sideways, so the big "starts!" line waiting at 1.7× never widens the page
      aria-hidden={beat?.kind === "entrance" ? true : undefined}
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[calc(100dvh-9rem-var(--dock,0px))] items-center justify-center overflow-x-clip"
    >
      <div
        data-cast-box
        className="flex w-full flex-col items-center gap-14 pb-5 max-sm:gap-10"
      >
        {/* the titles and the order's headings share one grid cell above the row */}
        <div className="grid w-full place-items-center px-2 text-center font-display font-extrabold leading-[1.02] tracking-[-0.03em] [word-break:auto-phrase] *:col-start-1 *:row-start-1">
          {picker && mine ? (
            <h2
              data-cast-t1
              style={{ opacity: 0 }}
              className={cn(
                "m-0 max-w-full text-balance text-[44px]",
                longName(picker) ? "max-sm:text-[24px]" : "max-sm:text-[28px]",
              )}
            >
              {pickedBefore}
              <span className="inline-flex max-w-full items-center gap-3 whitespace-nowrap align-middle">
                <Avatar
                  avatar={picker.avatar}
                  size={48}
                  className="max-sm:size-8.5"
                />
                <span className="min-w-0 truncate">{name(picker)}</span>
              </span>
              {pickedAfter}
            </h2>
          ) : null}
          {show.first ? (
            <h2
              data-cast-t2
              style={{ opacity: 0 }}
              className="m-0 max-w-[720px] text-balance text-[44px] max-sm:max-w-[330px] max-sm:text-[28px]"
            >
              {t("rule")}
            </h2>
          ) : null}
          <span
            data-cast-kick
            style={{ opacity: 0 }}
            className="rounded-pill bg-sunken px-3 py-1 font-sans font-semibold text-ink-muted text-xs uppercase tracking-[.08em]"
          >
            {t("orderKicker")}
          </span>
          {first ? (
            <h2
              data-cast-call
              style={{ opacity: 0 }}
              className={cn(
                "m-0 max-w-full text-balance text-[64px]",
                longName(first) ? "max-sm:text-[30px]" : "max-sm:text-[40px]",
              )}
            >
              {startsBefore}
              <span className="inline-flex max-w-full items-center gap-3.5 whitespace-nowrap align-middle">
                <Avatar
                  avatar={first.avatar}
                  size={64}
                  className="max-sm:size-11"
                />
                <span className="min-w-0 truncate">
                  {name(first, first.isYou)}
                </span>
              </span>
              {startsAfter}
            </h2>
          ) : null}
        </div>
        <div data-cast-row className="flex items-start" style={{ gap }}>
          {ordered.map((p) => (
            <Column
              key={p.id}
              player={p}
              number={(p.turnOrder ?? ordered.indexOf(p)) + 1}
              width={w}
              gap={gap}
              phone={phone}
              title={tCard("whoAreYou")}
              you={tCommon("you")}
              sub={
                phone ? null : (
                  <Sub
                    text={(() => {
                      const by = playerById(p.pickedById);
                      if (p.isYou) return by ? t("from", { name: SLOT }) : null;
                      if (by?.isYou) return t("byYou");
                      return by ? t("by", { name: SLOT }) : null;
                    })()}
                    person={playerById(p.pickedById)}
                  />
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** One player's column: number badge, card, avatar and name under it. */
function Column({
  player: p,
  number,
  width,
  gap,
  phone,
  title,
  you,
  sub,
}: {
  player: PlayerView;
  number: number;
  width: number;
  gap: number;
  phone: boolean;
  title: string;
  you: string;
  sub: ReactNode;
}) {
  const name = useDisplayName();
  const face = p.cardHidden ? (
    <CardBack
      data-cast-face
      seat={p.colorSlot}
      className={phone ? "rounded-[7px]" : "rounded-[10px]"}
    />
  ) : (
    <Portrait
      src={thumbUrl(p.card?.imageUrl ?? null, width * 2)}
      className={phone ? "rounded-[7px]" : "rounded-[10px]"}
    />
  );
  return (
    <div
      data-cast-col
      data-id={p.id}
      // others come in when they turn face up; yours is there from the start
      style={{ width, opacity: p.isYou ? 1 : 0 }}
      className="relative flex shrink-0 flex-col items-center gap-3 perspective-[800px] max-sm:gap-2"
    >
      <span
        data-cast-badge
        style={{ opacity: 0 }}
        className="absolute -top-4.5 left-1/2 z-2 -ml-4.5 flex size-9 items-center justify-center rounded-pill bg-ink font-display font-extrabold text-[19px] text-on-ink max-sm:-top-3.5 max-sm:-ml-3.5 max-sm:size-7 max-sm:text-[15px]"
      >
        {number}
      </span>
      <MiniCard
        data-cast-card
        image={null}
        width={width}
        seat={p.colorSlot}
        face={
          <>
            {face}
            {/* the spotlight's seat ring, faded in on the first player */}
            <span
              data-cast-ring
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[14px]"
              style={{
                opacity: 0,
                boxShadow: `0 0 0 4px color-mix(in oklab, ${seatColor(p.colorSlot)} 90%, transparent), 0 24px 56px rgba(30,36,51,.2)`,
              }}
            />
          </>
        }
        name={p.cardHidden ? title : (p.card?.name ?? "")}
        sub={sub}
        className="gap-1.5 [&>b]:text-[15px] max-sm:[&>b]:text-[11px]"
        style={{
          opacity: p.isYou ? 0 : 1,
          padding: phone ? "4px 4px 6px" : "8px 8px 10px",
          borderRadius: phone ? 14 : 20,
          boxShadow: "var(--shadow-pop)",
        }}
      />
      {/* avatar kept, the name cut to the column (card + gap) */}
      <span
        data-cast-label
        style={{ opacity: p.isYou ? 0 : 1, maxWidth: width + gap }}
        className="flex w-max items-center gap-1.5 whitespace-nowrap font-bold text-[15px] max-sm:text-xs"
      >
        <Avatar avatar={p.avatar} size={26} className="max-sm:size-5" />
        <span className="min-w-0 truncate">{p.isYou ? you : name(p)}</span>
      </span>
    </div>
  );
}

/** "from Rafa" / "by Leo" under a card, the picker's avatar beside the name; null when unknown. */
function Sub({
  text,
  person,
}: {
  text: string | null;
  person: PlayerView | undefined;
}) {
  const name = useDisplayName();
  if (!text) return null;
  if (!text.includes(SLOT) || !person)
    return <span className="truncate">{text}</span>;
  const [before, after] = around(text);
  return (
    <span className="flex min-w-0 items-center gap-0.75">
      {before.trim() ? <span className="shrink-0">{before.trim()}</span> : null}
      <Avatar avatar={person.avatar} size={16} />
      <span className="min-w-0 truncate">{name(person)}</span>
      {after.trim() ? <span className="shrink-0">{after.trim()}</span> : null}
    </span>
  );
}
