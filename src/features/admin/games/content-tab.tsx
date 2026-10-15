"use client";

import {
  Box,
  Eye,
  EyeOff,
  Flag,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  Palette,
  Pencil,
  Search,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Swords,
  Tags,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import type { GameKey } from "@/game/games";
import { THEME_SETS } from "@/game/theme-sets";
import { setBankLiveAction } from "@/server/admin/actions";
import type { BankKind, Banks } from "@/server/backend/admin-types";
import { useAdminHref } from "../shell/base";
import { usePaged } from "../ui/pager";
import { AdminSelect } from "../ui/select";

const KIND_PT = {
  scale: "Escala",
  pick: "Escolha",
  word: "Palavra",
  emoji: "Emoji",
  color: "Cor",
} as const;
const KIND_ICON = {
  scale: SlidersHorizontal,
  pick: ListChecks,
  word: Pencil,
  emoji: Smile,
  color: Palette,
} as const;
const TONE_PT = {
  chores: "Tarefas",
  social: "Social",
  adventure: "Aventura",
  absurd: "Absurdo",
  contest: "Disputa",
} as const;
const TONE_ICON = {
  chores: Box,
  social: Users,
  adventure: Flag,
  absurd: Sparkles,
  contest: Swords,
} as const;
const SCOPE_PT = {
  general: "Qualquer tema",
  set: "Um conjunto",
  theme: "Um tema",
} as const;
const sz = "size-4";

/**
 * The banks a game draws from: its themes, the Impostor's questions, What
 * for?'s missions and extras. Each row goes on or off (never deleted).
 */
export function ContentTab({ game, banks }: { game: GameKey; banks: Banks }) {
  // what was switched here, so the row shows it before the page reloads
  const [live, setLive] = useState<Record<string, boolean>>({});
  const isLive = (kind: BankKind, id: string, saved: boolean) =>
    live[`${kind}:${id}`] ?? saved;
  const toggle = async (kind: BankKind, id: string, now: boolean) => {
    const key = `${kind}:${id}`;
    setLive((l) => ({ ...l, [key]: !now }));
    const r = await setBankLiveAction(kind, id, !now);
    if (!r.ok) setLive((l) => ({ ...l, [key]: now }));
  };
  const btn = (kind: BankKind, id: string, saved: boolean, label: string) => {
    const on = isLive(kind, id, saved);
    return (
      <button
        type="button"
        className={on ? "btn sm ghost" : "btn sm"}
        aria-label={`${on ? "Tirar do ar" : "Pôr no ar"}: ${label}`}
        onClick={() => toggle(kind, id, on)}
      >
        {on ? <Eye className="i" /> : <EyeOff className="i" />}
        {on ? "No ar" : "Oculto"}
      </button>
    );
  };
  const cards: ReactNode[] = [];
  if (game === "impostor")
    cards.push(<Questions key="q" banks={banks} btn={btn} />);
  const themes = banks.themes.filter((t) => t.games.includes(game));
  if (themes.length)
    cards.push(<Themes key="t" themes={themes} btn={btn} isLive={isLive} />);
  if (game === "lineup") {
    cards.push(<Missions key="m" banks={banks} btn={btn} />);
    cards.push(<Extras key="x" banks={banks} btn={btn} />);
  }
  if (!cards.length)
    return <div className="empty">Este jogo não usa bancos de conteúdo.</div>;
  return <div className="stack">{cards}</div>;
}

type Btn = (
  kind: BankKind,
  id: string,
  saved: boolean,
  label: string,
) => ReactNode;
type IsLive = (kind: BankKind, id: string, saved: boolean) => boolean;

const match = (q: string, ...texts: string[]) => {
  const n = q.trim().toLowerCase();
  return !n || texts.some((t) => t.toLowerCase().includes(n));
};

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="field">
      <Search className="i" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Buscar"
      />
    </label>
  );
}

