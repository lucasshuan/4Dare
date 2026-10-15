"use client";

import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Save,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Flag } from "@/components/ui/language-switch";
import { CATEGORIES } from "@/game/categories";
import { guestName } from "@/game/guest-names";
import { TASTE_KEYS, TASTES } from "@/game/tastes";
import { LANGS, type Lang } from "@/game/types";
import {
  characterAction,
  editCharacterAction,
  hiddenCharactersAction,
  libraryPageAction,
  nicknameAction,
  originsAction,
  pictureAction,
} from "@/server/admin/actions";
import type { CharacterFile, PendingPicture } from "@/server/admin/library";
import type { CharacterInfo } from "@/server/backend/admin-types";
import type { LibraryPage, LibrarySort } from "@/server/community-contract";
import { fmt } from "../format";
import { useAdminBase } from "../shell/base";
import { Pager } from "../ui/pager";
import { AdminSelect } from "../ui/select";

const PAGE = 36;

type Tab = "chars" | "pics" | "map";

/** The library: its characters and their pictures, the pictures waiting on a look, and the data map. */
export function LibraryScreen({
  first,
  pending,
  counts,
}: {
  first: LibraryPage;
  pending: PendingPicture[];
  counts: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>(pending.length ? "pics" : "chars");
  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Biblioteca</h1>
        </div>
      </div>
      <nav className="subtabs" aria-label="Partes">
        {(
          [
            ["chars", "Personagens", 0],
            ["pics", "Fotos pendentes", pending.length],
            ["map", "Mapa de dados", 0],
          ] as const
        ).map(([k, l, n]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {l}
            {n ? <span className="n">{n}</span> : null}
          </button>
        ))}
      </nav>
      {tab === "chars" ? (
        <Characters first={first} />
      ) : tab === "pics" ? (
        <Pending list={pending} />
      ) : (
        <DataMap counts={counts} />
      )}
    </>
  );
}

