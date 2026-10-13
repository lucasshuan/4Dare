"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  ArrowLeftRight,
  Ban,
  Check,
  CircleDashed,
  CircleSlash,
  Crown,
  Eye,
  Flag,
  MessageSquare,
  MessageSquareOff,
  UserRoundX,
  X,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, type Ref, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { useWatchers, watchersKey } from "@/features/data/use-watchers";
import { PersonCard } from "@/features/profile/person-card";
import { SEAT_COLORS } from "@/game/seat-colors";
import type { PlayerView, WatcherView } from "@/game/types";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatWash } from "@/lib/seats";
import {
  kickPlayer,
  moveSomeone,
  mutePlayer,
  playInstead,
  watchInstead,
} from "@/server/actions";
import {
  DragBoard,
  type DragItem,
  type DropTarget,
  dropProps,
  useBoard,
  useDropState,
  type Verdict,
} from "./drag-board";
import { type SeatAction, SeatMenu } from "./host-controls";
import { ReportDialog, type ReportTarget } from "./report-dialog";

/** A move between the seats and the watchers, as the server takes it (moveSomeone). */
type Move = Parameters<typeof moveSomeone>[1];

const layoutSpring = { type: "spring", stiffness: 520, damping: 40 } as const;

const cellIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: dur.base, ease: ease.soft },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: dur.fast, ease: ease.soft },
  },
} as const;

const asWatcher = (p: PlayerView): WatcherView => ({
  id: p.id,
  isYou: p.isYou,
  isGuest: p.isGuest,
  name: p.name,
  avatar: p.avatar,
});

/** Someone watching, seated for the moment the server takes to say so. */
const asPlayer = (
  w: WatcherView,
  colorSlot: number,
  seat: number,
): PlayerView => ({
  id: w.id,
  isYou: w.isYou,
  isHost: false,
  isGuest: w.isGuest,
  name: w.name,
  avatar: w.avatar,
  ready: false,
  status: "not_ready",
  seat,
  colorSlot,
  turnOrder: null,
  isTurn: false,
  card: null,
  cardHidden: false,
  pickedById: null,
  discoveredAt: null,
  place: null,
  gaveUp: false,
  away: false,
});

const freeColor = (players: PlayerView[]) => {
  const held = new Set(players.map((p) => p.colorSlot));
  for (let i = 0; i < SEAT_COLORS; i++) if (!held.has(i)) return i;
  return 0;
};

/** The lists as they will be once `move` lands: shown at once, the server follows. */
function applyMove(
  players: PlayerView[],
  watchers: WatcherView[],
  total: number,
  move: Move | null,
) {
  if (!move) return { players, watchers, total };
  const P = [...players];
  const W = [...watchers];
  const pi = (id: string) => P.findIndex((p) => p.id === id);
  const wi = (id: string) => W.findIndex((w) => w.id === id);
  switch (move.kind) {
    case "swap-players": {
      const [i, j] = [pi(move.a), pi(move.b)];
      if (i >= 0 && j >= 0) [P[i], P[j]] = [P[j], P[i]];
      return { players: P, watchers: W, total };
    }
    case "swap-watchers": {
      const [i, j] = [wi(move.a), wi(move.b)];
      if (i >= 0 && j >= 0) [W[i], W[j]] = [W[j], W[i]];
      return { players: P, watchers: W, total };
    }
    case "swap-seat": {
      const [i, j] = [pi(move.seated), wi(move.watcher)];
      if (i < 0 || j < 0) return { players, watchers, total };
      const seated = P[i];
      P[i] = asPlayer(W[j], seated.colorSlot, i);
      W[j] = asWatcher(seated);
      return { players: P, watchers: W, total };
    }
    case "stand": {
      const i = pi(move.id);
      if (i < 0) return { players, watchers, total };
      W.push(asWatcher(P[i]));
      P.splice(i, 1);
      return { players: P, watchers: W, total: total + 1 };
    }
    case "seat": {
      const j = wi(move.id);
      if (j < 0) return { players, watchers, total };
      const at = Math.min(move.at ?? P.length, P.length);
      P.splice(at, 0, asPlayer(W[j], freeColor(P), at));
      W.splice(j, 1);
      return { players: P, watchers: W, total: Math.max(0, total - 1) };
    }
  }
}

