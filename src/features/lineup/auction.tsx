"use client";

// The auction: the lot on top (its photo, name, work, gosto), the bid table
// under it (one lane per player, each offer a tower of their coins that stays
// standing when covered), and your rail: a key for every amount you can
// offer, the minimum in orange, the last one "all". "Pass" takes you out of
// the lot; when everyone but the leader has passed, the hammer falls.
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useRoomContext } from "@/features/data/room-context";
import { useStepStarted } from "@/features/room/match-frame";
import { useStage } from "@/features/stage/stage-context";
import { GOSTOS } from "@/game/gostos";
import type { LuCard } from "@/game/lineup/types";
import type { ErrorCode, Lang, PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { useDisplayName } from "@/lib/names";
import { onSeat, seatColor } from "@/lib/seats";
import { bidOnLot, foldLot } from "@/server/actions";
import { CardFace, Sticker } from "./card";
import { chime } from "./chime";
import { CoinTower } from "./coin";
import { TeamPeek } from "./team-peek";
import { useLineup } from "./use-lineup";

/** "Going once… twice… sold!" over the last seconds of a lot. */
const GOING_MS = 5000;
/** One bid every this long, per player: no hammering the key. */
const BID_GAP_MS = 300;

export function AuctionScreen() {
  const t = useTranslations("lineup.auction");
  const { lu, me, players, code, apply, refresh } = useLineup();
  const { show, beat } = useStage();
  const toast = useToast();
  const te = useTranslations("common.errors");
  const name = useDisplayName();
  const started = useStepStarted();
  const sold = show?.kind === "sold" && beat?.kind === "sold" ? show : null;

  // every lot's towers as they stood, for the hammer's scene (the view has moved on by then)
  const towers = useRef(new Map<number, Record<string, number>>());
  useEffect(() => {
    if (lu.lot) towers.current.set(lu.lot.i, lu.lot.bids);
  }, [lu.lot]);

  const i = sold ? sold.n : (lu.lot?.i ?? 0);
  const card = lu.cards[i];
  const tag = sold ? lu.tags[i] : undefined;
  const bids: Record<string, number> = sold
    ? {
        ...(towers.current.get(i) ?? {}),
        ...(tag?.by ? { [tag.by]: tag.price } : {}),
      }
    : (lu.lot?.bids ?? {});
  const leaderId = sold ? (tag?.by ?? null) : (lu.lot?.leaderId ?? null);
  const price = sold ? (tag?.price ?? 0) : (lu.lot?.price ?? 0);
  const passed = sold ? [] : (lu.lot?.passedIds ?? []);
  const next = sold ? i + 1 : lu.lot?.next;
  // with a presenter, the next is the head of their queue
  const nextCard = lu.hosted
    ? (lu.lot?.nextCard ?? undefined)
    : next != null && next < lu.lots
      ? lu.cards[next]
      : undefined;

  // your bid shows at once; the server's answer replaces it
  const [mine, setMine] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [beaten, setBeaten] = useState<string | null>(null);
  const last = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new lot clears both
  useEffect(() => {
    setMine(null);
    setBeaten(null);
  }, [i]);

  const coins = lu.coins[me.id] ?? 0;
  const inPlay = lu.dealtIds.includes(me.id) && !me.away;
  const leading = leaderId === me.id;
  const myPassed = passed.includes(me.id);
  const canBid = started && !sold && inPlay && !leading && coins > price;

  const bid = useCallback(
    async (amount: number) => {
      const now = Date.now();
      if (now - last.current < BID_GAP_MS) return;
      last.current = now;
      setMine(amount);
      setBeaten(null);
      chime(amount, amount === coins && amount > 2);
      try {
        const r = await bidOnLot(code, amount);
        if (r.ok) apply(r.data);
        else if (r.error === "outbid") {
          // someone got there first: say who, and what it costs now
          await refresh();
          setBeaten("outbid");
        } else if (r.error !== "too_early") toast(te(r.error as ErrorCode));
      } catch {
        toast(te("unknown"));
      } finally {
        setMine(null);
      }
    },
    [code, apply, refresh, toast, te, coins],
  );
  const fold = useCallback(async () => {
    const r = await foldLot(code).catch(() => null);
    if (r?.ok) apply(r.data);
  }, [code, apply]);

  // the keys: 1-9 and 0 bid that amount, space the minimum, P passes
  useEffect(() => {
    if (!started || sold || !inPlay) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable
      )
        return;
      const min = price + 1;
      if (/^[0-9]$/.test(e.key)) {
        const n = e.key === "0" ? 10 : Number(e.key);
        if (canBid && n >= min && n <= coins) void bid(n);
      } else if (e.key === " " && canBid) {
        e.preventDefault();
        void bid(min);
      } else if (e.key.toLowerCase() === "p" && !myPassed) void fold();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canBid, started, sold, inPlay, price, coins, myPassed, bid, fold]);

  const shownBids = mine !== null ? { ...bids, [me.id]: mine } : bids;
  const leader = players.find((p) => p.id === leaderId);

  return (
    <div className="flex w-full max-w-[960px] flex-col items-center gap-3 short:gap-2 sm:gap-4">
      <div className="flex w-full items-center justify-between gap-3">
        <span className="rounded-pill bg-surface px-3.5 py-1.5 font-bold text-[13px] text-ink shadow-card sm:text-sm">
          {t("lot", { n: i + 1, of: lu.lots })}
        </span>
        {nextCard ? <NextLot card={nextCard} /> : <span />}
      </div>

      <LotCard
        key={i}
        card={card}
        sold={sold ? (tag?.by ? "sold" : "unsold") : null}
        winner={
          sold && tag?.by ? players.find((p) => p.id === tag.by) : undefined
        }
      />

      <BidTable
        players={players}
        bids={shownBids}
        leaderId={leaderId}
        passed={passed}
        coins={lu.coins}
        youId={me.id}
        preview={preview && canBid ? preview : null}
        rising={sold && tag?.by ? tag.by : null}
      />

      <div className="flex min-h-7 flex-col items-center text-center">
        {beaten && leader ? (
          <m.p
            key={`${leader.id}-${price}`}
            initial={{ x: -6 }}
            animate={{ x: [6, -4, 2, 0] }}
            className="m-0 font-bold text-[15px] text-no"
          >
            {t("outbid", { name: name(leader, false), price: price + 1 })}
          </m.p>
        ) : sold ? null : (
          <Going />
        )}
      </div>

      {inPlay ? (
        <BidRail
          coins={coins}
          price={price}
          leading={leading}
          passed={myPassed}
          disabled={!canBid}
          onBid={(n) => void bid(n)}
          onPreview={setPreview}
          onPass={() => void fold()}
          hidden={!!sold}
        />
      ) : (
        <p className="m-0 font-semibold text-ink-muted">{t("watching")}</p>
      )}
    </div>
  );
}

