"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { Link } from "@/i18n/navigation";
import { ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";

/** Rooms waiting for players; the list refreshes by itself. */
export function PublicRooms() {
  const t = useTranslations("home.rooms");
  const tc = useTranslations("common");
  const name = useDisplayName();
  const { rooms, isLoading } = usePublicRooms();

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-xl">{t("title")}</h2>
        {rooms.length ? (
          <span className="font-medium text-[13px] text-ink-muted">
            {t("waiting", { count: rooms.length })}
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <div className="h-[68px] animate-pulse rounded-lg bg-sunken" />
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {rooms.map((r) => {
              const host = name(r.host);
              return (
                <motion.li
                  key={r.code}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: ease.soft },
                  }}
                  exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }}
                  className="flex items-center gap-3 rounded-lg bg-sunken p-3"
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
                    <span className="inline-flex items-center gap-1.5 font-medium text-[13px] text-ink-muted">
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
                  <Link
                    href={`/r/${r.code}`}
                    aria-label={t("joinRoom", { name: host })}
                    className={buttonClass("secondary", "sm", "h-10")}
                  >
                    {t("join")}
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {rooms.length === 0 ? (
            <li className="rounded-lg border-[1.5px] border-line border-dashed p-4 text-ink-muted">
              {t("empty")}
            </li>
          ) : null}
        </ul>
      )}
      <p className="font-medium text-[13px] text-ink-muted leading-[18px]">
        {t("note")}
      </p>
    </section>
  );
}