/**
 * Who is in the room: the seats (players, then free seats, then for the host
 * the closed ones) and below them whoever watches. Each card is small and
 * upright, so many fit. Every card has a menu of what the viewer can do with
 * that person (the host can do most); the host also drags cards around:
 * players trade places, someone watching takes a seat, a player goes to
 * watch.
 */
export function People({
  players,
  seats,
  slots,
  canClose,
  onSeats,
  onKick,
  onMakeHost,
}: {
  players: PlayerView[];
  /** Open seats, the taken ones included. */
  seats: number;
  /** Seats shown: every one the game allows for the host, the open ones for everyone else. */
  slots: number;
  canClose: boolean;
  onSeats: (seats: number) => void;
  onKick: (id: string, ban: boolean) => void;
  onMakeHost: (id: string) => void;
}) {
  const t = useTranslations("lobby");
  const name = useDisplayName();
  const client = useQueryClient();
  const { code, view, me, watching } = useRoomContext();
  const { act, pending } = useRoomAction();
  const list = useWatchers(code, watching);
  const [move, setMove] = useState<Move | null>(null);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const host = me.isHost;
  const open = view.phase === "lobby" && !view.starting;
  const muted = new Set(view.muted);

  const shown = applyMove(
    players,
    (list?.watchers ?? []).filter((w) => !leaving.includes(w.id)),
    list?.total ?? 0,
    move,
  );
  const free = shown.players.length < seats;
  const hostId = view.hostId;

  const refreshWatchers = () =>
    client.invalidateQueries({ queryKey: watchersKey(code) });

  /** Shows `next` at once and asks the server; a refusal puts things back. */
  const go = async (
    next: Move | null,
    action: () => ReturnType<typeof act>,
  ) => {
    setMove(next);
    await act(action);
    await refreshWatchers();
    setMove(null);
  };
  const doMove = (next: Move) => go(next, () => moveSomeone(code, next));

  const kickWatcher = async (id: string, ban: boolean) => {
    setLeaving((ids) => [...ids, id]);
    await act(() => kickPlayer(code, id, ban));
    await refreshWatchers();
    setLeaving((ids) => ids.filter((x) => x !== id));
  };

  const verdict = (item: DragItem, target: DropTarget): Verdict | null => {
    if (!host || !open) return null;
    const other = (id: string) =>
      shown.players.find((p) => p.id === id) ??
      shown.watchers.find((w) => w.id === id);
    if (item.kind === "player") {
      if (target.kind === "player")
        return { label: t("dropSwap"), icon: ArrowLeftRight };
      if (item.id === hostId) return null;
      if (target.kind === "watcher") {
        const w = other(target.id);
        return w
          ? {
              label: t("dropSwapWith", { name: w.name }),
              icon: ArrowLeftRight,
            }
          : null;
      }
      if (target.kind === "watchers")
        return { label: t("dropWatch"), icon: Eye };
      return null;
    }
    if (target.kind === "player") {
      if (target.id === hostId) return null;
      const p = other(target.id);
      return p
        ? {
            label: t("dropSwapWith", { name: p.name }),
            icon: ArrowLeftRight,
          }
        : null;
    }
    if (target.kind === "seat")
      return free ? { label: t("dropSeat"), icon: Armchair } : null;
    if (target.kind === "watcher")
      return { label: t("dropSwap"), icon: ArrowLeftRight };
    return null;
  };

  const onDrop = (item: DragItem, target: DropTarget) => {
    const next: Move | null =
      item.kind === "player"
        ? target.kind === "player"
          ? { kind: "swap-players", a: item.id, b: target.id }
          : target.kind === "watcher"
            ? { kind: "swap-seat", seated: item.id, watcher: target.id }
            : target.kind === "watchers"
              ? { kind: "stand", id: item.id }
              : null
        : target.kind === "player"
          ? { kind: "swap-seat", seated: target.id, watcher: item.id }
          : target.kind === "seat"
            ? { kind: "seat", id: item.id, at: Number(target.id) }
            : target.kind === "watcher"
              ? { kind: "swap-watchers", a: item.id, b: target.id }
              : null;
    if (next) void doMove(next);
  };

  /** What the viewer can do with someone here, most harmless first. */
  const actionsFor = (
    person: {
      id: string;
      name: string;
      isYou: boolean;
      avatar: PlayerView["avatar"];
    },
    seated: boolean,
  ): SeatAction[] => {
    const out: SeatAction[] = [];
    const isHost = person.id === hostId;
    if (person.isYou) {
      if (open && seated && !isHost)
        out.push({
          label: t("watchInstead"),
          icon: Eye,
          run: () =>
            void go({ kind: "stand", id: person.id }, () => watchInstead(code)),
        });
      if (open && !seated && free)
        out.push({
          label: t("playInstead"),
          icon: Armchair,
          run: () =>
            void go({ kind: "seat", id: person.id }, () => playInstead(code)),
        });
      return out;
    }
    if (host && seated && open)
      out.push({
        label: t("makeHost"),
        icon: Crown,
        confirm: {
          title: t("makeHostTitle", { name: person.name }),
          body: t("makeHostBody"),
          yes: t("makeHostYes"),
        },
        run: () => onMakeHost(person.id),
      });
    if (host && open && seated)
      out.push({
        label: t("moveToWatchers"),
        icon: Eye,
        run: () => void doMove({ kind: "stand", id: person.id }),
      });
    if (host && open && !seated && free)
      out.push({
        label: t("seatWatcher"),
        icon: Armchair,
        run: () => void doMove({ kind: "seat", id: person.id }),
      });
    if (host) {
      const silenced = muted.has(person.id);
      out.push({
        label: t(silenced ? "unmute" : "mute"),
        icon: silenced ? MessageSquare : MessageSquareOff,
        run: () => void act(() => mutePlayer(code, person.id, !silenced)),
      });
    }
    out.push({
      label: t("report"),
      icon: Flag,
      run: () =>
        setReporting({
          id: person.id,
          name: person.name,
          avatar: person.avatar,
        }),
    });
    // a player is only taken out of the lobby; someone watching, any time
    if (host && (!seated || view.phase === "lobby")) {
      out.push({
        label: t("kick"),
        icon: UserRoundX,
        danger: true,
        confirm: {
          title: t("kickTitle", { name: person.name }),
          body: t("kickBody"),
          yes: t("kickYes"),
        },
        run: () =>
          seated
            ? onKick(person.id, false)
            : void kickWatcher(person.id, false),
      });
      out.push({
        label: t("ban"),
        icon: Ban,
        danger: true,
        confirm: {
          title: t("banTitle", { name: person.name }),
          body: t("banBody"),
          yes: t("banYes"),
        },
        run: () =>
          seated ? onKick(person.id, true) : void kickWatcher(person.id, true),
      });
    }
    return out;
  };

  const seatAction = (i: number): SeatAction | null => {
    if (!host) return null;
    if (i < seats)
      return canClose
        ? {
            label: t("closeSeat"),
            icon: CircleSlash,
            run: () => onSeats(seats - 1),
          }
        : null;
    return {
      label: t("openSeat"),
      icon: CircleDashed,
      run: () => onSeats(seats + 1),
    };
  };

  const empty = Math.max(0, slots - shown.players.length);
  // a player gets up to watch from the watchers' heading; someone watching sits
  // down with the lobby's big key, or on a free seat
  const canWatch = open && !watching && !me.isHost;

  return (
    <LayoutMotion>
      <DragBoard enabled={host && open} verdict={verdict} onDrop={onDrop}>
        <div className="flex flex-col gap-5">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.players.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  displayName={name(p, p.isYou)}
                  muted={muted.has(p.id)}
                  actions={actionsFor({ ...p, name: p.name }, true)}
                  menuLabel={t("playerActions", { name: p.name })}
                />
              ))}
              {Array.from({ length: empty }, (_, k) => {
                const i = shown.players.length + k;
                return (
                  <SeatCell
                    key={`seat-${i}`}
                    index={i}
                    open={i < seats}
                    action={seatAction(i)}
                    onSit={
                      watching && open && i < seats
                        ? () =>
                            void go({ kind: "seat", id: me.id }, () =>
                              playInstead(code),
                            )
                        : null
                    }
                  />
                );
              })}
            </AnimatePresence>
          </ul>

          <WatchersArea
            total={shown.total}
            self={
              canWatch ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    void go({ kind: "stand", id: me.id }, () =>
                      watchInstead(code),
                    )
                  }
                >
                  <Eye strokeWidth={1.75} />
                  {t("watchInstead")}
                </Button>
              ) : null
            }
          >
            {shown.watchers.map((w) => (
              <WatcherCard
                key={w.id}
                watcher={w}
                displayName={name(w, w.isYou)}
                muted={muted.has(w.id)}
                actions={actionsFor(w, false)}
                menuLabel={t("watcherActions", { name: w.name })}
              />
            ))}
            {shown.total > shown.watchers.length ? (
              <li className="flex items-center justify-center rounded-md px-2 py-3 text-center font-semibold text-[12px] text-ink-muted">
                {t("watchersMore", {
                  count: shown.total - shown.watchers.length,
                })}
              </li>
            ) : null}
          </WatchersArea>
        </div>
        <ReportDialog
          code={code}
          target={reporting}
          onClose={() => setReporting(null)}
        />
      </DragBoard>
    </LayoutMotion>
  );
}

