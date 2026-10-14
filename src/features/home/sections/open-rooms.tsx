"use client";

import { ArrowRight, Eye, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { keyClass } from "@/components/ui/button";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useMe } from "@/features/data/use-me";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import type { JoinRequest } from "@/features/join/join-dialog";
import { LazyJoinDialog } from "@/features/join/lazy-join-dialog";
import { RoomArt } from "@/features/rooms/room-art";
import { LiveDot, Meter, RoomStatus, Seats } from "@/features/rooms/room-bits";
import { useRoomChanges } from "@/features/rooms/use-room-changes";
import { GAME_KEYS, type GameKey } from "@/game/games";
import type { Avatar, PublicRoom } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { NEW_ROOM, newRoom, ROOMS } from "@/lib/routes";
import s from "./sections.module.css";

const SHOWN = 9;
type Filter = GameKey | "all";

/** Rooms waiting for people first, the fullest first; then the ones playing. */
const order = (a: PublicRoom, b: PublicRoom) =>
  Number(b.status === "open") - Number(a.status === "open") ||
  b.players - a.players ||
  a.createdAt - b.createdAt;

/** The clock the pills read ("just opened"), ticking slowly. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * The rooms open right now, every game and language: filter by game, or
 * only those with a free seat. A card shows the game's little scene, what's
 * going on, who sits there and how full it is; "Join" plays the way in, a
 * match under way can be watched. New rooms and new seats show as they come.
 */
export function OpenRooms() {
  const t = useTranslations("home.sections.rooms");
  const { rooms, isLoading } = usePublicRooms();
  const { me } = useMe();
  const { match } = useCurrentMatch();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [join, setJoin] = useState<JoinRequest | null>(null);
  const now = useNow();
  const sorted = rooms.slice().sort(order);
  const shown = sorted
    .filter(
      (r) =>
        (filter === "all" || r.game === filter) &&
        (!onlyOpen || r.status === "open"),
    )
    .slice(0, SHOWN);
  const changes = useRoomChanges(shown, !isLoading);
  const openOf = (f: Filter) =>
    rooms.filter((r) => r.status === "open" && (f === "all" || r.game === f))
      .length;
  const gameName = useGameName();

  return (
    <section className={s.sec} aria-labelledby="rooms-h">
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>
            <LiveDot />
            {t("eyebrow", { n: rooms.length })}
          </span>
          <h2 id="rooms-h">{t("title")}</h2>
          <p>{t("sub")}</p>
        </div>
        <Link href={ROOMS} className={s.link}>
          {t("seeAll")}
          <ArrowRight strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <div className={s.filters}>
        {(["all", ...GAME_KEYS] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(s.chip, f === "all" && s.plain)}
          >
            {f === "all" ? null : <GameThumb game={f} size="xs" />}
            {f === "all" ? t("all") : gameName(f)}
            <span className={s.n}>{isLoading ? "" : openOf(f)}</span>
          </button>
        ))}
        <span className={s.spacer} />
        <button
          type="button"
          role="switch"
          aria-checked={onlyOpen}
          onClick={() => setOnlyOpen((v) => !v)}
          className={s.switch}
        >
          <span className={s.tr} aria-hidden="true" />
          {t("onlyOpen")}
        </button>
      </div>
      {isLoading ? (
        <div className={s.grid} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(s.rc, "h-[272px] animate-pulse bg-sunken")}
            />
          ))}
        </div>
      ) : shown.length ? (
        <div className={s.grid}>
          {shown.map((r) => (
            <RoomCard
              key={r.code}
              room={r}
              now={now}
              me={me?.avatar ?? null}
              entered={changes.entered.has(r.code)}
              sat={changes.sat.get(r.code) ?? null}
              off={!!match}
              onJoin={() => setJoin({ kind: "room", room: r })}
            />
          ))}
        </div>
      ) : (
        <p className={cn(s.grid, s.none)}>
          <span>{filter === "all" ? t("noneAll") : t("none")}</span>
          <span>
            <button
              type="button"
              disabled={!!match}
              onClick={() =>
                router.push(filter === "all" ? NEW_ROOM : newRoom(filter))
              }
            >
              {t("create")}
              <ArrowRight strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        </p>
      )}
      <LazyJoinDialog request={join} onClose={() => setJoin(null)} />
    </section>
  );
}

function RoomCard({
  room: r,
  now,
  me,
  entered,
  sat,
  off,
  onJoin,
}: {
  room: PublicRoom;
  now: number;
  me: Avatar | null;
  entered: boolean;
  sat: { seat: number; name: string } | null;
  off: boolean;
  onJoin: () => void;
}) {
  const t = useTranslations("home.sections.rooms");
  const tr = useTranslations("home.rooms");
  const tj = useTranslations("home.join");
  const locale = useLocale();
  const gameName = useGameName();
  const title = r.name || tr("roomOf", { name: r.host.name });
  const open = r.status === "open";
  return (
    <article className={cn("room-hover", s.rc, entered && s.enter)}>
      <div className={s.top} aria-hidden="true">
        <RoomArt game={r.game} className={s.topArt} />
        <RoomStatus room={r} now={now} className={s.pill} />
        <span className={s.gname}>{gameName(r.game)}</span>
      </div>
      <div className={s.body}>
        <span className={s.mini}>
          <GameThumb game={r.game} size="sm" />
        </span>
        <div className={s.title}>
          <h3 className={s.name}>
            <span>{title}</span>
            {r.locked ? (
              <Lock aria-label={tr("locked")} strokeWidth={2.25} />
            ) : null}
          </h3>
        </div>
        <p className={s.host}>
          <span className={s.st}>
            <RoomStatus room={r} now={now} />
          </span>
          {/* biome-ignore lint/performance/noImgElement: a tiny static svg */}
          <img
            className={s.flag}
            src={`/icons/flag-${r.host.lang}.svg`}
            alt={new Intl.DisplayNames([locale], { type: "language" }).of(
              r.host.lang,
            )}
            width={18}
            height={18}
          />
          <span className={s.by}>{tj("by", { name: r.host.name })}</span>
          {r.watching ? (
            <span className={s.eye} title={t("watchers", { n: r.watching })}>
              · <Eye strokeWidth={2} aria-hidden="true" />
              {r.watching}
            </span>
          ) : null}
        </p>
        <Seats
          className={s.seats}
          seated={r.seated}
          seats={r.seats}
          open={open}
          me={me}
          fresh={sat?.seat}
          joined={sat?.name ? tr("joined", { name: sat.name }) : null}
        />
        <div className={s.foot}>
          <span className={s.meter}>
            <Meter
              className={s.bar}
              taken={r.players}
              seats={r.seats}
              fresh={sat?.seat}
            />
            <small>
              {tr.rich("count", {
                n: r.players,
                max: r.seats,
                b: (c) => <b>{c}</b>,
              })}
            </small>
          </span>
          {open ? (
            <button
              type="button"
              disabled={off}
              onClick={onJoin}
              aria-label={tr("joinRoom", { name: title })}
              className={keyClass("sky", { className: s.act })}
            >
              {r.locked ? <Lock aria-hidden="true" /> : null}
              {tr("join")}
            </button>
          ) : (
            <Link href={`/r/${r.code}`} className={s.watch}>
              <Eye strokeWidth={2} aria-hidden="true" />
              {tr("watch")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
