"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import type { PublicRoom } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

/** Rooms shown before "See more": only ones with a free seat. */
const COLLAPSED = 4;
const ORDER: Record<PublicRoom["status"], number> = {
  open: 0,
  full: 1,
  playing: 2,
};

/** Free seats first, and among those the fullest (it starts sooner); the list stays newest first otherwise. */
function sortRooms(rooms: PublicRoom[]) {
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

/** Public rooms; the list refreshes by itself. */
export function PublicRooms() {
  const t = useTranslations("home.rooms");
  const { rooms, isLoading } = usePublicRooms();
  const [expanded, setExpanded] = useState(false);
  const sorted = sortRooms(rooms);
  const open = sorted.filter((r) => r.status === "open");
  const shown = expanded ? sorted : open.slice(0, COLLAPSED);
  const hidden = sorted.length - shown.length;

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-xl">{t("title")}</h2>
        {open.length ? (
          <span className="font-medium text-[13px] text-ink-muted">
            {t("waiting", { count: open.length })}
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <div className="h-[68px] animate-pulse rounded-lg bg-sunken" />
      ) : (
        <ul className="flex flex-col gap-2">
          {/* popLayout: a leaving row stops taking space at once, and everything below glides up together */}
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((r) => (
              <RoomRow key={r.code} room={r} />
            ))}
          </AnimatePresence>
          {shown.length === 0 ? (
            <motion.li
              layout="position"
              className="rounded-lg border-[1.5px] border-line border-dashed p-4 text-ink-muted"
            >
              {sorted.length ? t("noOpen") : t("empty")}
            </motion.li>
          ) : null}
        </ul>
      )}
      {hidden > 0 || expanded ? (
        <motion.button
          layout="position"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 self-center rounded-pill px-3 py-1.5 font-semibold text-sky text-sm transition-colors hover:bg-sky-soft"
        >
          {expanded ? t("seeLess") : t("seeMore")}
          {!expanded && hidden > 0 ? (
            <span className="text-ink-muted">({hidden})</span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            strokeWidth={2}
          />
        </motion.button>
      ) : null}
    </section>
  );
}

function RoomRow({ room: r }: { room: PublicRoom }) {
  const t = useTranslations("home.rooms");
  const tc = useTranslations("common");
  const name = useDisplayName();
  const host = name(r.host);
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
      )}
    >
      <Avatar
        avatar={r.host.avatar}
        isGuest={r.host.isGuest}
        name={r.host.name}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">
          {t("roomOf", { name: host })}
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
        <Link
          href={`/r/${r.code}`}
          aria-label={t("joinRoom", { name: host })}
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
