"use client";

import { ArrowRight, Lock, Timer } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { keyClass } from "@/components/ui/button";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { MatchGate } from "@/features/current-match/match-lock";
import { useMe } from "@/features/data/use-me";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { gameRooms } from "@/features/home/game-rooms";
import { JoinDialog, type JoinRequest } from "@/features/join/join-dialog";
import { LiveDot, Meter, Seats } from "@/features/rooms/room-bits";
import { secondsRange } from "@/features/rooms/room-row";
import { useRoomChanges } from "@/features/rooms/use-room-changes";
import type { GameKey } from "@/game/games";
import type { Lang, PublicRoom } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { roomsOf } from "@/lib/routes";
import s from "./game-page.module.css";

/** Rooms shown here; the rest are on /rooms. */
const SHOWN = 5;

/**
 * The game's rooms with a free seat, in the page's language, the oldest
 * first (see gameRooms), as live rows: someone sitting down pops their seat
 * and says their name, a room that fills slides away, a new one comes in.
 * "Join" plays the seat-taking show, then opens the room.
 */
export function GameRooms({ game, off }: { game: GameKey; off: boolean }) {
  const t = useTranslations("home.rooms");
  const lang = useLocale() as Lang;
  const { rooms, isLoading } = usePublicRooms();
  const { mine, open } = gameRooms(rooms, game, lang);
  const shown = open.slice(0, SHOWN);
  const changes = useRoomChanges(shown, !isLoading);
  const [join, setJoin] = useState<JoinRequest | null>(null);
  const { me } = useMe();
  const waiting = open.reduce((n, r) => n + r.players, 0);

  return (
    <MatchGate>
      <section className={s.rooms} aria-labelledby="rooms-h">
        <div className={s.roomsHead}>
          <div>
            <h2 id="rooms-h">{t("title")}</h2>
            {open.length ? (
              <small>{t("waiting", { count: waiting })}</small>
            ) : null}
          </div>
          <Link href={roomsOf(game)} className={s.all}>
            {t("seeAll")}
            {mine.length > shown.length ? (
              <span className="text-ink-muted">({mine.length})</span>
            ) : null}
            <ArrowRight strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        {isLoading ? (
          <div className={s.skeleton} />
        ) : (
          <LayoutMotion>
            <ul className={s.list}>
              <AnimatePresence initial={false} mode="popLayout">
                {shown.map((r) => (
                  <GameRoomRow
                    key={r.code}
                    room={r}
                    me={me?.avatar ?? null}
                    entered={changes.entered.has(r.code)}
                    sat={changes.sat.get(r.code) ?? null}
                    off={off}
                    onJoin={() => setJoin({ kind: "room", room: r })}
                  />
                ))}
              </AnimatePresence>
              {shown.length === 0 ? (
                <m.li layout="position" className={s.empty}>
                  {mine.length ? t("noOpen") : t("empty")}
                </m.li>
              ) : null}
            </ul>
          </LayoutMotion>
        )}
      </section>
      <JoinDialog request={join} onClose={() => setJoin(null)} />
    </MatchGate>
  );
}

function GameRoomRow({
  room: r,
  me,
  entered,
  sat,
  off,
  onJoin,
}: {
  room: PublicRoom;
  me: PublicRoom["seated"][number]["avatar"] | null;
  entered: boolean;
  sat: { seat: number; name: string } | null;
  off: boolean;
  onJoin: () => void;
}) {
  const t = useTranslations("home.rooms");
  const tj = useTranslations("home.join");
  const title = r.name || t("roomOf", { name: r.host.name });
  const seconds = secondsRange(r);
  return (
    <m.li
      layout="position"
      exit={{
        opacity: 0,
        x: 24,
        transition: { duration: 0.28, ease: "easeIn" },
      }}
      className={cn(
        "room-hover",
        s.room,
        entered && s.enter,
        r.seats >= 8 && s.many,
      )}
    >
      <div className={s.roomT}>
        <b className={s.roomName}>
          <span>{title}</span>
          {r.locked ? (
            <Lock aria-label={t("locked")} strokeWidth={2.25} />
          ) : null}
        </b>
        <span className={s.roomMeta}>
          <LiveDot />
          <span className={s.roomHost}>{tj("by", { name: r.host.name })}</span>
          <span
            className={s.roomTime}
            title={t("meta", {
              players: r.players,
              seats: r.seats,
              seconds,
            })}
          >
            <Timer strokeWidth={2} aria-hidden="true" />
            {seconds} s
          </span>
        </span>
      </div>
      <button
        type="button"
        disabled={off}
        onClick={onJoin}
        aria-label={t("joinRoom", { name: title })}
        className={keyClass("sky", { className: s.join })}
      >
        {r.locked ? <Lock aria-hidden="true" /> : null}
        {t("join")}
      </button>
      <Seats
        className={s.roomSeats}
        seated={r.seated}
        seats={r.seats}
        open
        me={me}
        fresh={sat?.seat}
        joined={sat?.name ? t("joined", { name: sat.name }) : null}
      />
      <span className={s.roomCount}>
        <Meter
          className={s.roomMeter}
          taken={r.players}
          seats={r.seats}
          fresh={sat?.seat}
        />
        <small>
          {t.rich("count", {
            n: r.players,
            max: r.seats,
            b: (chunks) => <b>{chunks}</b>,
          })}
        </small>
      </span>
    </m.li>
  );
}
