"use client";

import {
  ClipboardCheck,
  Radio,
  Search,
  SlidersHorizontal,
  Tags,
  ThumbsUp,
  Users,
  Vote,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { GameThumb } from "@/features/create/game-info";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { TUNABLES } from "@/game/tunables";
import { LANGS } from "@/game/types";
import type { AdminSuggestion, AdminWorkshop } from "@/server/admin/workshop";
import type { PersonRef } from "@/server/backend/people-types";
import { useDraftInForce } from "../config/draft";
import { ago } from "../format";
import { TuneRow } from "../games/tune-tabs";
import { PersonChip, RoleChip } from "../people/bits";
import { usePersonDrawer } from "../people/person-drawer";
import { usePaged } from "../ui/pager";
import { AdminSelect } from "../ui/select";
import { KIND, KindChip, STATE, StateChip } from "./chips";
import { SuggestionDrawer } from "./suggestion-drawer";

const LANG_PT: Record<string, string> = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
  ja: "Japonês",
};

type Status = keyof typeof STATE | "all";
type Sort = "prio" | "votes" | "new";

/** The Workshop, whole: every suggestion, who suggests and votes, and its rules. */
export function WorkshopScreen({
  data,
  names,
}: {
  data: AdminWorkshop;
  names: Record<GameKey, string>;
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState<"list" | "people" | "rules">("list");
  const [status, setStatus] = useState<Status>(
    data.suggestions.some((s) => s.status === "voting") ? "voting" : "all",
  );
  const [open, setOpen] = useState<string | null>(params.get("item"));
  const all = data.suggestions;
  const cnt = (s: Status) =>
    all.filter((w) => s === "all" || w.status === s).length;
  const decided = all.filter(
    (w) => w.status === "live" || w.status === "refused",
  );
  const rate = decided.length
    ? Math.round(
        (decided.filter((w) => w.status === "live").length / decided.length) *
          100,
      )
    : 0;
  const people = new Map(data.people.map((p) => [p.id, p]));
  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Oficina</h1>
        </div>
      </div>
      <div className="grid g4 wk-kpis">
        <button
          type="button"
          className="card kpi"
          onClick={() => {
            setTab("list");
            setStatus("voting");
          }}
        >
          <span className="k">
            <Vote className="i" />
            Em votação
          </span>
          <span className="v">{cnt("voting")}</span>
        </button>
        <button
          type="button"
          className="card kpi"
          onClick={() => {
            setTab("list");
            setStatus("review");
          }}
        >
          <span className="k">
            <ClipboardCheck className="i" />
            Em verificação
          </span>
          <span className="v">{cnt("review")}</span>
        </button>
        <div className="card kpi">
          <span className="k">
            <ThumbsUp className="i" />
            Votos em 7 dias
          </span>
          <span className="v">{data.votesWeek}</span>
        </div>
        <div className="card kpi">
          <span className="k">
            <Radio className="i" />
            Aprovação
          </span>
          <span className="v">{rate}%</span>
          <span className="s">{decided.length} decididas</span>
        </div>
      </div>
      <nav className="subtabs" aria-label="Partes">
        {(
          [
            ["list", "Sugestões", Tags],
            ["people", "Pessoas", Users],
            ["rules", "Regras", SlidersHorizontal],
          ] as const
        ).map(([k, l, Icon]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            <Icon className="i" />
            {l}
          </button>
        ))}
      </nav>
      {tab === "list" ? (
        <List
          all={all}
          people={people}
          names={names}
          status={status}
          setStatus={setStatus}
          cnt={cnt}
          onOpen={setOpen}
        />
      ) : tab === "people" ? (
        <People data={data} people={people} />
      ) : (
        <Rules data={data} people={people} />
      )}
      {open ? (
        <SuggestionDrawer
          id={open}
          names={names}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function List({
  all,
  people,
  names,
  status,
  setStatus,
  cnt,
  onOpen,
}: {
  all: AdminSuggestion[];
  people: Map<string, PersonRef>;
  names: Record<GameKey, string>;
  status: Status;
  setStatus: (s: Status) => void;
  cnt: (s: Status) => number;
  onOpen: (id: string) => void;
}) {
  const { open: openPerson } = usePersonDrawer();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [game, setGame] = useState("all");
  const [lang, setLang] = useState("all");
  const [sort, setSort] = useState<Sort>("prio");
  const [missing, setMissing] = useState(false);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    const list = all.filter((w) => {
      if (status !== "all" && w.status !== status) return false;
      if (kind !== "all" && w.kind !== kind) return false;
      if (game !== "all" && !w.games.includes(game as GameKey)) return false;
      if (lang !== "all" && w.lang !== lang) return false;
      if (missing && w.langs.length >= 4) return false;
      if (needle) {
        const a = w.author ? people.get(w.author) : null;
        const hay =
          `${w.texts} ${a?.name ?? ""} ${a?.handle ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return list.sort(
      sort === "prio"
        ? (a, b) => b.priority - a.priority
        : sort === "votes"
          ? (a, b) => b.yes + b.no - (a.yes + a.no)
          : (a, b) => b.createdAt - a.createdAt,
    );
  }, [all, status, kind, game, lang, missing, q, sort, people]);
  const {
    rows: shown,
    offset,
    pager,
  } = usePaged(
    rows,
    15,
    JSON.stringify([status, kind, game, lang, missing, q, sort]),
  );
  const filtered = q || missing || [kind, game, lang].some((v) => v !== "all");
  return (
    <>
      <fieldset className="seg wk-st" aria-label="Estado">
        {(["voting", "review", "live", "refused", "all"] as const).map((s) => {
          const Icon = s === "all" ? null : STATE[s][1];
          return (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {Icon ? <Icon className="i" /> : null}
              {s === "all" ? "Todas" : STATE[s][0]}{" "}
              <span className="mono muted">{cnt(s)}</span>
            </button>
          );
        })}
      </fieldset>
      <div className="filters">
        <label className="field">
          <Search className="i" />
          <input
            type="search"
            placeholder="Texto, autor ou @"
            value={q}
            aria-label="Buscar"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <AdminSelect
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "Todos os tipos" },
            ...(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => {
              const [l, Icon] = KIND[k];
              return {
                value: k,
                label: `${l}s`,
                icon: <Icon className="size-4" />,
              };
            }),
          ]}
        />
        <AdminSelect
          label="Jogo"
          value={game}
          onChange={setGame}
          options={[
            { value: "all", label: "Todos os jogos" },
            ...GAME_KEYS.map((g) => ({
              value: g,
              label: names[g],
              icon: <GameThumb game={g} size="tiny" />,
            })),
          ]}
        />
        <AdminSelect
          label="Idioma"
          value={lang}
          onChange={setLang}
          options={[
            { value: "all", label: "Todo idioma" },
            ...LANGS.map((l) => ({ value: l, label: LANG_PT[l] })),
          ]}
        />
        <AdminSelect
          label="Ordem"
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            { value: "prio", label: "Prioridade" },
            { value: "votes", label: "Mais votos" },
            { value: "new", label: "Mais novas" },
          ]}
        />
        <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
          <Switch
            checked={missing}
            onCheckedChange={setMissing}
            aria-label="Faltam idiomas"
          />
          Faltam idiomas
        </span>
        {filtered ? (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              setQ("");
              setKind("all");
              setGame("all");
              setLang("all");
              setMissing(false);
            }}
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
      <div className="note" style={{ marginBottom: 6 }}>
        {rows.length} {rows.length === 1 ? "sugestão" : "sugestões"}
      </div>
      {rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl wk-tbl">
            <thead>
              <tr>
                <th>Sugestão</th>
                <th>Autor</th>
                <th>Jogos</th>
                <th>Votos</th>
                <th className="r">Prioridade</th>
                <th>Idiomas</th>
                <th>Estado</th>
                <th>Enviada</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((w, i) => {
                const tot = w.yes + w.no || 1;
                const a = w.author ? people.get(w.author) : null;
                return (
                  <tr key={w.id} className="click" onClick={() => onOpen(w.id)}>
                    <td>
                      <span className="wk-t">
                        <span className="rk mono">{offset + i + 1}</span>
                        <KindChip kind={w.kind} />
                        <b>{w.title}</b>
                      </span>
                    </td>
                    <td>
                      {a ? (
                        <PersonChip
                          p={a}
                          size={24}
                          onOpen={(id) => openPerson(id)}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className="row"
                        style={{ gap: 3, flexWrap: "nowrap" }}
                      >
                        {w.games.map((g) => (
                          <GameThumb key={g} game={g} size="tiny" />
                        ))}
                      </span>
                    </td>
                    <td>
                      <span
                        className="row"
                        style={{ gap: 8, flexWrap: "nowrap" }}
                      >
                        <span className="votebar">
                          <i
                            style={{
                              width: `${(w.yes / tot) * 100}%`,
                              background: "var(--yes)",
                            }}
                          />
                          <i
                            style={{
                              width: `${(w.no / tot) * 100}%`,
                              background: "var(--no)",
                            }}
                          />
                        </span>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {w.yes}·{w.no}
                        </span>
                      </span>
                    </td>
                    <td className="r">
                      <b className="mono">
                        {String(w.priority).replace(".", ",")}
                      </b>
                    </td>
                    <td>
                      <span
                        className="trdots"
                        title={`${w.langs.length} de 4 idiomas`}
                      >
                        {LANGS.map((l) => (
                          <i
                            key={l}
                            className={w.langs.includes(l) ? "on" : ""}
                          >
                            {l}
                          </i>
                        ))}
                      </span>
                    </td>
                    <td>
                      <StateChip status={w.status} />
                    </td>
                    <td className="mono muted">
                      {new Date(w.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nada com esses filtros.</div>
      )}
      {pager}
    </>
  );
}

function People({
  data,
  people,
}: {
  data: AdminWorkshop;
  people: Map<string, PersonRef>;
}) {
  const { open } = usePersonDrawer();
  const chip = (id: string) => {
    const p = people.get(id);
    return p ? <PersonChip p={p} size={26} /> : id;
  };
  return (
    <div className="grid g2">
      <div className="card">
        <header>
          <h2>Quem sugere</h2>
          <span className="chip">{data.authors.length}</span>
        </header>
        {data.authors.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th className="r">Sugestões</th>
                  <th className="r">No ar</th>
                  <th className="r">De fora</th>
                  <th className="r">Aprovação</th>
                  <th>Última</th>
                </tr>
              </thead>
              <tbody>
                {data.authors.map((a) => (
                  <tr key={a.id} className="click" onClick={() => open(a.id)}>
                    <td>{chip(a.id)}</td>
                    <td className="r mono">{a.suggestions}</td>
                    <td className="r mono">{a.live}</td>
                    <td className="r mono">{a.refused}</td>
                    <td className="r mono">
                      {a.live + a.refused
                        ? `${Math.round((a.live / (a.live + a.refused)) * 100)}%`
                        : "—"}
                    </td>
                    <td>{a.last ? ago(a.last) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">Ninguém sugeriu ainda.</div>
        )}
      </div>
      <div className="card">
        <header>
          <h2>Quem vota</h2>
          <span className="chip">{data.voters.length}</span>
        </header>
        {data.voters.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Papel</th>
                  <th className="r">Nível</th>
                  <th className="r">Votos</th>
                  <th className="r">Peso</th>
                </tr>
              </thead>
              <tbody>
                {data.voters.map((v) => (
                  <tr key={v.id} className="click" onClick={() => open(v.id)}>
                    <td>{chip(v.id)}</td>
                    <td>{v.role ? <RoleChip of={v.role} /> : "—"}</td>
                    <td className="r mono">{v.level}</td>
                    <td className="r mono">{v.votes}</td>
                    <td className="r">
                      <b className="mono">
                        ×{v.weight.toFixed(2).replace(".", ",")}
                      </b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">Ninguém votou ainda.</div>
        )}
      </div>
    </div>
  );
}

function Rules({
  data,
  people,
}: {
  data: AdminWorkshop;
  people: Map<string, PersonRef>;
}) {
  useDraftInForce();
  const { open } = usePersonDrawer();
  const groups = new Map<string, typeof TUNABLES>();
  for (const e of TUNABLES)
    if (e.tab === "workshop")
      groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
  const card = (name: string) => (
    <div className="card">
      <header>
        <h2>{name}</h2>
      </header>
      {(groups.get(name) ?? []).map((e) => (
        <TuneRow key={e.key} e={e} k={e.key} />
      ))}
    </div>
  );
  return (
    <div className="grid g2">
      <div className="stack">
        {card("Envio")}
        {card("Prioridade")}
      </div>
      <div className="stack">
        {card("Checagens ao sugerir")}
        <div className="card">
          <header>
            <h2>Quem verifica</h2>
          </header>
          <div className="stack" style={{ gap: 8 }}>
            {data.staff.map((s) => {
              const p = people.get(s.id);
              return (
                <div
                  key={s.id}
                  className="row"
                  style={{ justifyContent: "space-between" }}
                >
                  {p ? (
                    <PersonChip p={p} size={30} onOpen={(id) => open(id)} />
                  ) : (
                    s.id
                  )}
                  <RoleChip of={s.role} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