function Themes({
  themes,
  btn,
  isLive,
}: {
  themes: Banks["themes"];
  btn: Btn;
  isLive: IsLive;
}) {
  const href = useAdminHref();
  const t = useTranslations("common.themeSets");
  const [q, setQ] = useState("");
  const [set, setSet] = useState("all");
  const on = themes.filter((x) => isLive("theme", x.id, x.live)).length;
  const sets = THEME_SETS.filter((s) => themes.some((x) => x.set === s.key));
  const list = themes.filter(
    (x) => match(q, x.pt, x.id) && (set === "all" || x.set === set),
  );
  const P = usePaged(list, 20, `${q}|${set}`);
  const setName = (k: string | null) => {
    const s = THEME_SETS.find((x) => x.key === k);
    return s ? `${s.emoji} ${t(s.key)}` : "—";
  };
  return (
    <div className="card">
      <header>
        <h2>Temas</h2>
        <span className="chip sky">{on} no ar</span>
        <span className="chip">{themes.length - on} desligados</span>
        <span className="spacer" />
        <Link className="btn sm" href={href("/workshop")}>
          <Lightbulb className="i" />
          Oficina
        </Link>
      </header>
      <div className="filters">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Nome ou id do tema"
        />
        <AdminSelect
          label="Conjunto"
          value={set}
          onChange={setSet}
          options={[
            {
              value: "all",
              label: "Todo conjunto",
              icon: <Tags className={sz} />,
            },
            ...sets.map((s) => ({
              value: s.key,
              label: t(s.key),
              icon: <span aria-hidden="true">{s.emoji}</span>,
            })),
          ]}
        />
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Tema</th>
              <th>Conjunto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {P.rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.pt}</b>
                  <div className="ref">{x.id}</div>
                </td>
                <td>
                  <span className="chip">{setName(x.set)}</span>
                </td>
                <td className="r">{btn("theme", x.id, x.live, x.pt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {P.pager}
    </div>
  );
}

function Questions({ banks, btn }: { banks: Banks; btn: Btn }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const all = banks.questions;
  const list = all.filter(
    (x) => match(q, x.pt, x.id) && (kind === "all" || x.kind === kind),
  );
  const P = usePaged(list, 20, `${q}|${kind}`);
  const kinds = Object.keys(KIND_PT) as (keyof typeof KIND_PT)[];
  return (
    <div className="card">
      <header>
        <h2>Perguntas</h2>
        {kinds.map((k) => (
          <span key={k} className="chip grape">
            {KIND_PT[k]} {all.filter((x) => x.kind === k).length}
          </span>
        ))}
        <span className="spacer" />
        <span className="note">
          🌶 {all.filter((x) => x.spice === 1).length} · 🌶🌶{" "}
          {all.filter((x) => x.spice === 2).length} · 🌶🌶🌶{" "}
          {all.filter((x) => x.spice === 3).length}
        </span>
      </header>
      <div className="filters">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Texto ou id da pergunta"
        />
        <AdminSelect
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            {
              value: "all",
              label: "Todo tipo",
              icon: <MessageCircleQuestion className={sz} />,
            },
            ...kinds.map((k) => {
              const I = KIND_ICON[k];
              return {
                value: k,
                label: KIND_PT[k],
                icon: <I className={sz} />,
              };
            }),
          ]}
        />
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Pergunta</th>
              <th>Tipo</th>
              <th>Picância</th>
              <th>Vale para</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {P.rows.map((x) => {
              const I = KIND_ICON[x.kind] ?? MessageCircleQuestion;
              return (
                <tr key={x.id}>
                  <td>
                    <b>{x.pt}</b>
                    <div className="ref">{x.id}</div>
                  </td>
                  <td>
                    <span className="kchip2">
                      <I className="i" />
                      {KIND_PT[x.kind] ?? x.kind}
                    </span>
                  </td>
                  <td>{"🌶".repeat(x.spice)}</td>
                  <td className="muted">{SCOPE_PT[x.scope]}</td>
                  <td className="r">{btn("question", x.id, x.live, x.pt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {P.pager}
    </div>
  );
}

function Missions({ banks, btn }: { banks: Banks; btn: Btn }) {
  const [q, setQ] = useState("");
  const [tone, setTone] = useState("all");
  const all = banks.missions;
  const list = all.filter(
    (x) =>
      match(q, x.pt, x.id) &&
      (tone === "all" || (tone === "heavy" ? x.heavy : x.tone === tone)),
  );
  const P = usePaged(list, 20, `${q}|${tone}`);
  const tones = Object.keys(TONE_PT) as (keyof typeof TONE_PT)[];
  return (
    <div className="card">
      <header>
        <h2>Missões</h2>
        {tones.map((k) => (
          <span key={k} className="chip warn">
            {TONE_PT[k]} {all.filter((x) => x.tone === k).length}
          </span>
        ))}
        <span className="spacer" />
        <span className="note">
          {all.filter((x) => x.heavy).length} pesadas
        </span>
      </header>
      <div className="filters">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Texto ou id da missão"
        />
        <AdminSelect
          label="Clima"
          value={tone}
          onChange={setTone}
          options={[
            {
              value: "all",
              label: "Todo clima",
              icon: <Target className={sz} />,
            },
            ...tones.map((k) => {
              const I = TONE_ICON[k];
              return {
                value: k,
                label: TONE_PT[k],
                icon: <I className={sz} />,
              };
            }),
            {
              value: "heavy",
              label: "Só pesadas",
              icon: <TriangleAlert className={sz} />,
            },
          ]}
        />
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Missão</th>
              <th>Clima</th>
              <th>Pesada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {P.rows.map((x) => {
              const I = TONE_ICON[x.tone] ?? Target;
              return (
                <tr key={x.id}>
                  <td>
                    <b>{x.pt}</b>
                    <div className="ref">{x.id}</div>
                  </td>
                  <td>
                    <span className="kchip2">
                      <I className="i" />
                      {TONE_PT[x.tone] ?? x.tone}
                    </span>
                  </td>
                  <td>
                    {x.heavy ? <span className="chip no">pesada</span> : null}
                  </td>
                  <td className="r">{btn("mission", x.id, x.live, x.pt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {P.pager}
    </div>
  );
}

function Extras({ banks, btn }: { banks: Banks; btn: Btn }) {
  const [q, setQ] = useState("");
  const list = banks.extras.filter((x) => match(q, x.pt, x.id));
  const P = usePaged(list, 12, q);
  return (
    <div className="card">
      <header>
        <h2>Extras do leilão</h2>
        <span className="chip butter">{banks.extras.length}</span>
      </header>
      <div className="filters">
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Nome ou id do extra"
        />
      </div>
      <div
        className="pics"
        style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}
      >
        {P.rows.map((x) => (
          <div
            key={x.id}
            className="pcard"
            style={{ background: x.tint, color: "#1e2433" }}
          >
            <span style={{ fontSize: 34, lineHeight: 1 }}>{x.emoji}</span>
            <b>{x.pt}</b>
            <small className="mono" style={{ color: "#566075" }}>
              {x.id}
            </small>
            {btn("extra", x.id, x.live, x.pt)}
          </div>
        ))}
      </div>
      {P.pager}
    </div>
  );
}
