"use client";

import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { GameThumb } from "@/features/create/game-info";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { levelOf } from "@/game/profile/xp";
import type { UserRow } from "@/server/admin/people";
import type { Role } from "@/server/contract";
import { ago, fmt } from "../format";
import { useAdminBase } from "../shell/base";
import { usePaged } from "../ui/pager";
import { AdminSelect } from "../ui/select";
import { faceOf, nameOf, ROLE_ICON, ROLE_PT, RoleChip, SANCTION } from "./bits";
import { usePersonDrawer } from "./person-drawer";

type Sort = "name" | "plays" | "xp" | "seen" | "created";

const LANG_PT: Record<string, string> = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
  ja: "Japonês",
};

/** The accounts: who they are, how they sign in, how much they play. */
export function UsersScreen({
  users,
  names,
}: {
  users: UserRow[];
  names: Record<GameKey, string>;
}) {
  const { open } = usePersonDrawer();
  const { site } = useAdminBase();
  const [q, setQ] = useState("");
  const [link, setLink] = useState("all");
  const [role, setRole] = useState<"all" | Role>("all");
  const [lang, setLang] = useState("all");
  const [game, setGame] = useState<"all" | GameKey>("all");
  const [active, setActive] = useState("all");
  const [min, setMin] = useState(0);
  const [sort, setSort] = useState<Sort>("plays");
  const [dir, setDir] = useState(-1);
  const providers = useMemo(
    () => [
      ...new Set(users.flatMap((u) => u.providers.map((p) => p.provider))),
    ],
    [users],
  );
  const rows = useMemo(() => {
    const now = Date.now();
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    const list = users.filter((u) => {
      if (
        needle &&
        !`${u.name ?? ""} ${u.handle ?? ""} ${u.id}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (link !== "all" && !u.providers.some((p) => p.provider === link))
        return false;
      if (role !== "all" && u.role !== role) return false;
      if (lang !== "all" && !u.langs.includes(lang as never)) return false;
      if (game !== "all" && !u.perGame[game]) return false;
      if (u.plays < min) return false;
      if (active !== "all") {
        const seen = Math.max(u.seenAt ?? 0, u.lastAt ?? 0);
        if (now - seen > Number(active) * 864e5) return false;
      }
      return true;
    });
    const key: Record<Sort, (u: UserRow) => string | number> = {
      name: (u) => (u.name ?? u.handle ?? "").toLowerCase(),
      plays: (u) => u.plays,
      xp: (u) => u.xp,
      seen: (u) => u.seenAt ?? 0,
      created: (u) => u.createdAt,
    };
    return list.sort((a, b) => {
      const x = key[sort](a);
      const y = key[sort](b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
  }, [users, q, link, role, lang, game, min, active, sort, dir]);
  const sig = JSON.stringify([
    q,
    link,
    role,
    lang,
    game,
    min,
    active,
    sort,
    dir,
  ]);
  const { rows: shown, pager } = usePaged(rows, 20, sig);
  const filtered =
    q || min || [link, role, lang, game, active].some((v) => v !== "all");
  const th = (k: Sort, label: string, cls = "") => (
    <th
      className={cls}
      data-sort={k}
      aria-sort={
        sort === k ? (dir < 0 ? "descending" : "ascending") : undefined
      }
      onClick={() => {
        if (sort === k) setDir((d) => -d);
        else {
          setSort(k);
          setDir(k === "name" ? 1 : -1);
        }
      }}
    >
      {label}{" "}
      <span className="arr">{sort === k ? (dir < 0 ? "↓" : "↑") : ""}</span>
    </th>
  );
  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Usuários</h1>
        </div>
        <div className="row">
          <span className="chip grape">{users.length} contas</span>
        </div>
      </div>
      <div className="filters">
        <label className="field">
          <Search className="i" />
          <input
            type="search"
            placeholder="Nome, @handle ou id"
            value={q}
            aria-label="Buscar"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <AdminSelect
          label="Integração"
          value={link}
          onChange={setLink}
          options={[
            { value: "all", label: "Toda integração" },
            ...providers.map((p) => ({
              value: p,
              label: p[0].toUpperCase() + p.slice(1),
              icon:
                p === "discord" || p === "google" ? (
                  // biome-ignore lint/performance/noImgElement: tiny static brand svg
                  <img src={`/icons/${p}.svg`} alt="" width={16} height={16} />
                ) : undefined,
            })),
          ]}
        />
        <AdminSelect
          label="Papel"
          value={role}
          onChange={(v) => setRole(v as "all" | Role)}
          options={[
            { value: "all", label: "Todo papel" },
            ...(["admin", "curator", "player"] as const).map((r) => {
              const Icon = ROLE_ICON[r];
              return {
                value: r,
                label: ROLE_PT[r],
                icon: <Icon className="size-4" />,
              };
            }),
          ]}
        />
        <AdminSelect
          label="Idioma"
          value={lang}
          onChange={setLang}
          options={[
            { value: "all", label: "Todo idioma" },
            ...Object.entries(LANG_PT).map(([v, l]) => ({
              value: v,
              label: `Fala ${l.toLowerCase()}`,
            })),
          ]}
        />
        <AdminSelect
          label="Jogou"
          value={game}
          onChange={(v) => setGame(v as "all" | GameKey)}
          options={[
            { value: "all", label: "Qualquer jogo" },
            ...GAME_KEYS.map((g) => ({
              value: g,
              label: `Jogou ${names[g]}`,
              icon: <GameThumb game={g} size="tiny" />,
            })),
          ]}
        />
        <AdminSelect
          label="Ativo"
          value={active}
          onChange={setActive}
          options={[
            { value: "all", label: "Desde sempre" },
            { value: "7", label: "Ativos em 7 dias" },
            { value: "30", label: "Ativos em 30 dias" },
          ]}
        />
        <span className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600 }}>
          Mín. partidas
          <span className="step">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => setMin((m) => Math.max(0, m - 1))}
            >
              −
            </button>
            <output>{min}</output>
            <button
              type="button"
              aria-label="Mais"
              onClick={() => setMin((m) => m + 1)}
            >
              +
            </button>
          </span>
        </span>
        {filtered ? (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              setQ("");
              setLink("all");
              setRole("all");
              setLang("all");
              setGame("all");
              setActive("all");
              setMin(0);
            }}
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
      <div className="note" style={{ marginBottom: 6 }}>
        {rows.length} de {users.length}
      </div>
      {rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {th("name", "Conta")}
                <th>Integrações</th>
                <th>Papel</th>
                <th>Fala</th>
                {th("plays", "Partidas", "r")}
                {th("xp", "XP", "r")}
                <th className="r">Nível</th>
                <th>Jogos</th>
                {th("seen", "Último acesso")}
                {th("created", "Desde")}
                <th className="r">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const games = (Object.keys(u.perGame) as GameKey[]).filter(
                  (g) => u.perGame[g],
                );
                return (
                  <tr key={u.id} className="click" onClick={() => open(u.id)}>
                    <td>
                      <span className="nm">
                        <Avatar
                          avatar={faceOf({
                            avatar: u.avatar,
                            guestNumber: null,
                          })}
                          size={32}
                        />
                        <span>
                          <b>
                            {nameOf({
                              name: u.name ?? u.handle,
                              guestNumber: null,
                            })}
                          </b>
                          <small>
                            {u.handle ? `@${u.handle}` : "sem @"}
                            {u.standing.active ? (
                              <>
                                {" · "}
                                <span className="ban-tag">
                                  {SANCTION[
                                    u.standing.active.kind
                                  ][0].toLowerCase()}
                                </span>
                              </>
                            ) : null}
                            {u.open
                              ? ` · ${u.open} ${u.open === 1 ? "denúncia" : "denúncias"}`
                              : ""}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span
                        className="row"
                        style={{ gap: 6, flexWrap: "nowrap" }}
                      >
                        {u.providers.map((p) =>
                          p.provider === "discord" ||
                          p.provider === "google" ? (
                            // biome-ignore lint/performance/noImgElement: tiny static brand svg
                            <img
                              key={`${p.provider}-${p.at}`}
                              className="prov"
                              src={`/icons/${p.provider}.svg`}
                              alt={p.provider}
                              title={p.name ?? p.provider}
                              width={18}
                              height={18}
                            />
                          ) : (
                            <span
                              key={`${p.provider}-${p.at}`}
                              className="chip"
                            >
                              {p.provider}
                            </span>
                          ),
                        )}
                      </span>
                    </td>
                    <td>
                      <RoleChip of={u.role} />
                    </td>
                    <td className="mono">{u.langs.join(" ") || "—"}</td>
                    <td className="r mono">{u.plays}</td>
                    <td className="r mono">{fmt(u.xp)}</td>
                    <td className="r mono">{levelOf(u.xp).level}</td>
                    <td>
                      <span
                        className="row"
                        style={{ gap: 3, flexWrap: "nowrap" }}
                      >
                        {games.map((g) => (
                          <GameThumb key={g} game={g} size="tiny" />
                        ))}
                        {games.length ? null : <span className="muted">—</span>}
                      </span>
                    </td>
                    <td>{u.seenAt ? ago(u.seenAt) : "—"}</td>
                    <td className="mono muted">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="r">
                      {u.handle ? (
                        <a
                          className="btn sm icon ghost"
                          href={`${site.replace(/\/$/, "")}/u/${u.handle}`}
                          target="_blank"
                          rel="noopener"
                          aria-label={`Perfil de @${u.handle}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="i" />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhuma conta com esses filtros.</div>
      )}
      {pager}
    </>
  );
}
