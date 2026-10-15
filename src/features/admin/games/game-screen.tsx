"use client";

import {
  ArrowLeft,
  ArrowRight,
  Box,
  Clapperboard,
  Clock,
  Gamepad2,
  SlidersHorizontal,
  Trophy,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Flag } from "@/components/ui/language-switch";
import { GameThumb } from "@/features/create/game-info";
import type { Availability, GameKey } from "@/game/games";
import type { AdminGame } from "@/server/admin/games";
import type { Banks } from "@/server/backend/admin-types";
import { useDraft } from "../config/draft";
import { ScenesTab } from "../scenes/scenes-tab";
import { useAdminHref } from "../shell/base";
import { SetCrumbs } from "../shell/crumbs";
import { AdminSelect } from "../ui/select";
import { ContentTab } from "./content-tab";
import { StateChip } from "./games-screen";
import { MusicTab } from "./music-tab";
import { OpeningTimeline } from "./opening-timeline";
import { DefaultsTab, TimingTab, XpTab } from "./tune-tabs";

export const GAME_TABS = [
  { id: "overview", label: "Resumo", Icon: Gamepad2 },
  { id: "music", label: "Áudios", Icon: Volume2 },
  { id: "scenes", label: "Cenas", Icon: Clapperboard },
  { id: "timing", label: "Tempos", Icon: Clock },
  { id: "defaults", label: "Padrões da sala", Icon: SlidersHorizontal },
  { id: "content", label: "Conteúdo", Icon: Box },
  { id: "xp", label: "XP", Icon: Trophy },
] as const;
type Tab = (typeof GAME_TABS)[number]["id"];

/** Which leaf keys a tab of this game edits, for the count of unsaved changes on it. */
const tabOf = (key: string): Tab | null => {
  if (key.startsWith("games.")) return "overview";
  if (key.startsWith("moments.") || key.startsWith("music.")) return "music";
  if (key.startsWith("scenes.")) return "scenes";
  if (key.startsWith("xp.") || key.startsWith("gameXp.")) return "xp";
  if (
    key.startsWith("room.") ||
    key.startsWith("rules.") ||
    key.startsWith("impMatch.") ||
    key.startsWith("impRules.") ||
    key === "engine.hostThemeSeconds"
  )
    return "defaults";
  return "timing";
};

