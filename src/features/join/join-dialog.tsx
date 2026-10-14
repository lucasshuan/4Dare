"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Face } from "@/components/ui/face";
import { useToast } from "@/components/ui/toast";
import { useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { RoomArt } from "@/features/rooms/room-art";
import { LiveDot, pillClass } from "@/features/rooms/room-bits";
import { GAME_KEYS, GAME_SEATS, type GameKey } from "@/game/games";
import { guestAvatar } from "@/game/guest-names";
import type { Avatar, ErrorCode, Lang, PublicRoom } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { meNamed, useDisplayName } from "@/lib/names";
import { newRoom } from "@/lib/routes";
import { seatColor } from "@/lib/seats";
import { joinRoom } from "@/server/actions";
import s from "./join-dialog.module.css";

/**
 * What to join: a room picked from a list, or a quick match ("Play now"),
 * which finds the room with the most people waiting in a game (or in any).
 */
export type JoinRequest =
  | { kind: "room"; room: PublicRoom }
  | { kind: "quick"; game: GameKey | "any" };

/** The room the dialog shows: a listed one, or the one it opens for you. */
interface Shown {
  room: PublicRoom | null;
  game: GameKey;
  name: string;
  host: string;
  seats: number;
  seated: PublicRoom["seated"];
}

type Stage = "search" | "enter" | "found" | "fresh";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The room a quick match lands in: open, public, in your language, the fullest first. */
export function findRoom(
  rooms: PublicRoom[],
  game: GameKey | "any",
  lang: Lang,
): PublicRoom | null {
  return (
    rooms
      .filter(
        (r) =>
          r.status === "open" &&
          !r.locked &&
          r.host.lang === lang &&
          (game === "any" || r.game === game),
      )
      .sort((a, b) => b.players - a.players || a.createdAt - b.createdAt)[0] ??
    null
  );
}

/** A handful of strangers circling the search. */
function useOrbit() {
  return useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        guestAvatar(1 + ((i * 7919 + Date.now()) % 997)),
      ),
    [],
  );
}

/**
 * Taking a seat, shown: the search (or the room's name while it opens), then
 * the room with your seat waiting, your face flying into it and a count of
 * three into the room. "Cancel" or closing stops it before anything happens:
 * only the count's end joins (or, with nothing open, creates a room).
 */