/** The lot after this one, small in the corner: worth keeping coins for? */
function NextLot({ card }: { card: LuCard }) {
  const t = useTranslations("lineup.auction");
  return (
    <span className="inline-flex max-w-[55%] items-center gap-2 rounded-pill bg-surface py-1 pr-3 pl-1 shadow-card">
      <span className="w-6 shrink-0 overflow-hidden rounded-[4px]">
        <CardFace card={card} />
      </span>
      <span className="min-w-0 truncate font-semibold text-[12.5px] text-ink-muted">
        {t("next")} <b className="text-ink">{card.name}</b>
      </span>
    </span>
  );
}

/** The lot: its photo taped up, name, work and gosto; stamped when the hammer falls. */
function LotCard({
  card,
  sold,
  winner,
}: {
  card: LuCard | undefined;
  sold: "sold" | "unsold" | null;
  winner: PlayerView | undefined;
}) {
  const t = useTranslations("lineup.auction");
  const name = useDisplayName();
  const tg = useTranslations("common.gostos");
  if (!card) return null;
  const gosto = GOSTOS.find((g) => g.key === card.gosto);
  return (
    <m.div
      className="relative flex flex-col items-center gap-1.5"
      initial={{ opacity: 0, y: -24, scale: 0.9 }}
      animate={
        sold === "sold"
          ? { opacity: [1, 1, 0], y: [0, 0, 140], scale: [1, 1, 0.4] }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={
        sold === "sold"
          ? { duration: 2.2, times: [0, 0.55, 1], ease: "easeIn" }
          : { type: "spring", stiffness: 300, damping: 22 }
      }
    >
      <Sticker card={card} tilt={-2} className="w-[clamp(108px,17vh,168px)]" />
      <b className="mt-1 max-w-[86vw] text-balance text-center font-display font-extrabold text-[clamp(20px,3.4vw,28px)] leading-[1.08]">
        {card.name}
      </b>
      <span className="flex flex-wrap items-center justify-center gap-1.5 font-semibold text-[13px] text-ink-muted">
        {card.origin ? (
          <span className="max-w-[60vw] truncate">{card.origin}</span>
        ) : null}
        {gosto ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-pill bg-sunken px-2 text-ink">
            {gosto.emoji} {tg(`${gosto.key}.name`)}
          </span>
        ) : card.emoji ? (
          <span className="inline-flex h-6 items-center rounded-pill bg-kraft px-2 text-kraft-ink">
            {t("extra")}
          </span>
        ) : null}
        {card.star ? (
          <span className="inline-flex h-6 items-center rounded-pill bg-gold px-2 text-kraft-ink">
            ★ {t("star")}
          </span>
        ) : null}
      </span>
      <AnimatePresence>
        {sold ? (
          <m.span
            key="stamp"
            className="pointer-events-none absolute top-[38%] left-1/2 whitespace-nowrap rounded-[12px] border-[5px] border-no bg-surface/85 px-4 py-1 font-bold font-chalk text-[clamp(30px,5vw,46px)] text-no leading-none"
            initial={{ opacity: 0, scale: 2.2, rotate: -16, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, rotate: -8, x: "-50%" }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
          >
            {sold === "sold" ? t("sold") : t("leftover")}
            {sold === "sold" && winner ? (
              <small className="block text-center font-bold font-sans text-[14px] text-ink">
                {name(winner, winner.isYou)}
              </small>
            ) : null}
          </m.span>
        ) : null}
      </AnimatePresence>
    </m.div>
  );
}

/** The table: a lane per player, their tower and its number, their face and purse at the base. */
function BidTable({
  players,
  bids,
  leaderId,
  passed,
  coins,
  youId,
  preview,
  rising,
}: {
  players: PlayerView[];
  bids: Record<string, number>;
  leaderId: string | null;
  passed: string[];
  coins: Record<string, number>;
  youId: string;
  preview: number | null;
  /** The winner's tower, rising into the photo. */
  rising: string | null;
}) {
  const t = useTranslations("lineup.auction");
  const name = useDisplayName();
  const [peek, setPeek] = useState<PlayerView | null>(null);
  return (
    <div className="relative w-full max-w-[min(100%,1040px)]">
      <div className="relative flex w-full items-stretch rounded-[26px] bg-surface/75 px-1.5 pt-3 pb-2 shadow-card sm:px-3.5">
        {/* the shelf the towers stand on */}
        <span className="pointer-events-none absolute top-[130px] right-2.5 left-2.5 h-2.5 rounded-[6px] bg-gradient-to-b from-wood to-wood-deep shadow-[0_3px_0_rgba(0,0,0,0.18)] sm:top-[152px]" />
        {players.map((p, k) => {
          const bid = bids[p.id] ?? 0;
          const lead = p.id === leaderId;
          const out = passed.includes(p.id);
          const ghost =
            p.id === youId && preview ? Math.max(0, preview - bid) : 0;
          const color = seatColor(p.colorSlot);
          return (
            <div
              key={p.id}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center",
                k > 0 && "border-l-2 border-ink/10 border-dashed",
              )}
            >
              <div
                className="relative flex h-[118px] w-full flex-col items-center justify-end rounded-t-[16px] sm:h-[140px]"
                style={
                  lead
                    ? {
                        background: `linear-gradient(to top, color-mix(in oklab, ${color} 24%, transparent), transparent 85%)`,
                      }
                    : undefined
                }
              >
                {lead || out ? (
                  <span
                    className="absolute top-1 left-1/2 inline-flex h-[18px] -translate-x-1/2 items-center whitespace-nowrap rounded-pill px-1.5 font-extrabold text-[9px] uppercase tracking-[0.05em] sm:h-[22px] sm:px-2.5 sm:text-[11px]"
                    style={
                      lead
                        ? { background: color, color: onSeat(p.colorSlot) }
                        : undefined
                    }
                  >
                    {lead ? (
                      t("leads")
                    ) : (
                      <span className="rounded-pill bg-sunken px-1.5 text-ink-muted">
                        {t("passed")}
                      </span>
                    )}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "mb-1 flex min-h-6 items-end font-mono font-semibold tabular-nums leading-none",
                    lead
                      ? "text-[24px] sm:text-[34px]"
                      : "text-[18px] sm:text-[24px]",
                    out && "opacity-40",
                    ghost > 0 && "opacity-50",
                  )}
                  style={{ color }}
                >
                  {bid + ghost || ""}
                </span>
                <m.div
                  className={cn("w-[min(52px,60%)]", out && "opacity-40")}
                  animate={
                    rising === p.id
                      ? {
                          y: -90,
                          opacity: 0,
                          transition: { delay: 0.5, duration: 0.7 },
                        }
                      : rising
                        ? { opacity: 0.25, y: 8 }
                        : { y: 0, opacity: 1 }
                  }
                >
                  <CoinTower count={bid} ghost={ghost} className="w-full" />
                </m.div>
              </div>
              <button
                type="button"
                onClick={() => setPeek(p)}
                aria-label={t("seeTeam", { name: name(p, p.isYou) })}
                className="mt-3.5 flex w-full flex-col items-center gap-0.5 pt-1 [&>*]:shrink-0"
              >
                <Avatar
                  avatar={p.avatar}
                  size={24}
                  seat={p.colorSlot}
                  className="sm:size-7"
                />
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 font-bold text-[11.5px] leading-tight sm:text-[14px]",
                    p.isYou && "underline decoration-2 underline-offset-[3px]",
                  )}
                  style={p.isYou ? { textDecorationColor: color } : undefined}
                >
                  {name(p, p.isYou)}
                </span>
                <span className="font-mono text-[10.5px] text-ink-muted sm:text-[13px]">
                  {t("has", { coins: coins[p.id] ?? 0 })}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <TeamPeek player={peek} onClose={() => setPeek(null)} />
    </div>
  );
}

/** "Going once… twice… three!" as the lot's clock runs out. */
function Going() {
  const t = useTranslations("lineup.auction");
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 250);
  const left = view.deadline !== null ? view.deadline - now : Infinity;
  if (left > GOING_MS || left <= 0 || (view.stepStartsAt ?? 0) > now)
    return <span className="h-7" />;
  const step =
    left > (GOING_MS * 2) / 3
      ? "once"
      : left > GOING_MS / 3
        ? "twice"
        : "three";
  return (
    <m.span
      key={step}
      initial={{ scale: 1.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="font-display font-extrabold text-[clamp(17px,2.4vw,22px)] text-no"
    >
      {t(`going.${step}`)}
    </m.span>
  );
}

/** Your keys: one per amount from 1 to all your coins; the minimum in orange, below it faded. */
function BidRail({
  coins,
  price,
  leading,
  passed,
  disabled,
  hidden,
  onBid,
  onPreview,
  onPass,
}: {
  coins: number;
  price: number;
  leading: boolean;
  passed: boolean;
  disabled: boolean;
  hidden: boolean;
  onBid: (n: number) => void;
  onPreview: (n: number | null) => void;
  onPass: () => void;
}) {
  const t = useTranslations("lineup.auction");
  const lang = useLocale() as Lang;
  const min = price + 1;
  if (coins <= 0)
    return <p className="m-0 font-semibold text-ink-muted">{t("broke")}</p>;
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-1.5 transition-opacity",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <span className="min-h-[18px] font-bold text-[13px] text-ink-muted">
        {leading ? t("youLead") : coins < min ? t("tooHigh") : t("offer")}
      </span>
      <div className="flex w-full flex-wrap items-end justify-center gap-x-3.5 gap-y-2.5">
        <div
          className="flex max-w-[560px] flex-wrap justify-center gap-1 sm:gap-1.5"
          onPointerLeave={() => onPreview(null)}
        >
          {Array.from({ length: coins }, (_, k) => {
            const n = k + 1;
            const low = n < min;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled || low}
                onClick={() => onBid(n)}
                onPointerEnter={() => onPreview(low ? null : n)}
                onFocus={() => onPreview(low ? null : n)}
                onBlur={() => onPreview(null)}
                aria-label={t("bidN", { n })}
                className={cn(
                  "relative inline-grid h-9 w-[29px] place-items-center rounded-[10px] border-[1.5px] font-mono font-semibold text-[15px] tabular-nums transition-transform sm:h-[46px] sm:w-11 sm:rounded-[14px] sm:text-[19px]",
                  "enabled:hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-sky focus-visible:outline-offset-2",
                  n === min && !leading
                    ? "border-transparent bg-apricot text-on-apricot shadow-[0_3px_0_color-mix(in_oklab,var(--apricot)_55%,#000)]"
                    : "border-line-strong bg-surface text-ink shadow-[0_3px_0_var(--line-strong)]",
                  low && "opacity-30 shadow-none",
                  disabled && !low && "opacity-60",
                )}
              >
                {n.toLocaleString(lang)}
                {n === coins ? (
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-bold text-[8px] text-ink-muted uppercase tracking-[0.04em] sm:-bottom-[15px] sm:text-[10px]">
                    {t("all")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onPass}
          disabled={disabled || passed || leading}
          className="h-9 rounded-pill border-[1.5px] border-line-strong bg-surface px-4.5 font-bold text-[15px] text-ink disabled:opacity-40 sm:h-[46px]"
        >
          {passed ? t("passedYou") : t("pass")}
        </button>
      </div>
    </div>
  );
}