/** A game's page: its tabs, and a quick way to the others. */
export function GameScreen({
  game,
  games,
  banks,
}: {
  game: AdminGame;
  games: AdminGame[];
  banks: Banks;
}) {
  const href = useAdminHref();
  const router = useRouter();
  const params = useSearchParams();
  const d = useDraft();
  const raw = params.get("tab");
  const tab: Tab = GAME_TABS.some((t) => t.id === raw)
    ? (raw as Tab)
    : "overview";
  const i = games.findIndex((g) => g.key === game.key);
  const prev = games[(i - 1 + games.length) % games.length];
  const next = games[(i + 1) % games.length];
  const state = (d.value(`games.${game.key}`) as Availability) ?? "open";
  const label = GAME_TABS.find((t) => t.id === tab)?.label ?? "";
  const dirty = (t: Tab) =>
    Object.keys(d.edits).filter((k) => tabOf(k) === t).length;
  const go = (key: GameKey) =>
    router.push(
      href(`/games/${key}${tab === "overview" ? "" : `?tab=${tab}`}`),
    );

  let body: ReactNode = null;
  if (tab === "overview") body = <OverviewTab game={game} state={state} />;
  if (tab === "music") body = <MusicTab game={game.key} />;
  if (tab === "scenes") body = <ScenesTab game={game.key} />;
  if (tab === "timing") body = <TimingTab game={game.key} />;
  if (tab === "defaults") body = <DefaultsTab game={game.key} />;
  if (tab === "content") body = <ContentTab game={game.key} banks={banks} />;
  if (tab === "xp") body = <XpTab game={game.key} />;

  return (
    <>
      <SetCrumbs
        items={[
          { label: "Jogos", path: "/games" },
          { label: game.names.pt, path: `/games/${game.key}` },
          { label },
        ]}
      />
      <div className="head">
        <div
          className="row"
          style={{ gap: 14, flexWrap: "nowrap", minWidth: 0 }}
        >
          <span className="game-th">
            <GameThumb game={game.key} size="fill" className="h-full" />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">Jogo</p>
            <h1>{game.names.pt}</h1>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <StateChip value={state} />
          <AdminSelect
            label="Trocar de jogo"
            value={game.key}
            onChange={(v) => go(v as GameKey)}
            options={games.map((g) => ({
              value: g.key,
              label: g.names.pt,
              icon: <GameThumb game={g.key} size="tiny" />,
            }))}
          />
          <Link
            className="btn icon"
            href={href(
              `/games/${prev.key}${tab === "overview" ? "" : `?tab=${tab}`}`,
            )}
            aria-label={`Jogo anterior: ${prev.names.pt}`}
            title={prev.names.pt}
          >
            <ArrowLeft className="i" />
          </Link>
          <Link
            className="btn icon"
            href={href(
              `/games/${next.key}${tab === "overview" ? "" : `?tab=${tab}`}`,
            )}
            aria-label={`Próximo jogo: ${next.names.pt}`}
            title={next.names.pt}
          >
            <ArrowRight className="i" />
          </Link>
        </div>
      </div>
      <nav className="subtabs" aria-label="Abas do jogo">
        {GAME_TABS.map((t) => {
          const n = dirty(t.id);
          return (
            <Link
              key={t.id}
              aria-current={tab === t.id ? "page" : undefined}
              className="subtab"
              href={href(
                `/games/${game.key}${t.id === "overview" ? "" : `?tab=${t.id}`}`,
              )}
              scroll={false}
            >
              <t.Icon className="i" />
              {t.label}
              {n ? <span className="n">{n}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div>{body}</div>
    </>
  );
}

const ART: Record<GameKey, [string, string]> = {
  "who-am-i": ["var(--art-whoami)", "var(--art-whoami-2)"],
  impostor: ["var(--art-impostor)", "var(--art-impostor-2)"],
  lineup: ["var(--art-lineup)", "var(--art-lineup-2)"],
};

function OverviewTab({
  game,
  state,
}: {
  game: AdminGame;
  state: Availability;
}) {
  const d = useDraft();
  return (
    <>
      <div
        className="banner"
        style={
          {
            gridTemplateColumns: "1fr",
            "--a1": ART[game.key][0],
            "--a2": ART[game.key][1],
          } as CSSProperties
        }
      >
        <div>
          <p style={{ margin: 0, maxWidth: "70ch", fontSize: 16 }}>
            {game.pitch}
          </p>
          <div className="names">
            {(["pt", "en", "es", "ja"] as const).map((l) => (
              <span
                key={l}
                className="row"
                style={{ gap: 6, display: "inline-flex" }}
              >
                <Flag lang={l} className="size-4" />
                {game.names[l]}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid g4" style={{ marginTop: 16 }}>
        <div className="card kpi">
          <span className="k">Partidas</span>
          <span className="v">{game.matches}</span>
        </div>
        <div className="card kpi">
          <span className="k">Duração média</span>
          <span className="v">
            {game.avgSec ? `${Math.round(game.avgSec / 60)} min` : "—"}
          </span>
          <span className="s">do início ao pódio</span>
        </div>
        <div className="card kpi">
          <span className="k">Jogadores</span>
          <span className="v">
            {game.seats.min}–{game.seats.max}
          </span>
          <span className="s">por sala</span>
        </div>
        <div className="card kpi">
          <span className="k">Salas abertas agora</span>
          <span className="v">{game.rooms}</span>
        </div>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <header>
            <h2>Disponibilidade</h2>
          </header>
          <fieldset className="seg" aria-label="Disponibilidade">
            {(
              [
                ["open", "Aberto a todos"],
                ["test", "Em teste (só você)"],
                ["closed", "Fechado"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={state === k}
                onClick={() => d.set(`games.${game.key}`, k)}
              >
                {l}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="card">
          <header>
            <h2>Abertura</h2>
          </header>
          <h3 style={{ marginBottom: 6 }}>Primeira partida</h3>
          <OpeningTimeline game={game.key} first />
          <h3 style={{ margin: "12px 0 6px" }}>Revanche</h3>
          <OpeningTimeline game={game.key} first={false} />
        </div>
      </div>
    </>
  );
}
