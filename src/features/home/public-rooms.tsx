"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { RoomRow, sortRooms } from "@/features/rooms/room-row";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { roomsOf } from "@/lib/routes";

/** Rooms shown here: only ones with a free seat. The rest are on /rooms. */
const SHOWN = 4;

/** A game's rooms with a free seat; "See all" opens /rooms for that game. The list refreshes by itself. */
export function PublicRooms({ game }: { game: GameKey }) {
  const t = useTranslations("home.rooms");
  const { rooms, isLoading } = usePublicRooms();
  const mine = sortRooms(rooms.filter((r) => r.game === game));
  const open = mine.filter((r) => r.status === "open");
  const shown = open.slice(0, SHOWN);

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <h2 className="font-semibold text-xl">{t("title")}</h2>
          {open.length ? (
            <span className="font-medium text-[13px] text-ink-muted">
              {t("waiting", { count: open.length })}
            </span>
          ) : null}
        </div>
        <Link
          href={roomsOf(game)}
          className="group -mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 font-semibold text-sky text-sm transition-colors hover:bg-sky-soft"
        >
          {t("seeAll")}
          {mine.length > shown.length ? (
            <span className="text-ink-muted">({mine.length})</span>
          ) : null}
          <ArrowRight
            className="size-4 transition-transform duration-200 ease-soft group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Link>
      </div>
      {isLoading ? (
        <div className="h-[68px] animate-pulse rounded-lg bg-sunken" />
      ) : (
        <LayoutMotion>
          <ul className="flex flex-col gap-2">
            {/* popLayout: a leaving row stops taking space at once, and everything below glides up together */}
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((r) => (
                <RoomRow key={r.code} room={r} />
              ))}
            </AnimatePresence>
            {shown.length === 0 ? (
              <m.li
                layout="position"
                className="rounded-lg border-[1.5px] border-line border-dashed p-4 text-ink-muted"
              >
                {mine.length ? t("noOpen") : t("empty")}
              </m.li>
            ) : null}
          </ul>
        </LayoutMotion>
      )}
    </section>
  );
}