/** A drop target's highlight: a ring where it would land, with what it would do above it. */
function DropRing({
  over,
  open,
  verdict,
}: {
  over: boolean;
  open: boolean;
  verdict: Verdict | null;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-md transition-[box-shadow,opacity] duration-150 ease-soft",
          over
            ? "opacity-100 shadow-[0_0_0_2.5px_var(--color-sky),0_0_0_6px_color-mix(in_oklab,var(--color-sky)_22%,transparent)]"
            : open
              ? "opacity-100 shadow-[0_0_0_1.5px_color-mix(in_oklab,var(--color-sky)_45%,transparent)]"
              : "opacity-0",
        )}
      />
      <AnimatePresence>
        {over && verdict ? (
          <m.span
            key={verdict.label}
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 600, damping: 32 }}
            className="pointer-events-none absolute -bottom-3 left-1/2 z-10 flex max-w-[calc(100%+24px)] -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill bg-sky px-2.5 py-1 font-semibold text-[11px] text-on-sky leading-none shadow-pop"
          >
            <verdict.icon className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="truncate">{verdict.label}</span>
          </m.span>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ReadyDot({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "absolute -right-1 -bottom-1 flex size-5.5 items-center justify-center rounded-pill ring-2 ring-[var(--ring-gap,var(--color-surface))] transition-colors duration-300",
        ready ? "bg-yes text-on-yes" : "bg-no-soft text-no",
      )}
    >
      {ready ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : (
        <X className="size-3.5" strokeWidth={3} />
      )}
    </span>
  );
}

