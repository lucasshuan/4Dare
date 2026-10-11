"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { m } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { ProfileLink } from "@/features/profile/profile-link";
import { type GameKey, OPEN_GAMES } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { CONTRIBUTIONS } from "@/lib/routes";
import {
  MIN_RANKED,
  type MyRankingRow,
  type RankingBoard,
  type RankingPeriod,
  type RankingRow,
} from "@/server/community-contract";
import type { PersonRef } from "@/server/contract";

type GameChoice = GameKey | "all";

/** A face with its level on a small dark tag, as the menu and profiles show it. */
export function LevelFace({
  person,
  level,
  size,
}: {
  person: PersonRef;
  level: number | null;
  size: ComponentProps<typeof Avatar>["size"];
}) {
  const t = useTranslations("community.rankings");
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar avatar={person.avatar} size={size} />
      {level !== null ? (
        <span className="-translate-x-1/2 absolute -bottom-1 left-1/2 whitespace-nowrap rounded-pill bg-ink px-[5px] py-[3px] font-mono font-semibold text-[10px] text-on-ink leading-none">
          {t("level", { n: level })}
        </span>
      ) : null}
    </span>
  );
}

/**
 * /rankings: who earned the most XP, overall or per game, this week, this
 * month or ever. The top three on a podium (the first crowned), the rest in
 * rows, the reader's own row pinned at the bottom; beside it, who helped the
 * library most.
 */
export function RankingsScreen(initial: {
  game: GameChoice;
  period: RankingPeriod;
  /** Read on the server for `game` and `period`; null when that failed. */
  board: RankingBoard | null;
}) {
  const t = useTranslations("community");
  const lang = useLocale();
  const gameName = useGameName();
  const { me: reader } = useMe();
  const [game, setGame] = useState<GameChoice>(initial.game);
  const [period, setPeriod] = useState<RankingPeriod>(initial.period);
  const query = (path: string) => {
    const p = new URLSearchParams({ lang, period });
    if (game !== "all") p.set("game", game);
    return `${path}?${p}`;
  };
  const { data, isPlaceholderData } = useQuery({
    queryKey: ["rankings", lang, game, period],
    queryFn: async (): Promise<RankingBoard> => {
      const res = await fetch(query("/api/rankings"));
      if (!res.ok) throw new Error(`rankings: ${res.status}`);
      return (await res.json()) as RankingBoard;
    },
    initialData: () =>
      game === initial.game && period === initial.period
        ? (initial.board ?? undefined)
        : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const { data: mine } = useQuery({
    queryKey: ["rankings-me", lang, game, period],
    enabled: !!reader && !reader.isGuest,
    queryFn: async (): Promise<MyRankingRow> => {
      const res = await fetch(query("/api/rankings/me"), { cache: "no-store" });
      if (!res.ok) throw new Error(`rankings me: ${res.status}`);
      return (await res.json()) as MyRankingRow;
    },
  });
  const choose = (g: GameChoice, p: RankingPeriod) => {
    setGame(g);
    setPeriod(p);
    writeQuery(g, p);
  };
  const rows = data?.rows ?? [];
  const me = mine?.me ?? null;
  const few = !!data && rows.length < MIN_RANKED;
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("rankings.title")}
        lead={t("rankings.lead")}
      />
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        <Segmented
          label={t("rankings.game")}
          options={["all", ...OPEN_GAMES] as GameChoice[]}
          value={game}
          onChange={(g) => choose(g, period)}
          render={(g) => (g === "all" ? t("rankings.all") : gameName(g))}
        />
        <Segmented
          label={t("rankings.period")}
          options={["week", "month", "ever"] as const}
          value={period}
          onChange={(p) => choose(game, p)}
          render={(p) => t(`rankings.${p}`)}
        />
      </div>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div
          className={cn(
            "transition-opacity duration-200",
            isPlaceholderData && "opacity-60",
          )}
        >
          {few ? (
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: ease.soft }}
              className="grid justify-items-start gap-2 rounded-[24px] border border-line-strong border-dashed p-7"
            >
              <b className="font-bold font-display text-[19px]">
                {t("rankings.few")}
              </b>
              <span className="text-ink-muted">{t("rankings.fewHint")}</span>
            </m.div>
          ) : (
            <>
              {/* a new top three replays the podium's arrival */}
              <Podium
                rows={rows.slice(0, 3)}
                key={rows
                  .slice(0, 3)
                  .map((r) => r.person.id)
                  .join()}
              />
              <div className="grid gap-1.5">
                {rows.slice(3).map((r, i) => (
                  <Row key={r.person.id} row={r} index={i} />
                ))}
                {me && !rows.some((r) => r.person.id === me.person.id) ? (
                  <Row row={me} index={rows.length - 3} me />
                ) : null}
              </div>
            </>
          )}
        </div>
        <aside className="grid gap-3 rounded-[24px] bg-surface p-[18px]">
          <div>
            <h2 className="font-bold font-display text-[17px] leading-tight">
              {t("rankings.helpers")}
            </h2>
            <span className="text-[12.5px] text-ink-muted">
              {t("rankings.helpersHint")}
            </span>
          </div>
          <div className="grid gap-2.5">
            {data?.helpers.length ? (
              data.helpers.map((h, i) => (
                <m.div
                  key={h.person.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: ease.soft,
                    delay: i * 0.06,
                  }}
                >
                  <ProfileLink
                    handle={h.person.handle}
                    className="flex items-center gap-2.5 rounded-[14px] text-[14px] transition-colors hover:bg-sunken"
                  >
                    <Avatar avatar={h.person.avatar} size={32} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{h.person.name}</b>
                      <small className="block text-[12px] text-ink-muted">
                        {t("rankings.helperLine", {
                          pictures: h.pictures,
                          aliases: h.aliases,
                        })}
                      </small>
                    </span>
                    <span className="font-medium font-mono text-[13px] tabular-nums">
                      {h.total}
                    </span>
                  </ProfileLink>
                </m.div>
              ))
            ) : (
              <span className="text-[13px] text-ink-muted">
                {t("rankings.helpersEmpty")}
              </span>
            )}
          </div>
          <Link
            href={CONTRIBUTIONS}
            className={buttonClass("secondary", "sm", "justify-self-start")}
          >
            {t("rankings.seeContributions")}
          </Link>
        </aside>
      </div>
    </Screen>
  );
}

