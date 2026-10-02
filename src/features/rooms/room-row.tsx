"use client";

import { Lock } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import type { PublicRoom } from "@/game/types";
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

/** One listed room: host, name, a lock when it has a password, and how to join. */
export function RoomRow({
  room: r,
  className,
}: {
  room: PublicRoom;
  className?: string;
}) {
  const t = useTranslations("home.rooms");
  const tc = useTranslations("common");
  const name = useDisplayName();
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
        "flex items-center gap-3 rounded-lg bg-sunken p-3",
        r.status !== "open" && "opacity-70",
        className,
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
              seconds: r.stepSeconds,
            })}
          </span>
        </span>
      </div>
      {r.status === "open" ? (
        // a private room's page asks for the password
        <Link
          href={`/r/${r.code}`}
          aria-label={t("joinRoom", { name: title })}
          className={buttonClass("secondary", "sm", "h-10")}
        >
          {t("join")}
        </Link>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 font-semibold text-[13px] text-ink-muted">
          {r.status === "playing" ? (
            <span className="size-2 animate-pulse rounded-pill bg-yes" />
          ) : null}
          {t(r.status)}
        </span>
      )}
    </motion.li>
  );
}
