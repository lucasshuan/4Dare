"use client";

import {
  Flag as FlagIcon,
  Gamepad2,
  ImageIcon,
  LayoutGrid,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Flag } from "@/components/ui/language-switch";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { type GameKey, isGameKey } from "@/game/games";
import { LANGS, type Lang } from "@/game/types";
import type { AdminStats } from "@/server/backend/admin-types";
import { dur, fmt, gameColor } from "../format";
import { SECTIONS } from "../nav";
import { useAdminHref } from "../shell/base";
import { Donut, HBars, type Series, StackedDays } from "./charts";

const LANG_PT: Record<Lang, string> = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
  ja: "Japonês",
};
const LANG_COLOR: Record<Lang, string> = {
  pt: "var(--sky)",
  en: "var(--apricot)",
  es: "var(--grape)",
  ja: "var(--yes)",
};

const DAY = 86_400_000;
const dateLong = (ms: number) =>
  new Date(ms).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

interface Alert {
  key: string;
  sev: "hi" | "md" | "lo";
  Icon: LucideIcon;
  text: string;
  /** A panel section to open, when it exists yet. */
  to?: { section: string; path: string; label: string };
}

/** The overview: what needs the admin, then the numbers. Read only. */
export function OverviewScreen({
  stats: s,
  name,
  now,
}: {
  stats: AdminStats;
  name: string;
  /** The server's clock (ms), so the page reads the same on both sides. */
  now: number;
}) {
  const href = useAdminHref();
  const gameName = useGameName();
  const nameOf = (k: string) => (isGameKey(k) ? gameName(k) : k);
  const games = [...s.games].sort((a, b) => b.matches - a.matches);
  const hour = Number(
    new Date(now).toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }),
  );
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const weekday = new Date(now).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  const alerts: Alert[] = [];
  if (s.library.pending) {
    const days = s.library.pendingSince
      ? Math.max(0, Math.floor((now - s.library.pendingSince) / DAY))
      : 0;
    alerts.push({
      key: "pictures",
      sev: days >= 2 ? "hi" : "md",
      Icon: ImageIcon,
      text: `${s.library.pending} ${s.library.pending === 1 ? "foto de jogador esperando" : "fotos de jogadores esperando"}${days ? ` há ${days} ${days === 1 ? "dia" : "dias"}` : ""}`,
      to: { section: "library", path: "/library?tab=pics", label: "Moderar" },
    });
  }
  if (s.reportsWeek)
    alerts.push({
      key: "reports",
      sev: "hi",
      Icon: FlagIcon,
      text: `${s.reportsWeek} ${s.reportsWeek === 1 ? "denúncia" : "denúncias"} nos últimos 7 dias`,
      to: { section: "reports", path: "/reports", label: "Ver denúncias" },
    });
  const queue = s.workshop.voting + s.workshop.review;
  if (queue)
    alerts.push({
      key: "workshop",
      sev: "md",
      Icon: Lightbulb,
      text: `${queue} ${queue === 1 ? "sugestão" : "sugestões"} na fila da oficina`,
      to: { section: "workshop", path: "/workshop", label: "Revisar" },
    });
  if (s.rooms.stale)
    alerts.push({
      key: "rooms",
      sev: "md",
      Icon: LayoutGrid,
      text: `${s.rooms.stale} ${s.rooms.stale === 1 ? "sala parada" : "salas paradas"} há mais de 12 h`,
      to: { section: "rooms", path: "/rooms", label: "Ver salas" },
    });
  for (const g of games)
    if (g.matches && g.avgSec !== null && g.avgSec < 5)
      alerts.push({
        key: `short-${g.game}`,
        sev: "md",
        Icon: Gamepad2,
        text:
          g.matches === 1
            ? `${nameOf(g.game)}: a única partida registrada durou ${g.avgSec} s`
            : `${nameOf(g.game)}: as partidas duram ${g.avgSec} s em média`,
        to: { section: "games", path: `/games/${g.game}`, label: "Abrir jogo" },
      });
  const open = (id: string) => SECTIONS.some((x) => x.id === id);

  const top = games.slice(0, 4);
  const rest = games.slice(4);
  const series: Series[] = top.map((g) => ({
    name: nameOf(g.game),
    keys: [g.game],
    color: gameColor(g.game),
  }));
  if (rest.length)
    series.push({
      name: "Outros",
      keys: rest.map((g) => g.game),
      color: "var(--line-strong)",
    });
  const days = s.days.map((d) => {
    const [, m, day] = d.day.split("-");
    return {
      label: day,
      title: `${day}/${m}`,
      by: d.by as Record<string, number>,
    };
  });
  const langs = LANGS.map((l) => ({ l, n: s.langs[l] ?? 0 })).sort(
    (a, b) => b.n - a.n,
  );

  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Visão geral · {weekday}</p>
          <h1>
            {hello}, {name}
          </h1>
          <p className="lead">
            {s.since
              ? `Desde ${dateLong(s.since)}: ${fmt(s.matches)} ${s.matches === 1 ? "partida" : "partidas"} e ${fmt(s.players)} ${s.players === 1 ? "jogador" : "jogadores"}.`
              : "Nenhuma partida ainda."}
          </p>
        </div>
      </div>

      {alerts.length ? (
        <section className="alerts" aria-label="Precisa de atenção">
          {alerts.map((a) => (
            <div className="alert" key={a.key}>
              <span className={`sev ${a.sev}`}>
                <a.Icon className="i" />
              </span>
              <div>
                <b>{a.text}</b>
              </div>
              {a.to && open(a.to.section) ? (
                <Link className="btn sm" href={href(a.to.path)}>
                  {a.to.label}
                </Link>
              ) : (
                <span />
              )}
            </div>
          ))}
        </section>
      ) : null}

      <div className="grid g4" style={{ marginTop: 16 }}>
        <Kpi
          k="Partidas"
          v={fmt(s.matches)}
          s={
            games
              .slice(0, 3)
              .map((g) => `${g.matches} ${nameOf(g.game)}`)
              .join(" · ") +
            (games.length > 3
              ? ` · ${games.slice(3).reduce((a, g) => a + g.matches, 0)} nos outros`
              : "")
          }
          bar={games.map((g) => ({
            key: g.game,
            share: s.matches ? g.matches / s.matches : 0,
            color: gameColor(g.game),
            title: `${nameOf(g.game)}: ${g.matches}`,
          }))}
        />
        <Kpi
          k="Jogadores únicos"
          v={fmt(s.players)}
          s={`${fmt(s.plays)} participações em ${fmt(s.matches)} partidas`}
        />
        <Kpi
          k="Salas abertas"
          v={fmt(s.rooms.open)}
          s={`${s.rooms.activeHour} com atividade na última hora · ${s.rooms.lobby} em lobby · ${s.rooms.playing} jogando`}
          bar={
            s.rooms.open
              ? [
                  {
                    key: "playing",
                    share: s.rooms.playing / s.rooms.open,
                    color: "var(--yes)",
                    title: `Jogando: ${s.rooms.playing}`,
                  },
                  {
                    key: "lobby",
                    share: s.rooms.lobby / s.rooms.open,
                    color: "var(--apricot)",
                    title: `Lobby: ${s.rooms.lobby}`,
                  },
                ]
              : undefined
          }
        />
        <Kpi
          k="Biblioteca"
          v={fmt(s.library.characters)}
          s={`${fmt(s.library.images)} fotos · ${s.library.pending} pendentes · ${fmt(s.library.byPlayers)} criados por jogadores`}
        />
      </div>

      <div className="grid g3" style={{ marginTop: 16 }}>
        <div className="card span2">
          <header>
            <h2>Partidas por dia</h2>
            <span className="spacer" />
            <div className="legend">
              {series.map((x) => (
                <span key={x.name}>
                  <i style={{ background: x.color }} />
                  {x.name}
                </span>
              ))}
            </div>
          </header>
          <StackedDays days={days} series={series} />
        </div>
        <div className="card">
          <header>
            <h2>Idioma das jogadas</h2>
          </header>
          <div className="row" style={{ justifyContent: "center", gap: 18 }}>
            <Donut
              label="Idioma das jogadas"
              parts={langs.map((x) => ({ n: x.n, color: LANG_COLOR[x.l] }))}
            />
            <div className="legend" style={{ flexDirection: "column", gap: 6 }}>
              {langs.map((x) => (
                <span key={x.l} className="row" style={{ gap: 6 }}>
                  <Flag lang={x.l} className="size-4" />
                  <i style={{ background: LANG_COLOR[x.l], margin: 0 }} />
                  {LANG_PT[x.l]} <b className="mono">{x.n}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid g3" style={{ marginTop: 16 }}>
        <div className="card">
          <header>
            <h2>Por jogo</h2>
          </header>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Jogo</th>
                  <th className="r">Partidas</th>
                  <th className="r">Duração média</th>
                </tr>
              </thead>
              <tbody>
                {games.slice(0, 5).map((g) => (
                  <tr key={g.game}>
                    <td>
                      <span className="nm">
                        {isGameKey(g.game) ? (
                          <GameThumb game={g.game as GameKey} size="xs" />
                        ) : null}
                        <b>{nameOf(g.game)}</b>
                      </span>
                    </td>
                    <td className="r mono">{g.matches}</td>
                    <td className="r mono">{dur(g.avgSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <header>
            <h2>Temas mais jogados</h2>
          </header>
          <HBars
            rows={s.topThemes.map((t) => ({
              key: t.id,
              label: t.name,
              n: t.n,
            }))}
          />
        </div>
        <div className="card">
          <header>
            <h2>Personagens mais escolhidos</h2>
          </header>
          <HBars
            color="var(--apricot)"
            rows={s.topPicks.map((t) => ({ key: t.id, label: t.name, n: t.n }))}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <header>
          <h2>Bancos de conteúdo</h2>
        </header>
        <div className="row">
          <Chip tone="sky">
            Temas · {s.banks.themesOn} ativos · {s.banks.themesOff} desligados
          </Chip>
          <Chip tone="grape">
            Perguntas do Impostor · {s.banks.questions} · 🌶 {s.banks.spice[1]} /
            🌶🌶 {s.banks.spice[2]} / 🌶🌶🌶 {s.banks.spice[3]}
          </Chip>
          <Chip tone="warn">
            Missões · {s.banks.missions} · {s.banks.heavy} pesadas
          </Chip>
          <Chip tone="butter">Extras · {s.banks.extras}</Chip>
          <Chip tone="no">Bloqueados · {s.banks.blocked}</Chip>
          <Chip>
            Oficina · {s.workshop.voting} em voto · {s.workshop.review} em
            análise
          </Chip>
          <Chip>Apelidos de jogadores · {fmt(s.library.aliases)}</Chip>
        </div>
      </div>
    </>
  );
}

function Kpi({
  k,
  v,
  s,
  bar,
}: {
  k: string;
  v: string;
  s: string;
  bar?: { key: string; share: number; color: string; title: string }[];
}) {
  return (
    <div className="card kpi">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      <span className="s">{s}</span>
      {bar ? (
        <span className="bar">
          {bar.map((b) => (
            <i
              key={b.key}
              title={b.title}
              style={{ width: `${b.share * 100}%`, background: b.color }}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Chip({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={tone ? `chip ${tone}` : "chip"}>{children}</span>;
}
