"use client";

import { ArrowRight, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { GameThumb, useGameName } from "@/features/create/game-field";
import { DEFAULT_SETTINGS, type PublicRoom, STEP_TIMES } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

const ORDER: Record<PublicRoom["status"], number> = {
  open: 0,
  full: 1,
  playing: 2,
};

/** Free seats first, and among those the fullest (it starts sooner); the list stays newest first otherwise. */
export function sortRooms(rooms: PublicRoom[]) {
  return rooms
    .map((room, index) => ({ room, index }))
    .sort(
      (a, b) =>
        ORDER[a.room.status] - ORDER[b.room.status] ||
        (a.room.status === "open" ? b.room.players - a.room.players : 0) ||
        a.index - b.index,
    )
    .map(({ room }) => room);
}

/** "90", or "60–90" when the steps differ. A room listed by an older server has no times: the defaults. */
function secondsRange(r: PublicRoom) {
  const all = STEP_TIMES.map((k) => r[k] ?? DEFAULT_SETTINGS[k]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * One listed room: host, name, a lock when it has a password, the game (with
 * `showGame`, where rooms of every game are listed) and how to join. On wide
 * screens the game sits in its own column, so the games line up row after row;
 * on phones it goes under the name, beside the button.
 */
export function RoomRow({
  room: r,
  showGame = false,
  className,
}: {
  room: PublicRoom;
  showGame?: boolean;
  className?: string;
}) {
  const t = useTranslations("home.rooms");
  const tc = useTranslations("common");
  const name = useDisplayName();
  const gameName = useGameName();
  const host = name(r.host);
  const title = r.name || t("roomOf", { name: host });
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: ease.soft },
      }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-lg bg-sunken p-3",
        // wide: fixed game and status columns, so the games line up right beside the button
        showGame && "md:grid-cols-[minmax(0,1fr)_13rem_8rem] md:p-4",
        r.status !== "open" && "opacity-70",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          showGame && "max-md:col-span-2",
        )}
      >
        <Avatar
          avatar={r.host.avatar}
          isGuest={r.host.isGuest}
          name={r.host.name}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5 font-semibold">
            <span className="truncate">{title}</span>
            {r.locked ? (
              <span
                title={t("locked")}
                className="inline-flex shrink-0 items-center text-ink-muted"
              >
                <Lock className="size-3.5" strokeWidth={2.25} />
                <span className="sr-only">{t("locked")}</span>
              </span>
            ) : null}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 font-medium text-[13px] text-ink-muted">
            {/* biome-ignore lint/performance/noImgElement: tiny static svg flag */}
            <img
              src={`/icons/flag-${r.host.lang}.svg`}
              alt={tc(`languages.${r.host.lang}`)}
              width={16}
              height={16}
              className="size-4 shrink-0 rounded-pill shadow-[0_0_0_1px_var(--line)]"
            />
            <span className="truncate">
              {t("meta", {
                players: r.players,
                seats: r.seats,
                seconds: secondsRange(r),
              })}
            </span>
          </span>
        </div>
      </div>
      {showGame ? (
        <span className="flex min-w-0 items-center gap-3">
          <GameThumb game={r.game} size="sm" />
          <span className="truncate font-semibold text-sm">
            {gameName(r.game)}
          </span>
        </span>
      ) : null}
      {r.status === "open" ? (
        // a private room's page asks for the password
        <Link
          href={`/r/${r.code}`}
          aria-label={t("joinRoom", { name: title })}
          className={buttonClass(
            "primary",
            "md",
            "group h-11 gap-2 justify-self-end px-5",
          )}
        >
          {t("join")}
          <ArrowRight
            className="size-4.5 transition-transform duration-200 ease-soft group-hover:translate-x-0.5"
            strokeWidth={2.25}
          />
        </Link>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 justify-self-end rounded-pill bg-surface px-3 py-1.5 font-semibold text-[13px] text-ink-muted">
          {r.status === "playing" ? (
            <span className="size-2 animate-pulse rounded-pill bg-yes" />
          ) : null}
          {t(r.status)}
        </span>
      )}
    </motion.li>
  );
}