function Characters({ first }: { first: LibraryPage }) {
  const tc = useTranslations("common");
  const [page, setPage] = useState(first);
  const [hidden, setHidden] = useState<{ id: string; name: string }[] | null>(
    null,
  );
  const [showHidden, setShowHidden] = useState(false);
  const loadHidden = useCallback(async () => {
    const r = await hiddenCharactersAction();
    if (r.ok) setHidden(r.data);
  }, []);
  useEffect(() => {
    if (showHidden) void loadHidden();
  }, [showHidden, loadHidden]);
  const [q, setQ] = useState("");
  const [taste, setTaste] = useState("all");
  const [sort, setSort] = useState<LibrarySort>("top");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(
    async (o: number) => {
      const r = await libraryPageAction({
        q,
        taste: taste === "all" ? null : taste,
        sort,
        offset: o,
      });
      if (r.ok) {
        setPage(r.data);
        setOffset(o);
      }
    },
    [q, taste, sort],
  );
  const changed = q !== "" || taste !== "all" || sort !== "top";
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new search starts at the first page
  useEffect(() => {
    if (!changed && offset === 0) return setPage(first);
    const id = window.setTimeout(() => void load(0), 250);
    return () => window.clearTimeout(id);
  }, [q, taste, sort]);
  return (
    <>
      <div className="filters">
        <label className="field">
          <Search className="i" />
          <input
            type="search"
            placeholder="Nome, apelido ou obra"
            value={q}
            aria-label="Buscar personagem"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <AdminSelect
          label="Gosto"
          value={taste}
          onChange={setTaste}
          options={[
            { value: "all", label: "Todos os gostos" },
            ...TASTES.map((t) => ({
              value: t.key,
              label: tc(`tastes.${t.key}.name`),
            })),
          ]}
        />
        <AdminSelect
          label="Ordem"
          value={sort}
          onChange={(v) => setSort(v as LibrarySort)}
          options={[
            { value: "top", label: "Mais conhecidos" },
            { value: "new", label: "Mais novos" },
            { value: "nopic", label: "Sem foto" },
          ]}
        />
        <button
          type="button"
          className="btn sm"
          aria-pressed={showHidden}
          onClick={() => setShowHidden((v) => !v)}
        >
          <EyeOff className="i" />
          {showHidden ? "Voltar à biblioteca" : "Escondidos"}
        </button>
      </div>
      {showHidden ? (
        <HiddenList list={hidden} onOpen={setOpen} />
      ) : (
        <>
          <div className="note" style={{ marginBottom: 6 }}>
            {fmt(page.total)} personagens
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Personagem</th>
                  <th>Obra</th>
                  <th>Gosto</th>
                  <th className="r">Fotos</th>
                  <th>Criado por</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((c) => (
                  <tr
                    key={c.id}
                    className="click"
                    onClick={() => setOpen(c.id)}
                  >
                    <td>
                      <span className="nm">
                        {c.imageUrl ? (
                          // biome-ignore lint/performance/noImgElement: a library picture, small
                          <img className="thumb" alt="" src={c.imageUrl} />
                        ) : (
                          <span
                            className="thumb"
                            style={{
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              color: "var(--ink-muted)",
                            }}
                          >
                            ?
                          </span>
                        )}
                        <span>
                          <b>{c.name}</b>
                          <small className="mono">{c.id}</small>
                        </span>
                      </span>
                    </td>
                    <td>{c.origin ?? "—"}</td>
                    <td>
                      {c.taste ? (
                        <span className="chip">
                          {tc(`tastes.${c.taste}.name` as never)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="r mono">{c.pictures}</td>
                    <td>
                      {c.by ? (
                        `@${c.by.handle}`
                      ) : (
                        <span className="muted">biblioteca</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            total={page.total}
            page={Math.floor(offset / PAGE) + 1}
            size={PAGE}
            onPage={(p) => void load((p - 1) * PAGE)}
          />
        </>
      )}
      {open ? (
        <CharacterDrawer
          id={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            void load(offset);
            if (showHidden) void loadHidden();
          }}
        />
      ) : null}
    </>
  );
}

const ST: Record<string, [string, string]> = {
  active: ["Ativa", "yes"],
  pending: ["Pendente", "warn"],
  hidden: ["Escondida", "no"],
};

function CharacterDrawer({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { site } = useAdminBase();
  const tc = useTranslations("common");
  const [file, setFile] = useState<CharacterFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await characterAction(id);
    if (r.ok) setFile(r.data);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [onClose]);
  const set = async (pid: string, to: "active" | "hidden") => {
    setBusy(true);
    await pictureAction(pid, to);
    setBusy(false);
    await load();
  };
  const order = { active: 0, pending: 1, hidden: 2 };
  const list = [...(file?.images ?? [])].sort(
    (a, b) => order[a.status] - order[b.status] || b.score - a.score,
  );
  const main = list.find((x) => x.status === "active");
  const r = file?.row;
  const info = file?.info ?? null;
  const name =
    r?.name ??
    info?.names.find((n) => n.lang === "pt")?.name ??
    info?.names[0]?.name ??
    file?.id;
  const toggleHidden = async () => {
    if (!info) return;
    setBusy(true);
    setMsg(null);
    const res = await editCharacterAction(id, { hidden: !info.hidden });
    setBusy(false);
    if (!res.ok) return setMsg("Não deu para mudar.");
    await load();
    onChanged();
  };
  const nickname = async (nid: number, to: boolean) => {
    setBusy(true);
    await nicknameAction(nid, to);
    setBusy(false);
    await load();
    onChanged();
  };
  return (
    <>
      <button
        type="button"
        className="scrim"
        aria-label="Fechar"
        style={{ border: 0 }}
        onClick={onClose}
      />
      <aside className="drawer wide" aria-label="Personagem">
        {!file ? (
          <div className="empty">Carregando…</div>
        ) : (
          <>
            <div className="dh">
              {main ? (
                // biome-ignore lint/performance/noImgElement: the cover, as players see it
                <img className="cd-main" alt="" src={main.url} />
              ) : (
                <span className="cd-main empty">?</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="eyebrow">Personagem</p>
                <h2 style={{ fontSize: 26 }}>{name}</h2>
                <span className="row" style={{ gap: 6 }}>
                  <span className="muted mono" style={{ fontSize: 12 }}>
                    {file.id}
                  </span>
                  {info?.hidden ? (
                    <span className="chip no">
                      <EyeOff className="i" />
                      Escondido do site
                    </span>
                  ) : null}
                </span>
              </div>
              <button
                type="button"
                className="btn icon ghost"
                aria-label="Fechar"
                onClick={onClose}
              >
                <X className="i" />
              </button>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {info ? (
                <>
                  <button
                    type="button"
                    className={info.hidden ? "btn sm yes" : "btn sm no"}
                    disabled={busy}
                    onClick={toggleHidden}
                  >
                    {info.hidden ? (
                      <Eye className="i" />
                    ) : (
                      <EyeOff className="i" />
                    )}
                    {info.hidden ? "Mostrar de novo" : "Esconder personagem"}
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    aria-pressed={editing}
                    onClick={() => setEditing((v) => !v)}
                  >
                    <Pencil className="i" />
                    {editing ? "Fechar edição" : "Edição avançada"}
                  </button>
                </>
              ) : null}
              {info?.hidden ? null : (
                <a
                  className="btn sm ghost"
                  href={`${site.replace(/\/$/, "")}/characters/${id}`}
                  target="_blank"
                  rel="noopener"
                >
                  <ExternalLink className="i" />
                  Abrir ficha
                </a>
              )}
            </div>
            {msg ? (
              <p className="note" style={{ color: "var(--no)" }}>
                {msg}
              </p>
            ) : null}
            {editing && info ? (
              <CharacterEdit
                id={id}
                info={info}
                onSaved={async () => {
                  setEditing(false);
                  await load();
                  onChanged();
                }}
              />
            ) : null}
            <section className="cd-sec">
              <header className="row">
                <h3>Fotos</h3>
                <span className="chip">
                  {list.filter((x) => x.status === "active").length} ativas
                </span>
              </header>
              {list.length ? (
                <ol className="pics-rank">
                  {list.map((x) => (
                    <li
                      key={x.id}
                      className={`pr ${x === main ? "main" : ""} ${x.status}`}
                    >
                      <span className="pr-n mono">
                        {x.status === "active" ? "•" : "–"}
                      </span>
                      {/* biome-ignore lint/performance/noImgElement: a character picture */}
                      <img alt="" src={x.url} />
                      <div className="pr-info">
                        <div className="row" style={{ gap: 6 }}>
                          {x === main ? (
                            <span className="chip butter">
                              <Trophy className="i" />
                              Principal
                            </span>
                          ) : null}
                          <span className={`chip ${ST[x.status][1]}`}>
                            {ST[x.status][0]}
                          </span>
                          <span className="chip">
                            {x.createdBy
                              ? `Jogador · ${x.authorName ?? (x.authorGuest !== null ? guestName(x.authorGuest, "pt") : "convidado")}`
                              : "Biblioteca"}
                          </span>
                        </div>
                        <div className="pr-stats">
                          <span>
                            <b className="mono">{x.picks}</b> escolhas
                          </span>
                          <span>
                            <b className="mono">{x.keeps}</b> mantidas
                          </span>
                          <span>
                            <b className="mono">{x.reports}</b> denúncias
                          </span>
                          <span className="muted">
                            {new Date(x.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div className="pr-score">
                          <span className="mono">
                            <b>
                              {String(Math.round(x.score * 10) / 10).replace(
                                ".",
                                ",",
                              )}
                            </b>{" "}
                            pontos
                          </span>
                          <span className="muted mono">bônus {x.bonus}</span>
                        </div>
                      </div>
                      <div className="pr-act">
                        {x.status === "active" ? (
                          <button
                            type="button"
                            className="btn sm no"
                            disabled={busy}
                            onClick={() => set(x.id, "hidden")}
                          >
                            <EyeOff className="i" />
                            Esconder
                          </button>
                        ) : x.status === "pending" ? (
                          <div className="row" style={{ gap: 4 }}>
                            <button
                              type="button"
                              className="btn sm yes"
                              disabled={busy}
                              onClick={() => set(x.id, "active")}
                            >
                              <Check className="i" />
                              Aprovar
                            </button>
                            <button
                              type="button"
                              className="btn sm no"
                              disabled={busy}
                              onClick={() => set(x.id, "hidden")}
                            >
                              <EyeOff className="i" />
                              Esconder
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn sm"
                            disabled={busy}
                            onClick={() => set(x.id, "active")}
                          >
                            <Eye className="i" />
                            Restaurar
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty">Sem fotos.</div>
              )}
            </section>
            <section className="cd-sec">
              <h3>Dados</h3>
              <dl className="kv">
                {info ? (
                  <>
                    <dt>Tipo</dt>
                    <dd>
                      {info.kind === "human"
                        ? "Pessoa real"
                        : info.kind === "fictional"
                          ? "Ficção"
                          : "—"}
                    </dd>
                    <dt>Categoria</dt>
                    <dd>
                      {info.category
                        ? tc(`categories.${info.category}` as never)
                        : "—"}
                    </dd>
                    <dt>Gostos</dt>
                    <dd>
                      {info.tastes.length
                        ? info.tastes
                            .map((t) => tc(`tastes.${t}.name` as never))
                            .join(" · ")
                        : "—"}
                    </dd>
                    <dt>Obra</dt>
                    <dd>
                      {info.originLabel ?? info.customOrigin ?? "—"}
                      {info.originId ? (
                        <span className="muted mono"> · {info.originId}</span>
                      ) : null}
                    </dd>
                    {info.names.map((n) => (
                      <NameRow key={n.lang} n={n} />
                    ))}
                  </>
                ) : r ? (
                  <>
                    <dt>Nome</dt>
                    <dd>{r.name}</dd>
                    {r.otherNames.length ? (
                      <>
                        <dt>Outros nomes</dt>
                        <dd>{r.otherNames.join(" · ")}</dd>
                      </>
                    ) : null}
                    <dt>Obra</dt>
                    <dd>{r.origin ?? "—"}</dd>
                  </>
                ) : null}
                {r ? (
                  <>
                    <dt>Popularidade</dt>
                    <dd className="mono">
                      {r.popularity !== null ? fmt(r.popularity) : "—"}
                    </dd>
                  </>
                ) : null}
              </dl>
            </section>
            {info?.nicknames.some((n) => !n.removed) ? (
              <section className="cd-sec">
                <header className="row">
                  <h3>Apelidos dos jogadores</h3>
                  <span className="chip">
                    {info.nicknames.filter((n) => !n.removed).length}
                  </span>
                </header>
                <ul className="nick-list">
                  {info.nicknames
                    .filter((n) => !n.removed)
                    .map((n) => (
                      <li key={n.id} className={n.hidden ? "off" : ""}>
                        <Flag lang={n.lang as Lang} className="size-[16px]" />
                        <b>{n.name}</b>
                        {n.hidden ? (
                          <span className="chip no">Escondido</span>
                        ) : null}
                        <span className="spacer" />
                        <button
                          type="button"
                          className={n.hidden ? "btn sm" : "btn sm no"}
                          disabled={busy}
                          onClick={() => nickname(n.id, !n.hidden)}
                        >
                          {n.hidden ? (
                            <Eye className="i" />
                          ) : (
                            <EyeOff className="i" />
                          )}
                          {n.hidden ? "Restaurar" : "Esconder"}
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </aside>
    </>
  );
}

function NameRow({ n }: { n: CharacterInfo["names"][number] }) {
  return (
    <>
      <dt>
        <span className="row" style={{ gap: 6 }}>
          <Flag lang={n.lang as Lang} className="size-[16px]" />
          {n.lang}
        </span>
      </dt>
      <dd>
        <b>{n.name}</b>
        {n.aliases.length ? (
          <span className="muted"> · {n.aliases.join(", ")}</span>
        ) : null}
      </dd>
    </>
  );
}

function HiddenList({
  list,
  onOpen,
}: {
  list: { id: string; name: string }[] | null;
  onOpen: (id: string) => void;
}) {
  if (!list) return <div className="empty">Carregando…</div>;
  if (!list.length)
    return <div className="empty">Nenhum personagem escondido.</div>;
  return (
    <>
      <div className="note" style={{ marginBottom: 6 }}>
        {fmt(list.length)} escondidos do site
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Personagem</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="click" onClick={() => onOpen(c.id)}>
                <td>
                  <span className="nm">
                    <span
                      className="thumb"
                      style={{ display: "grid", placeItems: "center" }}
                    >
                      <EyeOff className="i" />
                    </span>
                    <span>
                      <b>{c.name}</b>
                      <small className="mono">{c.id}</small>
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const KIND_OPTIONS = [
  ["", "—"],
  ["fictional", "Ficção"],
  ["human", "Pessoa real"],
] as const;

/** Every field of a character the library keeps, in one form. */
function CharacterEdit({
  id,
  info,
  onSaved,
}: {
  id: string;
  info: CharacterInfo;
  onSaved: () => void | Promise<void>;
}) {
  const tc = useTranslations("common");
  const [kind, setKind] = useState(info.kind ?? "");
  const [category, setCategory] = useState(info.category ?? "");
  const [tastes, setTastes] = useState<string[]>(info.tastes);
  const [origin, setOrigin] = useState(info.originLabel ?? "");
  const [custom, setCustom] = useState(info.customOrigin ?? "");
  const [names, setNames] = useState(() =>
    Object.fromEntries(
      LANGS.map((l) => {
        const n = info.names.find((x) => x.lang === l);
        return [
          l,
          { name: n?.name ?? "", aliases: n?.aliases.join(", ") ?? "" },
        ];
      }),
    ),
  );
  const [origins, setOrigins] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    void originsAction().then((r) => r.ok && setOrigins(r.data));
  }, []);
  const listId = `origins-${id}`;
  const save = async () => {
    setMsg(null);
    const typed = origin.trim();
    let originId: string | null = null;
    if (typed) {
      const hit =
        origins.find((o) => o.label === typed) ??
        origins.find((o) => o.id === typed) ??
        (typed === info.originLabel && info.originId
          ? { id: info.originId }
          : null);
      if (!hit) return setMsg("Essa obra não está na biblioteca.");
      originId = hit.id;
    }
    setBusy(true);
    const r = await editCharacterAction(id, {
      kind: kind || null,
      category: category || null,
      tastes,
      originId,
      customOrigin: custom.trim() || null,
      names: LANGS.map((l) => ({
        lang: l,
        name: names[l].name,
        aliases: names[l].aliases
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      })),
    });
    setBusy(false);
    if (!r.ok) return setMsg("Não deu para salvar.");
    await onSaved();
  };
  return (
    <section className="cd-sec char-edit">
      <h3>Edição avançada</h3>
      <div className="form-grid">
        <div className="fld">
          Tipo
          <div className="seg sm">
            {KIND_OPTIONS.map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={kind === v}
                onClick={() => setKind(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="fld">
          Categoria
          <AdminSelect
            label="Categoria"
            value={category || "none"}
            onChange={(v) => setCategory(v === "none" ? "" : v)}
            options={[
              { value: "none", label: "—" },
              ...CATEGORIES.map((c) => ({
                value: c,
                label: tc(`categories.${c}`),
              })),
            ]}
          />
        </div>
        <div className="fld full">
          Gostos
          <div className="seg sm">
            {TASTE_KEYS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tastes.includes(t)}
                onClick={() =>
                  setTastes((all) =>
                    all.includes(t) ? all.filter((x) => x !== t) : [...all, t],
                  )
                }
              >
                {tc(`tastes.${t}.name`)}
              </button>
            ))}
          </div>
        </div>
        <label className="fld">
          Obra da biblioteca
          <input
            type="text"
            list={listId}
            value={origin}
            placeholder="Busque pelo nome"
            onChange={(e) => setOrigin(e.target.value)}
          />
          <datalist id={listId}>
            {origins.map((o) => (
              <option key={o.id} value={o.label} />
            ))}
          </datalist>
        </label>
        <label className="fld">
          Obra escrita à mão
          <input
            type="text"
            value={custom}
            maxLength={120}
            placeholder="Só se não houver na biblioteca"
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
      </div>
      <h3 style={{ marginTop: 14 }}>Nomes</h3>
      <p className="note" style={{ margin: "0 0 8px" }}>
        Outros nomes vão separados por vírgula. Um idioma sem nome fica como
        está.
      </p>
      <div className="tr-grid">
        {LANGS.map((l) => (
          <div key={l} className="tr-row">
            <span className="lg">
              <Flag lang={l} className="size-[18px]" />
              {l}
            </span>
            <span className="stack" style={{ gap: 4 }}>
              <input
                value={names[l].name}
                maxLength={80}
                placeholder="Nome"
                aria-label={`Nome (${l})`}
                onChange={(e) =>
                  setNames((all) => ({
                    ...all,
                    [l]: { ...all[l], name: e.target.value },
                  }))
                }
              />
              <input
                value={names[l].aliases}
                placeholder="Outros nomes"
                aria-label={`Outros nomes (${l})`}
                onChange={(e) =>
                  setNames((all) => ({
                    ...all,
                    [l]: { ...all[l], aliases: e.target.value },
                  }))
                }
              />
            </span>
          </div>
        ))}
      </div>
      {msg ? (
        <p className="note" style={{ color: "var(--no)" }}>
          {msg}
        </p>
      ) : null}
      <div className="row" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn yes"
          disabled={busy}
          onClick={save}
        >
          <Save className="i" />
          Salvar
        </button>
      </div>
    </section>
  );
}

function Pending({ list }: { list: PendingPicture[] }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, "active" | "hidden">>({});
  const set = async (id: string, to: "active" | "hidden") => {
    const r = await pictureAction(id, to);
    if (r.ok) {
      setDone((d) => ({ ...d, [id]: to }));
      router.refresh();
    }
  };
  if (!list.length) return <div className="empty">Nenhuma foto esperando.</div>;
  return (
    <div className="pics">
      {list.map((p) => {
        const st = done[p.id];
        return (
          <div
            key={p.id}
            className="pcard"
            style={st ? { opacity: 0.6 } : undefined}
          >
            {/* biome-ignore lint/performance/noImgElement: a player's picture, as sent */}
            <img
              className="pic"
              alt={`Foto enviada para ${p.name ?? "um nome novo"}`}
              src={p.url}
            />
            <b>{p.name ?? "Nome novo"}</b>
            <small>
              por{" "}
              {p.authorName ??
                (p.authorGuest !== null
                  ? guestName(p.authorGuest, "pt")
                  : "convidado")}
            </small>
            <div className="row" style={{ gap: 6 }}>
              {st ? (
                <span className={`chip ${st === "active" ? "yes" : "no"}`}>
                  {st === "active" ? "aprovada" : "escondida"}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn sm yes"
                    onClick={() => set(p.id, "active")}
                  >
                    <Check className="i" />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="btn sm no"
                    onClick={() => set(p.id, "hidden")}
                  >
                    <EyeOff className="i" />
                    Esconder
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MAP: [string, number, number, string?][] = [
  ["profiles", 30, 40, "Pessoas e partidas"],
  ["match_players", 30, 120],
  ["matches", 30, 200],
  ["rooms", 30, 280],
  ["characters", 300, 40, "Biblioteca"],
  ["character_names", 300, 120],
  ["character_images", 300, 200],
  ["character_aliases", 300, 280],
  ["whoami_themes", 570, 40, "Temas e bancos"],
  ["whoami_theme_starters", 570, 120],
  ["impostor_questions", 570, 200],
  ["lineup_missions", 570, 280],
  ["workshop_suggestions", 840, 40, "Oficina e social"],
  ["workshop_votes", 840, 120],
  ["user_badges", 840, 200],
  ["player_reports", 840, 280],
];
const EDGES: [string, string][] = [
  ["profiles", "match_players"],
  ["match_players", "matches"],
  ["matches", "rooms"],
  ["characters", "character_names"],
  ["characters", "character_images"],
  ["characters", "character_aliases"],
  ["whoami_themes", "whoami_theme_starters"],
  ["whoami_theme_starters", "characters"],
  ["workshop_suggestions", "workshop_votes"],
  ["profiles", "user_badges"],
];

function DataMap({ counts }: { counts: Record<string, number> }) {
  const W = 200;
  const H = 46;
  const pos = Object.fromEntries(
    MAP.map(([n, x, y]) => [n, [x, y + 10]]),
  ) as Record<string, [number, number]>;
  const edge = ([a, b]: [string, string]) => {
    const [x1, y1] = pos[a];
    const [x2, y2] = pos[b];
    if (x1 === x2) return `M${x1 + W / 2} ${y1 + H} L${x2 + W / 2} ${y2}`;
    const s = x1 < x2 ? [x1 + W, y1 + H / 2] : [x1, y1 + H / 2];
    const e = x1 < x2 ? [x2, y2 + H / 2] : [x2 + W, y2 + H / 2];
    const mx = (s[0] + e[0]) / 2;
    return `M${s[0]} ${s[1]} C${mx} ${s[1]} ${mx} ${e[1]} ${e[0]} ${e[1]}`;
  };
  return (
    <div className="card">
      <header>
        <h2>Entidades e relações</h2>
      </header>
      <div className="tbl-wrap">
        <svg
          className="erd"
          viewBox="0 0 1060 350"
          style={{ minWidth: 820 }}
          role="img"
          aria-label="Mapa de dados"
        >
          {MAP.filter((m) => m[3]).map(([, x, , t]) => (
            <g key={t}>
              <rect
                className="grp"
                x={x - 10}
                y={8}
                width={220}
                height={334}
                rx={16}
              />
              <text className="grp-t" x={x} y={28}>
                {t}
              </text>
            </g>
          ))}
          {EDGES.map((e) => (
            <path key={e.join("-")} d={edge(e)} />
          ))}
          {MAP.map(([n, x, y]) => (
            <g key={n} className="n">
              <rect x={x} y={y + 10} width={W} height={H} rx={12} />
              <text x={x + 12} y={y + 30}>
                {n}
              </text>
              <text className="c" x={x + 12} y={y + 46}>
                {counts[n] !== undefined ? `${fmt(counts[n])} linhas` : "—"}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
