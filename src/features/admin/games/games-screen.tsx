"use client";

import {
  ArrowDownAZ,
  Clock,
  Gamepad2,
  History,
  LayoutGrid,
  List,
  Music,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameThumb } from "@/features/create/game-info";
import type { Availability } from "@/game/games";
import { trackFor } from "@/game/music-tunes";
import { withTunes } from "@/game/tune";
import { restoreConfigAction } from "@/server/admin/actions";
import type { AdminGame } from "@/server/admin/games";
import type { ConfigVersion } from "@/server/backend/admin-types";
import { choiceLabel, useDraft } from "../config/draft";
import { dur } from "../format";
import { useAdminHref } from "../shell/base";
import { AdminSelect } from "../ui/select";

type Filter = "all" | Availability;
type Sort = "matches" | "rooms" | "name";

/** Where a game stands, as a chip: green open, butter in test, red closed. */
export function StateChip({ value }: { value: Availability }) {
  const tone = value === "open" ? "yes" : value === "test" ? "butter" : "no";
  return (
    <span className={`chip ${tone}`}>
      {value === "open" ? "Aberto" : value === "test" ? "Em teste" : "Fechado"}
    </span>
  );
}

/** The games: each one's music, scenes, clocks, room defaults and content. */
export function GamesScreen({
  games,
  versions,
  authors,
}: {
  games: AdminGame[];
  versions: ConfigVersion[];
  authors: Record<string, string>;
}) {
  const href = useAdminHref();
  const d = useDraft();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("matches");
  const [view, setView] = useState<"grid" | "list">("grid");
  const stateOf = (g: AdminGame) =>
    (d.value(`games.${g.key}`) as Availability) ?? "open";
  // the match music in force (the saved values, not the unsaved ones)
  const music = (g: AdminGame) =>
    withTunes(d.saved, () => trackFor(g.key, "room"));
  const needle = q.trim().toLowerCase();
  const list = games
    .filter(
      (g) =>
        (filter === "all" || stateOf(g) === filter) &&
        (!needle ||
          Object.values(g.names).join(" ").toLowerCase().includes(needle) ||
          g.key.includes(needle)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.names.pt.localeCompare(b.names.pt, "pt")
        : sort === "rooms"
          ? b.rooms - a.rooms
          : b.matches - a.matches,
    );
  const count = (f: Filter) =>
    games.filter((g) => f === "all" || stateOf(g) === f).length;

  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Jogos</p>
          <h1>Jogos</h1>
        </div>
      </div>
      <div className="filters">
        <label className="field">
          <Search className="i" />
          <input
            type="search"
            placeholder="Buscar jogo"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar jogo"
          />
        </label>
        <fieldset className="seg" aria-label="Disponibilidade">
          {(
            [
              ["all", "Todos"],
              ["open", "Abertos"],
              ["test", "Em teste"],
              ["closed", "Fechados"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              {l} <span className="mono muted">{count(k)}</span>
            </button>
          ))}
        </fieldset>
        <AdminSelect
          label="Ordenar"
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            {
              value: "matches",
              label: "Mais jogados",
              icon: <Gamepad2 className="size-4" />,
            },
            {
              value: "rooms",
              label: "Mais salas abertas",
              icon: <LayoutGrid className="size-4" />,
            },
            {
              value: "name",
              label: "A–Z",
              icon: <ArrowDownAZ className="size-4" />,
            },
          ]}
        />
        <span className="spacer" />
        <fieldset className="seg sm" aria-label="Visualização">
          <button
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="i" />
            Grade
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List className="i" />
            Lista
          </button>
        </fieldset>
      </div>
      {!list.length ? (
        <div className="empty">Nenhum jogo com “{q}”.</div>
      ) : view === "grid" ? (
        <div className="ggrid">
          {list.map((g) => (
            <Link key={g.key} className="gcard" href={href(`/games/${g.key}`)}>
              <span className="gth">
                <GameThumb game={g.key} size="fill" className="aspect-[16/9]" />
              </span>
              <span className="gbody">
                <span
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "nowrap",
                  }}
                >
                  <b>{g.names.pt}</b>
                  <StateChip value={stateOf(g)} />
                </span>
                <span className="gmeta">
                  <span>
                    <b className="mono">{g.matches}</b>{" "}
                    {g.matches === 1 ? "partida" : "partidas"}
                  </span>
                  <span>
                    <b className="mono">{g.rooms}</b>{" "}
                    {g.rooms === 1 ? "sala" : "salas"}
                  </span>
                  <span>
                    <b className="mono">
                      {g.seats.min}–{g.seats.max}
                    </b>{" "}
                    jogadores
                  </span>
                </span>
                <span className="gmeta muted">
                  <Music className="i" />
                  {choiceLabel("moments.", music(g) ?? "")}
                  <span>·</span>
                  <Clock className="i" />
                  {dur(g.avgSec)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Jogo</th>
                <th>Disponibilidade</th>
                <th className="r">Jogadores</th>
                <th className="r">Partidas</th>
                <th className="r">Salas abertas</th>
                <th className="r">Duração média</th>
                <th>Música da partida</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.key}>
                  <td>
                    <Link className="nm" href={href(`/games/${g.key}`)}>
                      <GameThumb game={g.key} size="xs" />
                      <b>{g.names.pt}</b>
                    </Link>
                  </td>
                  <td>
                    <StateChip value={stateOf(g)} />
                  </td>
                  <td className="r mono">
                    {g.seats.min}–{g.seats.max}
                  </td>
                  <td className="r mono">{g.matches}</td>
                  <td className="r mono">{g.rooms}</td>
                  <td className="r mono">{dur(g.avgSec)}</td>
                  <td>{choiceLabel("moments.", music(g) ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Versions versions={versions} authors={authors} current={d.version} />
    </>
  );
}

/** Each save of the panel's values, newest first, with the way back to any of them. */
function Versions({
  versions,
  authors,
  current,
}: {
  versions: ConfigVersion[];
  authors: Record<string, string>;
  current: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const restore = async (v: number) => {
    setBusy(v);
    const r = await restoreConfigAction(v);
    setBusy(null);
    if (r.ok) router.refresh();
  };
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <header>
        <History className="i" />
        <h2>Versões dos ajustes</h2>
        <span className="chip">em vigor: {current}</span>
      </header>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Versão</th>
              <th>Quando</th>
              <th>Quem</th>
              <th className="r">Valores mudados</th>
              <th>Nota</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.v}>
                <td className="mono">{v.v}</td>
                <td className="mono">
                  {v.at
                    ? new Date(v.at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      })
                    : "—"}
                </td>
                <td>{(v.author && authors[v.author]) || "—"}</td>
                <td className="r mono">{Object.keys(v.values.tunes).length}</td>
                <td className="muted">{v.note ?? ""}</td>
                <td className="r">
                  {v.v !== current ? (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={busy !== null}
                      onClick={() => restore(v.v)}
                    >
                      <RotateCcw className="i" />
                      Voltar a esta
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