export function JoinDialog({
  request,
  onClose,
}: {
  request: JoinRequest | null;
  onClose: () => void;
}) {
  const t = useTranslations("home.join");
  const tr = useTranslations("home.rooms");
  const te = useTranslations("common.errors");
  const gameName = useGameName();
  const displayName = useDisplayName();
  const lang = useLocale() as Lang;
  const router = useRouter();
  const toast = useToast();
  const still = useReducedMotion() ?? false;
  const { me } = useMe();
  const { rooms } = usePublicRooms();
  const orbit = useOrbit();
  const myFace: Avatar = me?.avatar ?? guestAvatar(1);
  const myName = me ? displayName(meNamed(me)) : "";

  const [stage, setStage] = useState<Stage | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [seated, setSeated] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const token = useRef(0);
  const radarMe = useRef<HTMLSpanElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const from = useRef<DOMRect | null>(null);
  const [fly, setFly] = useState<{ rect: DOMRect } | null>(null);
  const flyRef = useRef<HTMLSpanElement>(null);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  const open = request !== null;
  const roomTitle = (r: PublicRoom) =>
    r.name || tr("roomOf", { name: r.host.name });

  // a fresh request starts the show from the top; the rest is read when it fires
  // biome-ignore lint/correctness/useExhaustiveDependencies: the request is the trigger
  useEffect(() => {
    if (!request) return;
    const my = ++token.current;
    const alive = () => my === token.current;
    setSeated(false);
    setCount(null);
    setShown(null);
    setFly(null);
    void (async () => {
      let room: PublicRoom | null = null;
      if (request.kind === "room") {
        room = request.room;
        setStage("enter");
        await sleep(still ? 200 : 700);
      } else {
        setStage("search");
        await sleep(still ? 600 : 2300);
        room = findRoom(roomsRef.current, request.game, lang);
      }
      if (!alive()) return;
      from.current = radarMe.current?.getBoundingClientRect() ?? null;
      if (room) {
        setShown({
          room,
          game: room.game,
          name: roomTitle(room),
          host: room.host.name,
          seats: room.seats,
          seated: room.seated,
        });
        setStage("found");
      } else {
        const game =
          request.kind === "quick" && request.game !== "any"
            ? request.game
            : GAME_KEYS[Math.floor(Math.random() * GAME_KEYS.length)];
        setShown({
          room: null,
          game,
          name: tr("roomOf", { name: myName }),
          host: myName,
          seats: Math.min(6, GAME_SEATS[game].max),
          seated: [],
        });
        setStage("fresh");
      }
    })();
  }, [request]);

  // the room is on screen: your face flies from the radar into your seat
  useLayoutEffect(() => {
    if ((stage !== "found" && stage !== "fresh") || seated) return;
    const start = from.current;
    if (!start || still) {
      setSeated(true);
      return;
    }
    setFly({ rect: start });
  }, [stage, seated, still]);

  useLayoutEffect(() => {
    const f = flyRef.current;
    const seat = target.current;
    if (!fly || !f || !seat) return;
    const my = token.current;
    const a = fly.rect;
    const b = seat.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const sc = b.width / a.width;
    const anim = f.animate(
      [
        { transform: "translate(0,0) scale(1)" },
        {
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(${(1 + sc) / 2 + 0.1}) rotate(-10deg)`,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${sc})` },
      ],
      { duration: 750, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" },
    );
    anim.finished.then(
      () => {
        if (my !== token.current) return;
        setFly(null);
        setSeated(true);
      },
      () => {},
    );
    return () => anim.cancel();
  }, [fly]);

  const finish = useCallback(
    async (my: number) => {
      if (!shown) return;
      if (!shown.room) {
        router.push(newRoom(shown.game));
        return;
      }
      const code = shown.room.code;
      try {
        const r = await joinRoom(code);
        if (my !== token.current) return;
        if (r.ok) return router.push(`/r/${r.data.code}`);
        // a private room's page asks for the password
        if (r.error === "password_required") return router.push(`/r/${code}`);
        toast(te(r.error as ErrorCode));
      } catch {
        if (my === token.current) toast(te("unknown"));
      }
      if (my === token.current) onClose();
    },
    [shown, router, toast, te, onClose],
  );

  // seated: three, two, one, in (the page around it re-renders as it likes: the count goes on)
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (!seated) return;
    const my = token.current;
    let n = 3;
    setCount(n);
    const id = window.setInterval(
      () => {
        if (my !== token.current) return window.clearInterval(id);
        n -= 1;
        if (n > 0) setCount(n);
        else {
          window.clearInterval(id);
          void finishRef.current(my);
        }
      },
      still ? 250 : 1000,
    );
    return () => window.clearInterval(id);
  }, [seated, still]);
  const code = shown?.room?.code;
  useEffect(() => {
    if (seated && code) router.prefetch(`/r/${code}`);
  }, [seated, code, router]);

  const close = () => {
    token.current++;
    setFly(null);
    onClose();
  };

  const gameLabel = (g: GameKey | "any") =>
    g === "any" ? t("anyGame") : gameName(g);
  const openRooms = rooms.filter(
    (r) =>
      r.status === "open" &&
      r.host.lang === lang &&
      (request?.kind !== "quick" ||
        request.game === "any" ||
        r.game === request.game),
  );
  const reel = (openRooms.length ? openRooms.map(roomTitle) : []).concat(
    openRooms.length ? [] : GAME_KEYS.map((g) => gameName(g)),
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={s.backdrop} />
        <div className={s.viewport}>
          <Dialog.Popup className={s.panel}>
            <Dialog.Close aria-label={t("close")} className={s.close}>
              <X strokeWidth={2} />
            </Dialog.Close>
            {stage === "search" && request?.kind === "quick" ? (
              <>
                <div className={s.head}>
                  <span className={s.eyebrow}>
                    {t("quick", { game: gameLabel(request.game) })}
                  </span>
                  <Dialog.Title>{t("searching")}</Dialog.Title>
                  <p>{t("roomsWaiting", { n: openRooms.length })}</p>
                </div>
                <div className={s.radar}>
                  <span className={s.ring} />
                  <span className={s.ring} />
                  <span className={s.ring} />
                  <div className={s.orbit}>
                    {orbit.map((a, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed ring of seven
                        key={i}
                        className={s.arm}
                        style={
                          { "--a": `${i * (360 / 7)}deg` } as CSSProperties
                        }
                      >
                        <span className={s.armPos}>
                          <span className={s.armUp}>
                            <Face
                              avatar={a}
                              className={s.face}
                              style={
                                {
                                  "--d": `${0.15 + i * 0.12}s`,
                                } as CSSProperties
                              }
                            />
                          </span>
                        </span>
                      </span>
                    ))}
                  </div>
                  <span className={s.me} ref={radarMe}>
                    <Face avatar={myFace} className={s.face} size={100} />
                  </span>
                </div>
                <div className={s.reel} aria-hidden="true">
                  <div className={s.reelTrack}>
                    {[...reel, ...reel].map((n, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: the list runs twice
                      <div key={i}>{n}</div>
                    ))}
                  </div>
                </div>
                <div className={s.foot}>
                  <button type="button" className={s.cancel} onClick={close}>
                    {t("cancel")}
                  </button>
                </div>
              </>
            ) : null}
            {stage === "enter" && request?.kind === "room" ? (
              <>
                <div className={s.head}>
                  <span className={s.eyebrow}>{t("entering")}</span>
                  <Dialog.Title>{roomTitle(request.room)}</Dialog.Title>
                  <p>{gameName(request.room.game)}</p>
                </div>
                <div className={cn(s.radar, s.small)}>
                  <span className={s.ring} />
                  <span className={s.ring} />
                  <span className={s.me} ref={radarMe}>
                    <Face avatar={myFace} className={s.face} size={100} />
                  </span>
                </div>
              </>
            ) : null}
            {(stage === "found" || stage === "fresh") && shown ? (
              <>
                <div className={s.head}>
                  <span className={s.eyebrow}>
                    {stage === "fresh" ? t("fresh") : t("found")}
                  </span>
                  <Dialog.Title>
                    {stage === "fresh" ? t("freshTitle") : t("seatForYou")}
                  </Dialog.Title>
                  <p>
                    {stage === "fresh"
                      ? t("freshBody")
                      : t("waitingHere", {
                          game: gameName(shown.game),
                          n: shown.seated.length,
                        })}
                  </p>
                </div>
                <RoomBox
                  shown={shown}
                  withArt={request?.kind === "quick"}
                  me={myFace}
                  seated={seated}
                  targetRef={target}
                />
                <div className={s.foot}>
                  <div
                    className={cn(s.count, count !== null && s.running)}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 50 50" aria-hidden="true">
                      <circle className={s.countTrack} cx="25" cy="25" r="22" />
                      <circle className={s.countFill} cx="25" cy="25" r="22" />
                    </svg>
                    <b>{count ?? 3}</b>
                  </div>
                  <span>{t("joiningRoom")}</span>
                  <button type="button" className={s.cancel} onClick={close}>
                    {t("cancel")}
                  </button>
                </div>
              </>
            ) : null}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
      {fly
        ? createPortal(
            <span
              ref={flyRef}
              className={s.fly}
              style={{ left: fly.rect.left, top: fly.rect.top }}
            >
              <Face
                avatar={myFace}
                className={s.face}
                size={100}
                style={{ "--s": `${fly.rect.width}px` } as CSSProperties}
              />
            </span>,
            document.body,
          )
        : null}
    </Dialog.Root>
  );
}

