"use client";

import {
  ChevronRight,
  CircleHelp,
  Flame,
  Gamepad2,
  Medal,
  Search,
  Sparkles,
  Sprout,
  Trophy,
  VenetianMask,
  Vote,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { GameThumb, useGameName } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import type { GameView, ProfileView } from "@/server/contract";
import { Garden } from "./garden";
import { streaks } from "./garden-days";

/** A box on the profile's canvas, with a titled head. */
export function Card({
  title,
  icon,
  end,
  children,
  className,
}: {
  title: ReactNode;
  icon: ReactNode;
  end?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h3 className="flex items-center gap-2 font-bold font-display text-[17px] [&_svg]:size-[18px]">
          {icon}
          {title}
        </h3>
        {end}
      </div>
      {children}
    </section>
  );
}

const percent = (n: number | null) =>
  n === null ? "–" : `${Math.round(n * 100)}%`;

/** Hours, one decimal under ten. */
export const hours = (ms: number) => {
  const h = ms / 3_600_000;
  return h < 10 ? Math.round(h * 10) / 10 : Math.round(h);
};

/**
 * The garden and each game's card, for every game or one:
 * picking a game shows only its matches and its numbers.
 */
export function ActivityPanel({
  view,
  now,
}: {
  view: ProfileView;
  now: number;
}) {
  const t = useTranslations("profile.activity");
  const gameName = useGameName();
  const [game, setGame] = useState<GameKey | null>(null);
  const plays = useMemo(
    () => (game ? view.plays.filter((p) => p.game === game) : view.plays),
    [view.plays, game],
  );
  const run = useMemo(() => streaks(plays, now), [plays, now]);
  const activeDays = useMemo(
    () => new Set(plays.map((p) => new Date(p.at).toDateString())).size,
    [plays],
  );
  const games = view.games.map((g) => g.game);
  const card = game ? view.games.find((g) => g.game === game) : null;

  if (view.matches === 0)
    return <p className="py-6 text-center text-ink-muted">{t("noMatches")}</p>;

  return (
    <div className="flex flex-col gap-4">
      {games.length > 0 ? (
        <ChoiceGroup label={t("game")} className="flex-wrap self-start">
          {[null, ...games].map((g) => (
            <button
              key={g ?? "all"}
              type="button"
              aria-pressed={g === game}
              onClick={() => setGame(g)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-pill px-4 font-semibold text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft",
                g === game
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:text-ink",
                g && "pl-1.5",
              )}
            >
              {g ? <GameThumb game={g} size="tiny" /> : null}
              {g ? gameName(g) : t("allGames")}
            </button>
          ))}
        </ChoiceGroup>
      ) : null}

      <Card
        title={t("garden")}
        icon={<Sprout className="text-yes" strokeWidth={1.75} />}
        end={
          <dl className="flex flex-wrap gap-x-[18px] gap-y-1.5 font-semibold text-[13px] text-ink-muted">
            <Stat value={plays.length} label={t("yearMatches")} />
            <Stat value={activeDays} label={t("activeDays")} />
            <Stat
              value={
                <>
                  <Flame className="size-3.5 text-apricot" strokeWidth={2} />
                  {run.current}
                </>
              }
              label={t("streak")}
            />
            <Stat value={run.best} label={t("bestStreak")} />
          </dl>
        }
      >
        <Garden plays={view.plays} game={game} now={now} />
      </Card>

      {card ? (
        <GameNumbers card={card} />
      ) : (
        <div className="flex flex-col gap-2">
          {view.games.map((g) => (
            <GameCard key={g.game} card={g} onOpen={() => setGame(g.game)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <dd className="inline-flex items-center gap-0.5 font-medium font-mono text-[15px] text-ink">
        {value}
      </dd>
      <dt>{label}</dt>
    </div>
  );
}

/** A game's card among all of them: its matches, wins and hours, its two telling numbers. */
function GameCard({ card, onOpen }: { card: GameView; onOpen: () => void }) {
  const t = useTranslations("profile.activity");
  const format = useFormatter();
  const gameName = useGameName();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl bg-surface px-4 py-3.5 text-left transition-shadow duration-200 ease-soft hover:shadow-card sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
    >
      <GameThumb game={card.game} />
      <span className="flex min-w-0 flex-col">
        <b className="font-bold font-display text-[17px]">
          {gameName(card.game)}
        </b>
        <span className="truncate text-[13px] text-ink-muted">
          {t("gameLine", {
            matches: card.matches,
            wins: card.wins,
            hours: format.number(hours(card.timeMs)),
          })}
        </span>
      </span>
      <span className="flex gap-5 max-sm:hidden">
        {card.game === "impostor" ? (
          <>
            <Highlight
              value={format.number(card.caught)}
              label={t("caughtShort")}
            />
            <Highlight
              value={percent(card.escapeRate)}
              label={t("escapedShort")}
            />
          </>
        ) : card.game === "lineup" ? (
          <>
            <Highlight
              value={format.number(card.roundsWon)}
              label={t("roundsWonShort")}
            />
            <Highlight
              value={format.number(card.votes)}
              label={t("votesShort")}
            />
          </>
        ) : (
          <>
            <Highlight
              value={percent(card.discoverRate)}
              label={t("discoveredShort")}
            />
            <Highlight
              value={
                card.avgQuestions === null
                  ? "–"
                  : format.number(card.avgQuestions, {
                      maximumFractionDigits: 1,
                    })
              }
              label={t("questionsShort")}
            />
          </>
        )}
      </span>
      <ChevronRight className="size-[18px] text-ink-muted" strokeWidth={1.75} />
    </button>
  );
}

function Highlight({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-end">
      <b className="font-medium font-mono text-[17px]">{value}</b>
      <span className="font-semibold text-[11.5px] text-ink-muted">
        {label}
      </span>
    </span>
  );
}

/** One game's numbers, in four boxes. */
function GameNumbers({ card }: { card: GameView }) {
  const t = useTranslations("profile.activity.stats");
  const format = useFormatter();
  const share = (n: number, of: number) =>
    of ? percent(n / of) : percent(null);
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Box
        icon={<Gamepad2 />}
        label={t("matches")}
        value={format.number(card.matches)}
        note={card.recent ? t("recent", { n: card.recent }) : null}
      />
      <Box
        icon={<Trophy />}
        label={t("wins")}
        value={format.number(card.wins)}
        note={t("winRate", { p: share(card.wins, card.matches) })}
      />
      {card.game === "lineup" ? (
        <>
          <Box
            icon={<Medal />}
            label={t("roundsWon")}
            value={format.number(card.roundsWon)}
            note={t("ofRounds", { n: card.rounds })}
          />
          <Box
            icon={<Vote />}
            label={t("votes")}
            value={format.number(card.votes)}
            note={card.crowd ? t("crowd", { n: card.crowd }) : null}
          />
        </>
      ) : card.game === "impostor" ? (
        <>
          <Box
            icon={<Search />}
            label={t("caught")}
            value={format.number(card.caught)}
            note={card.firstVote ? t("firstVote", { n: card.firstVote }) : null}
          />
          <Box
            icon={<VenetianMask />}
            label={t("asImpostor")}
            value={format.number(card.asImpostor)}
            note={
              card.escapeRate === null
                ? null
                : t("escapeRate", { p: percent(card.escapeRate) })
            }
          />
        </>
      ) : (
        <>
          <Box
            icon={<Sparkles />}
            label={t("discovered")}
            value={format.number(card.discovered)}
            note={t("discoverRate", { p: percent(card.discoverRate) })}
          />
          <Box
            icon={<CircleHelp />}
            label={t("questions")}
            value={
              card.avgQuestions === null
                ? "–"
                : format.number(card.avgQuestions, {
                    maximumFractionDigits: 1,
                  })
            }
            note={
              card.bestQuestions === null
                ? null
                : t("questionsNote", { best: card.bestQuestions })
            }
          />
        </>
      )}
    </div>
  );
}

function Box({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface p-4">
      <span className="flex items-center gap-1.5 font-semibold text-[13px] text-ink-muted [&_svg]:size-4 [&_svg]:stroke-[1.75]">
        {icon}
        {label}
      </span>
      <span className="font-medium font-mono text-[26px] leading-tight">
        {value}
      </span>
      {note ? (
        <span className="text-[12.5px] text-ink-muted">{note}</span>
      ) : null}
    </div>
  );
}