function MutedMark({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-pill bg-no-soft text-no"
    >
      <MessageSquareOff className="size-3.5" strokeWidth={2.25} />
    </span>
  );
}

/** What a player's card shows; the floating copy while it is carried too. */
function PlayerFace({
  player,
  displayName,
  muted,
  avatar,
}: {
  player: PlayerView;
  displayName: string;
  muted: boolean;
  avatar?: ReactNode;
}) {
  const t = useTranslations("lobby");
  return (
    <div
      style={seatWash(player.colorSlot)}
      className="relative flex h-full flex-col items-center gap-1.5 rounded-md px-2 pt-4 pb-3 text-center"
    >
      {avatar ?? (
        <span className="relative">
          <Avatar avatar={player.avatar} size={52} seat={player.colorSlot} />
          {player.isHost ? null : (
            <ReadyDot
              ready={player.ready}
              label={player.ready ? t("ready") : t("notReady")}
            />
          )}
        </span>
      )}
      <span className="mt-0.5 w-full truncate font-semibold text-sm leading-tight">
        {displayName}
      </span>
      <span className="inline-flex max-w-full items-center gap-1 truncate font-medium text-[12px] text-ink-muted leading-tight">
        {player.isHost ? (
          <>
            <Crown className="size-3.5 shrink-0" strokeWidth={1.75} />
            {t("host")}
          </>
        ) : player.ready ? (
          t("readyShort")
        ) : (
          t("notReadyShort")
        )}
      </span>
      {muted ? <MutedMark label={t("muted")} /> : null}
    </div>
  );
}