/** The room in the dialog: its head (on the home, where it can be any game), name, host and seats, yours waiting. */
function RoomBox({
  shown,
  withArt,
  me,
  seated,
  targetRef,
}: {
  shown: Shown;
  withArt: boolean;
  me: Avatar;
  seated: boolean;
  targetRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const t = useTranslations("home.join");
  const ts = useTranslations("home.rooms.status");
  const gameName = useGameName();
  const mine = shown.seated.length;
  const taken = mine + (seated ? 1 : 0);
  return (
    <div className={s.room}>
      {withArt ? (
        <div className={s.roomTop}>
          <RoomArt game={shown.game} />
          <span className={cn(pillClass("wait"), s.roomPill)}>
            <LiveDot color="currentColor" />
            {ts("wait")}
          </span>
          <span className={s.roomGame}>{gameName(shown.game)}</span>
        </div>
      ) : null}
      <div className={cn(s.roomBody, !withArt && s.bare)}>
        <h3 className={s.roomName}>{shown.name}</h3>
        <p className={s.roomHost}>
          {t("by", { name: shown.host })} ·{" "}
          {t("count", { n: taken, max: shown.seats })}
        </p>
        <div className={s.seats}>
          {Array.from({ length: shown.seats }, (_, i) => {
            const p = shown.seated[i];
            if (p)
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
                <span key={i} className={s.seat}>
                  <Face
                    avatar={p.avatar}
                    className={s.face}
                    style={
                      { "--ring": seatColor(p.colorSlot) } as CSSProperties
                    }
                  />
                </span>
              );
            if (i === mine)
              return seated ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
                <span key={i} className={cn(s.seat, s.pop)}>
                  <Face
                    avatar={me}
                    className={s.face}
                    style={{ "--ring": "var(--sky)" } as CSSProperties}
                  />
                </span>
              ) : (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
                  key={i}
                  ref={targetRef}
                  className={cn(s.seat, s.empty, s.target)}
                />
              );
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: seats are positions
              <span key={i} className={cn(s.seat, s.empty)} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