/**
 * The places, left to right: second, first, third. `rise` is when each step
 * grows on arrival: third, then second, first last (as a game's page has it).
 */
const PODIUM = [
  { i: 1, height: 112, rise: 0.32 },
  { i: 0, height: 150, rise: 0.46 },
  { i: 2, height: 84, rise: 0.2 },
];

/** When the rows under the podium start coming in, in seconds. */
const ROWS_AT = 0.55;

/**
 * The top three: on arrival the steps grow one by one, then the faces pop
 * onto them and the crown drops on the first.
 */
function Podium({ rows }: { rows: RankingRow[] }) {
  const t = useTranslations("community.rankings");
  const format = useFormatter();
  return (
    <div className="mx-auto mt-2 mb-[26px] grid max-w-[560px] grid-cols-3 items-end gap-3">
      {PODIUM.map(({ i, height, rise }) => {
        const r = rows[i];
        if (!r) return null;
        return (
          <ProfileLink
            key={r.person.id}
            handle={r.person.handle}
            style={{ gridColumn: i === 0 ? 2 : i === 1 ? 1 : 3 }}
            className="grid min-w-0 justify-items-center gap-2 text-center"
          >
            <m.span
              initial={{ opacity: 0, scale: 0.4, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 16,
                delay: rise + 0.22,
              }}
              className="grid min-w-0 max-w-full justify-items-center gap-2"
            >
              {i === 0 ? (
                <m.span
                  initial={{ opacity: 0, y: -16, rotate: -40 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 11,
                    delay: rise + 0.5,
                  }}
                >
                  <Crown className="h-[18px] text-gold" strokeWidth={2} />
                </m.span>
              ) : null}
              <LevelFace person={r.person} level={r.level} size={48} />
              <b className="max-w-full truncate font-bold font-display text-[15px] leading-tight">
                {r.person.name}
              </b>
              <small className="font-medium font-mono text-[12px] text-ink-muted">
                {t("xp", { n: format.number(r.xp) })}
              </small>
            </m.span>
            <m.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
                delay: rise,
              }}
              style={{ height }}
              className={cn(
                "grid w-full origin-bottom place-items-start justify-center rounded-[18px_18px_8px_8px] border pt-2.5 font-display font-extrabold text-[34px] leading-none",
                i === 0
                  ? "border-transparent bg-butter text-on-butter"
                  : "border-line bg-surface text-ink-muted",
              )}
            >
              {i + 1}
            </m.div>
          </ProfileLink>
        );
      })}
    </div>
  );
}

/** Puts the chosen game and period in the address, so it can be shared (no reload). */
function writeQuery(game: GameChoice, period: RankingPeriod) {
  const p = new URLSearchParams(window.location.search);
  if (game === "all") p.delete("game");
  else p.set("game", game);
  if (period === "week") p.delete("period");
  else p.set("period", period);
  const qs = p.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}`,
  );
}

function Row({
  row,
  index,
  me = false,
}: {
  row: RankingRow;
  index: number;
  me?: boolean;
}) {
  const t = useTranslations("community.rankings");
  const format = useFormatter();
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: ease.soft,
        delay: ROWS_AT + Math.min(index, 10) * 0.04,
      }}
      className={cn(me && "sticky bottom-3 mt-1.5")}
    >
      <ProfileLink
        handle={row.person.handle}
        className={cn(
          "grid grid-cols-[40px_36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] py-2 pr-3.5 pl-2.5 transition-colors sm:grid-cols-[40px_36px_minmax(0,1fr)_auto_auto]",
          me ? "bg-sky-soft shadow-pop" : "bg-surface hover:bg-sunken",
        )}
      >
        <span
          className={cn(
            "text-center font-medium font-mono text-[14px]",
            me ? "text-ink" : "text-ink-muted",
          )}
        >
          {row.place}
        </span>
        <Avatar avatar={row.person.avatar} size={34} />
        <span className="min-w-0">
          <b className="block truncate font-bold text-[14.5px]">
            {row.person.name}
          </b>
          <small className="block font-medium text-[12px] text-ink-muted">
            {t("level", { n: row.level })} · @{row.person.handle}
          </small>
        </span>
        <span className="text-right text-[12.5px] text-ink-muted max-sm:hidden">
          {t("stats", { matches: row.matches, wins: row.wins })}
        </span>
        <span className="text-right font-medium font-mono text-[14px] tabular-nums">
          {format.number(row.xp)}
        </span>
      </ProfileLink>
    </m.div>
  );
}