function PlayerCard({
  ref,
  player,
  displayName,
  muted,
  actions,
  menuLabel,
}: {
  ref?: Ref<HTMLLIElement>;
  player: PlayerView;
  displayName: string;
  muted: boolean;
  actions: SeatAction[];
  menuLabel: string;
}) {
  const t = useTranslations("lobby");
  const board = useBoard();
  const target: DropTarget = { kind: "player", id: player.id };
  const drop = useDropState(target);
  const lifted = board.lifted?.id === player.id;
  const hidden = board.landing === player.id;
  const face = (avatar?: ReactNode) => (
    <PlayerFace
      player={player}
      displayName={displayName}
      muted={muted}
      avatar={avatar}
    />
  );
  return (
    <m.li
      ref={ref}
      layout="position"
      layoutId={`person-${player.id}`}
      transition={{ layout: layoutSpring }}
      {...cellIn}
      data-person={player.id}
      {...dropProps(target)}
      onPointerDown={(e) =>
        board.start(e, { kind: "player", id: player.id }, () => face())
      }
      aria-roledescription={board.enabled ? t("dragHint") : undefined}
      className={cn(
        "relative min-h-[132px] rounded-md",
        board.enabled && "cursor-grab touch-manipulation select-none",
      )}
    >
      <div
        className={cn(
          "h-full transition-[opacity,transform] duration-150 ease-soft",
          lifted &&
            "scale-95 opacity-30 [&>div]:outline-2 [&>div]:outline-line-strong [&>div]:outline-dashed",
          hidden && "opacity-0",
          drop.over && "scale-[1.03]",
        )}
      >
        {face(
          <span className="relative" data-no-drag="">
            <PersonCard
              person={{ ...player, name: displayName }}
              className="block rounded-pill"
            >
              <Avatar
                avatar={player.avatar}
                size={52}
                seat={player.colorSlot}
              />
            </PersonCard>
            {player.isHost ? null : (
              <ReadyDot
                ready={player.ready}
                label={player.ready ? t("ready") : t("notReady")}
              />
            )}
          </span>,
        )}
      </div>
      {actions.length ? (
        <SeatMenu
          compact
          label={menuLabel}
          actions={actions}
          className="absolute top-1 right-1"
        />
      ) : null}
      <DropRing over={drop.over} open={drop.open} verdict={drop.verdict} />
    </m.li>
  );
}

/** A free seat (someone watching can land here, or take it with a tap) or, for the host, a closed one. */
function SeatCell({
  ref,
  index,
  open,
  action,
  onSit,
}: {
  ref?: Ref<HTMLLIElement>;
  index: number;
  open: boolean;
  action: SeatAction | null;
  onSit: (() => void) | null;
}) {
  const t = useTranslations("lobby");
  const target: DropTarget = { kind: "seat", id: String(index) };
  const drop = useDropState(target);
  const body = (
    <>
      {open ? (
        <span className="flex size-13 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-line-strong border-dashed font-bold font-display text-lg">
          ?
        </span>
      ) : (
        // a struck-through ring: nobody sits here
        <span className="relative flex size-13 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-line-strong/70 bg-canvas">
          <span className="h-[1.5px] w-7 -rotate-45 rounded-pill bg-line-strong/70" />
        </span>
      )}
      <span className="mt-0.5 font-medium text-[13px] leading-tight">
        {onSit ? t("sitHere") : t(open ? "emptySeat" : "closedSeat")}
      </span>
    </>
  );
  return (
    <m.li
      ref={ref}
      layout="position"
      transition={{ layout: layoutSpring }}
      {...cellIn}
      {...(open ? dropProps(target) : {})}
      className="relative min-h-[132px]"
    >
      {onSit ? (
        <button
          type="button"
          onClick={onSit}
          className="flex size-full flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-line border-dashed px-2 py-3 text-center text-ink-muted transition-colors duration-150 ease-soft hover:border-sky hover:bg-sky-soft hover:text-sky"
        >
          {body}
        </button>
      ) : (
        <div
          className={cn(
            "flex size-full flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] px-2 py-3 text-center text-ink-muted",
            open
              ? "border-line border-dashed"
              : "border-line bg-[repeating-linear-gradient(-45deg,transparent_0_9px,var(--line)_9px_10.5px)]",
          )}
        >
          {body}
        </div>
      )}
      {action ? (
        <SeatMenu
          compact
          label={t("seatActions")}
          actions={[action]}
          className="absolute top-1 right-1"
        />
      ) : null}
      <DropRing over={drop.over} open={drop.open} verdict={drop.verdict} />
    </m.li>
  );
}

