"use client";

// Trades, the last move before the envelope: pick some of your cards, someone
// and some of theirs, and offer. One open offer each; it only goes through
// when the other accepts. Offers are public: everyone sees them come and go.
import { ArrowLeftRight, Check, X } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { keyClass } from "@/components/ui/button";
import { useStepStarted } from "@/features/room/match-frame";
import type { LuOffer } from "@/game/lineup/types";
import type { PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import { seatColor } from "@/lib/seats";
import { answerTrade, markDone, offerTrade } from "@/server/actions";
import { Sticker } from "./card";
import { useLineup, useLuAction } from "./use-lineup";

/** A row of a team's photos; a tap picks or unpicks one. */
function Hand({
  cards,
  picked,
  onToggle,
  small = false,
}: {
  cards: number[];
  picked?: Set<number>;
  onToggle?: (c: number) => void;
  small?: boolean;
}) {
  const { lu } = useLineup();
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
      {cards.map((c, k) => {
        const card = lu.cards[c];
        if (!card) return null;
        const on = picked?.has(c) ?? false;
        const sticker = (
          <Sticker
            key={c}
            card={card}
            width={small ? 40 : 62}
            tilt={[-3, 2, -1, 3][k % 4]}
            price={lu.tags[c]?.price}
          />
        );
        return onToggle ? (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            aria-label={card.name}
            title={card.name}
            onClick={() => onToggle(c)}
            className={cn(
              "rounded-[8px] transition-[translate,outline-color] duration-150",
              on
                ? "-translate-y-1.5 outline-3 outline-sky outline-offset-4"
                : "outline-3 outline-transparent outline-offset-4",
            )}
          >
            {sticker}
          </button>
        ) : (
          <span key={c} title={card.name}>
            {sticker}
          </span>
        );
      })}
    </div>
  );
}

/** An offer as everyone reads it: who gives what for what. */
function OfferCard({
  offer,
  children,
}: {
  offer: LuOffer;
  children?: React.ReactNode;
}) {
  const t = useTranslations("lineup.trade");
  const name = useDisplayName();
  const { playerById } = useLineup();
  const from = playerById(offer.from);
  const to = playerById(offer.to);
  if (!from || !to) return null;
  return (
    <m.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2.5 rounded-[24px] bg-surface px-4 py-3 text-ink shadow-pop sm:px-6"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5 font-bold text-[14px] sm:text-[16px]">
        <Avatar avatar={from.avatar} size={20} seat={from.colorSlot} />
        {t("offers", { from: name(from, from.isYou), to: name(to, to.isYou) })}
      </span>
      <div className="flex items-center gap-3 sm:gap-5">
        <Hand cards={offer.give} small />
        <ArrowLeftRight className="size-6 shrink-0 text-ink-muted" />
        <Hand cards={offer.get} small />
      </div>
      {children}
    </m.div>
  );
}