/** The watchers under the seats: a heading with the viewer's own switch, and a drop area for the host. */
function WatchersArea({
  total,
  self,
  children,
}: {
  total: number;
  self: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("lobby");
  const target: DropTarget = { kind: "watchers", id: "all" };
  const drop = useDropState(target);
  return (
    <section
      {...dropProps(target)}
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border-[1.5px] border-transparent p-2 -m-2 transition-colors duration-150 ease-soft",
        drop.open && "border-dashed border-sky/50",
        drop.over && "border-sky bg-sky-soft/60",
      )}
    >
      <div className="flex min-h-9 items-center gap-2">
        <Eye className="size-4.5 text-ink-muted" strokeWidth={2} />
        <h3 className="m-0 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
          {t("watchers")}
        </h3>
        <m.span
          key={total}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="rounded-pill bg-sunken px-2 font-semibold text-ink-muted text-xs/5 tabular-nums"
        >
          {total}
        </m.span>
        <div className="ml-auto">{self}</div>
      </div>
      {total ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {children}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="m-0 rounded-md border-[1.5px] border-line border-dashed px-4 py-5 text-center text-[13px] text-ink-muted">
          {t("watchersEmpty")}
        </p>
      )}
      <AnimatePresence>
        {drop.over && drop.verdict ? (
          <m.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="pointer-events-none absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill bg-sky px-2.5 py-1 font-semibold text-[11px] text-on-sky leading-none shadow-pop"
          >
            <drop.verdict.icon className="size-3.5" strokeWidth={2.25} />
            {drop.verdict.label}
          </m.span>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function WatcherFace({
  watcher,
  displayName,
  muted,
  avatar,
}: {
  watcher: WatcherView;
  displayName: string;
  muted: boolean;
  avatar?: ReactNode;
}) {
  const t = useTranslations("lobby");
  return (
    <div className="relative flex h-full flex-col items-center gap-1 rounded-md bg-sunken px-1.5 pt-3 pb-2 text-center">
      {avatar ?? <Avatar avatar={watcher.avatar} size={36} />}
      <span className="w-full truncate font-medium text-[12px] leading-tight">
        {displayName}
      </span>
      {muted ? <MutedMark label={t("muted")} /> : null}
    </div>
  );
}

/** Someone watching: no seat, so no colour, smaller. */
function WatcherCard({
  ref,
  watcher,
  displayName,
  muted,
  actions,
  menuLabel,
}: {
  ref?: Ref<HTMLLIElement>;
  watcher: WatcherView;
  displayName: string;
  muted: boolean;
  actions: SeatAction[];
  menuLabel: string;
}) {
  const t = useTranslations("lobby");
  const board = useBoard();
  const target: DropTarget = { kind: "watcher", id: watcher.id };
  const drop = useDropState(target);
  const lifted = board.lifted?.id === watcher.id;
  const hidden = board.landing === watcher.id;
  const face = (avatar?: ReactNode) => (
    <WatcherFace
      watcher={watcher}
      displayName={displayName}
      muted={muted}
      avatar={avatar}
    />
  );
  return (
    <m.li
      ref={ref}
      layout="position"
      layoutId={`person-${watcher.id}`}
      transition={{ layout: layoutSpring }}
      {...cellIn}
      data-person={watcher.id}
      {...dropProps(target)}
      onPointerDown={(e) =>
        board.start(e, { kind: "watcher", id: watcher.id }, () => face())
      }
      aria-roledescription={board.enabled ? t("dragHint") : undefined}
      className={cn(
        "relative min-h-[84px] rounded-md",
        board.enabled && "cursor-grab touch-manipulation select-none",
      )}
    >
      <div
        className={cn(
          "h-full transition-[opacity,transform] duration-150 ease-soft",
          lifted &&
            "scale-95 opacity-30 [&>div]:outline-2 [&>div]:outline-line-strong [&>div]:outline-dashed",
          hidden && "opacity-0",
          drop.over && "scale-[1.04]",
        )}
      >
        {face(
          <span data-no-drag="">
            <PersonCard
              person={{ ...watcher, name: displayName }}
              className="block rounded-pill"
            >
              <Avatar avatar={watcher.avatar} size={36} />
            </PersonCard>
          </span>,
        )}
      </div>
      {actions.length ? (
        <SeatMenu
          compact
          label={menuLabel}
          actions={actions}
          className="absolute top-0.5 right-0.5 size-6"
        />
      ) : null}
      <DropRing over={drop.over} open={drop.open} verdict={drop.verdict} />
    </m.li>
  );
}