export function TradeScreen() {
  const t = useTranslations("lineup.trade");
  const name = useDisplayName();
  const { lu, me, players, code } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const inPlay = lu.dealtIds.includes(me.id) && !me.away;
  const others = players.filter((p) => p.id !== me.id && !p.away);
  const [to, setTo] = useState<PlayerView | null>(null);
  const [give, setGive] = useState<Set<number>>(new Set());
  const [get, setGet] = useState<Set<number>>(new Set());
  const mine = lu.hands[me.id] ?? [];
  const theirs = to ? (lu.hands[to.id] ?? []) : [];
  const myOffer = lu.offers.find((o) => o.from === me.id);
  const forMe = lu.offers.filter((o) => o.to === me.id);
  const elsewhere = lu.offers.filter((o) => o.from !== me.id && o.to !== me.id);
  const done = lu.doneIds.includes(me.id);
  const toggle =
    (set: Set<number>, put: (s: Set<number>) => void) => (c: number) => {
      const next = new Set(set);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      put(next);
    };
  const ready = started && to && give.size > 0 && get.size > 0;

  return (
    <div className="flex w-full max-w-[880px] flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-bold text-[13px] text-ink-muted uppercase tracking-[0.08em]">
          {t("kicker")}
        </span>
        <h2 className="m-0 font-display font-extrabold text-[clamp(24px,4vw,34px)] leading-tight">
          {t("title")}
        </h2>
        <p className="m-0 max-w-[560px] text-balance text-[14px] text-ink-muted">
          {t("how")}
        </p>
      </div>

      {forMe.map((o) => (
        <OfferCard key={o.from} offer={o}>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => answerTrade(code, o.from, true))}
              className={keyClass("yes", { className: "h-11 px-5 text-base" })}
            >
              <Check className="size-5" strokeWidth={2.6} />
              {t("accept")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => answerTrade(code, o.from, false))}
              className="h-11 rounded-pill border-[1.5px] border-line-strong bg-surface px-5 font-bold"
            >
              {t("decline")}
            </button>
          </div>
        </OfferCard>
      ))}

      {inPlay && myOffer ? (
        <OfferCard offer={myOffer}>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => offerTrade(code, null))}
            className="inline-flex h-10 items-center gap-1.5 rounded-pill border-[1.5px] border-line-strong bg-surface px-4 font-bold text-[14px]"
          >
            <X className="size-4" strokeWidth={2.6} />
            {t("withdraw")}
          </button>
        </OfferCard>
      ) : inPlay ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-[28px] bg-surface/80 px-3 py-4 shadow-card sm:px-6">
          <span className="font-bold text-[14px] text-ink-muted">
            {t("give")}
          </span>
          <Hand cards={mine} picked={give} onToggle={toggle(give, setGive)} />
          <div className="flex flex-wrap justify-center gap-2">
            {others.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={to?.id === p.id}
                onClick={() => {
                  setTo(p);
                  setGet(new Set());
                }}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-pill border-[1.5px] bg-surface pr-3.5 pl-1 font-bold text-[14px]",
                  to?.id === p.id ? "border-transparent" : "border-line",
                )}
                style={
                  to?.id === p.id
                    ? { boxShadow: `0 0 0 3px ${seatColor(p.colorSlot)}` }
                    : undefined
                }
              >
                <Avatar avatar={p.avatar} size={28} />
                {name(p, false)}
              </button>
            ))}
          </div>
          {to ? (
            <>
              <span className="font-bold text-[14px] text-ink-muted">
                {t("get", { name: name(to, false) })}
              </span>
              <Hand
                cards={theirs}
                picked={get}
                onToggle={toggle(get, setGet)}
              />
            </>
          ) : (
            <span className="text-[14px] text-ink-muted">
              {t("pickSomeone")}
            </span>
          )}
          <button
            type="button"
            disabled={!ready || pending}
            onClick={() =>
              to &&
              run(() =>
                offerTrade(code, { to: to.id, give: [...give], get: [...get] }),
              ).then((r) => {
                if (r.ok) {
                  setGive(new Set());
                  setGet(new Set());
                }
              })
            }
            className={keyClass("sky", { className: "h-12 px-6 text-base" })}
          >
            <ArrowLeftRight className="size-5" strokeWidth={2.6} />
            {t("propose")}
          </button>
        </div>
      ) : null}

      {elsewhere.length ? (
        <div className="flex w-full flex-col items-center gap-3">
          {elsewhere.map((o) => (
            <OfferCard key={o.from} offer={o} />
          ))}
        </div>
      ) : null}

      {inPlay ? (
        <button
          type="button"
          disabled={pending || !started}
          onClick={() => run(() => markDone(code, !done))}
          className={keyClass(done ? "sky" : "yes", {
            pressed: done,
            className: "h-14 px-8 text-lg",
          })}
        >
          {done
            ? t("waiting", { n: lu.doneIds.length, of: lu.dealtIds.length })
            : t("done")}
        </button>
      ) : null}
    </div>
  );
}
