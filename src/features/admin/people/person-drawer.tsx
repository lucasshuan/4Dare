"use client";

import {
  ArrowLeft,
  Award,
  Ban,
  Check,
  Copy,
  ExternalLink,
  Flag,
  MessageSquare,
  RotateCcw,
  TriangleAlert,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { GameThumb } from "@/features/create/game-info";
import { type GameKey, isGameKey } from "@/game/games";
import { levelOf } from "@/game/profile/xp";
import {
  liftAction,
  personAction,
  sanctionAction,
  setRoleAction,
} from "@/server/admin/actions";
import type { PersonFile } from "@/server/admin/people";
import type { AdminReport, PersonRef } from "@/server/backend/people-types";
import type { Role } from "@/server/contract";
import { ago, fmt } from "../format";
import { useAdminBase } from "../shell/base";
import { AdminSelect } from "../ui/select";
import {
  faceOf,
  KindChip,
  nameOf,
  PersonChip,
  ReasonChip,
  ROLE_ICON,
  ROLE_PT,
  RoleChip,
  SanctionChip,
  untilText,
} from "./bits";

type Tab = "profile" | "mod";

interface Drawer {
  open: (id: string, tab?: Tab) => void;
}

const DrawerContext = createContext<Drawer>({ open: () => {} });

/** Opens the one person drawer of the panel, from any page. */
export const usePersonDrawer = () => useContext(DrawerContext);

const GAME_PT: Record<GameKey, string> = {
  "who-am-i": "Quem sou eu?",
  impostor: "Impostor",
  lineup: "Escalação",
};

/** The panel's person drawer: Perfil (the account) and Moderação (its reports and what to do). */
export function PersonDrawerProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<{ id: string; tab: Tab }[]>([]);
  const open = useCallback((id: string, tab: Tab = "profile") => {
    setStack((s) => (s.at(-1)?.id === id ? s : [...s, { id, tab }].slice(-6)));
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  const top = stack.at(-1) ?? null;
  return (
    <DrawerContext value={value}>
      {children}
      {top ? (
        <PersonLayer
          key={top.id}
          id={top.id}
          tab={top.tab}
          back={stack.length > 1 ? () => setStack((s) => s.slice(0, -1)) : null}
          onClose={() => setStack([])}
        />
      ) : null}
    </DrawerContext>
  );
}

function PersonLayer({
  id,
  tab: first,
  back,
  onClose,
}: {
  id: string;
  tab: Tab;
  back: (() => void) | null;
  onClose: () => void;
}) {
  const [file, setFile] = useState<PersonFile | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>(first);
  const load = useCallback(async () => {
    const r = await personAction(id);
    if (r.ok) setFile(r.data);
    else setError(true);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [onClose]);
  const account = !!file?.user;
  const shown = account ? tab : "mod";
  const open = file?.reports.filter((r) => r.open).length ?? 0;
  return (
    <>
      <button
        type="button"
        className="scrim"
        aria-label="Fechar"
        style={{ border: 0 }}
        onClick={onClose}
      />
      <aside className="drawer" aria-label="Pessoa">
        {back ? (
          <button type="button" className="btn sm ghost" onClick={back}>
            <ArrowLeft className="i" />
            Voltar
          </button>
        ) : null}
        {!file ? (
          <div className="empty">
            {error ? "Não deu para abrir." : "Carregando…"}
          </div>
        ) : (
          <>
            <Head file={file} onClose={onClose} />
            {account ? (
              <nav className="subtabs dtabs" aria-label="Partes">
                <button
                  type="button"
                  aria-pressed={shown === "profile"}
                  onClick={() => setTab("profile")}
                >
                  <Users className="i" />
                  Perfil
                </button>
                <button
                  type="button"
                  aria-pressed={shown === "mod"}
                  onClick={() => setTab("mod")}
                >
                  <Flag className="i" />
                  Moderação
                  {open ? <span className="n">{open}</span> : null}
                </button>
              </nav>
            ) : null}
            {shown === "mod" ? (
              <Moderation file={file} reload={load} />
            ) : (
              <Profile file={file} reload={load} />
            )}
          </>
        )}
      </aside>
    </>
  );
}

function Head({ file, onClose }: { file: PersonFile; onClose: () => void }) {
  const p = file.person;
  const u = file.user;
  return (
    <div className="dh">
      <Avatar avatar={faceOf(p)} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24 }}>{nameOf(p)}</h2>
          {u ? <RoleChip of={u.role} /> : null}
          {file.standing.active ? (
            <SanctionChip s={file.standing.active} />
          ) : null}
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {u
            ? `${u.handle ? `@${u.handle} · ` : ""}No 4Dare desde ${new Date(u.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}`
            : "Sem conta: jogou só com o navegador"}
        </span>
        {u?.quote ? <p className="uquote">“{u.quote}”</p> : null}
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
  );
}

const PRIV: [string, string][] = [
  ["profile", "Perfil"],
  ["activity", "Atividade"],
  ["showcase", "Vitrine"],
  ["contributions", "Contribuições"],
  ["mural", "Mural"],
  ["muralWrite", "Quem escreve no mural"],
  ["muralReply", "Quem responde no mural"],
  ["playing", "Jogando agora"],
];
const AUD: Record<string, string> = {
  all: "Todos",
  played: "Quem jogou junto",
  friends: "Amigos",
  me: "Só a pessoa",
};
const TIMES: Record<string, string> = {
  morning: "manhã",
  afternoon: "tarde",
  evening: "noite",
  night: "madrugada",
  weekdays: "dias de semana",
  weekends: "fins de semana",
};

function Profile({ file, reload }: { file: PersonFile; reload: () => void }) {
  const u = file.user;
  const { site } = useAdminBase();
  const router = useRouter();
  const tb = useTranslations("profile.badges");
  if (!u) return null;
  const lv = levelOf(u.xp);
  const about = (u.about ?? {}) as { langs?: string[]; times?: string[] };
  const privacy = (u.privacy ?? {}) as Record<string, string | boolean>;
  const stat = (v: ReactNode, l: string) => (
    <div className="ustat">
      <b className="mono">{v}</b>
      <span>{l}</span>
    </div>
  );
  const games = Object.entries(u.perGame).filter(([g]) => isGameKey(g)) as [
    GameKey,
    number,
  ][];
  const badgeName = (b: string) => {
    const [key] = b.split(".");
    return tb.has(`names.${key}` as never) ? tb(`names.${key}` as never) : key;
  };
  const tier = (b: string) => b.split(".")[1] ?? "bronze";
  return (
    <>
      <div className="row">
        {u.handle ? (
          <a
            className="btn sm"
            href={`${site.replace(/\/$/, "")}/u/${u.handle}`}
            target="_blank"
            rel="noopener"
          >
            <ExternalLink className="i" />
            Perfil público
          </a>
        ) : null}
        <button
          type="button"
          className="btn sm"
          onClick={() => void navigator.clipboard?.writeText(u.id)}
        >
          <Copy className="i" />
          Copiar ID
        </button>
      </div>
      <div className="lvl">
        <span className="mono">Nível {lv.level}</span>
        <div className="bar">
          <i style={{ width: `${(lv.into / lv.need) * 100}%` }} />
        </div>
        <span className="mono muted">
          {lv.into}/{lv.need} XP
        </span>
      </div>
      <div className="ustats">
        {stat(u.plays, "partidas")}
        {stat(u.wins, "vitórias")}
        {stat(fmt(u.xp), "XP")}
        {stat(u.badges.length, "conquistas")}
      </div>
      <section className="cd-sec">
        <h3>Conta</h3>
        <dl className="kv">
          <dt>Papel</dt>
          <dd>
            {u.role === "admin" ? (
              <RoleChip of="admin" />
            ) : (
              <AdminSelect
                label="Papel"
                size="sm"
                value={u.role}
                onChange={async (v) => {
                  const r = await setRoleAction(u.id, v as Role);
                  if (r.ok) {
                    reload();
                    router.refresh();
                  }
                }}
                options={(["player", "curator"] as const).map((r) => {
                  const Icon = ROLE_ICON[r];
                  return {
                    value: r,
                    label: ROLE_PT[r],
                    icon: <Icon className="size-4" />,
                  };
                })}
              />
            )}
          </dd>
          <dt>Integrações</dt>
          <dd>
            <div className="links">
              {u.providers.map((l) => (
                <span key={`${l.provider}-${l.at}`} className="link">
                  {l.provider === "discord" || l.provider === "google" ? (
                    // biome-ignore lint/performance/noImgElement: tiny static brand svg
                    <img
                      className="prov"
                      src={`/icons/${l.provider}.svg`}
                      alt=""
                      width={20}
                      height={20}
                    />
                  ) : null}
                  <span>
                    <b>{l.name ?? l.provider}</b>
                    <small>
                      {l.provider}
                      {l.at
                        ? ` · desde ${new Date(l.at).toLocaleDateString("pt-BR")}`
                        : ""}
                    </small>
                  </span>
                </span>
              ))}
              {u.providers.length ? null : <span className="muted">—</span>}
            </div>
          </dd>
          <dt>Último acesso</dt>
          <dd>{u.seenAt ? ago(u.seenAt) : "—"}</dd>
          {about.langs?.length ? (
            <>
              <dt>Fala</dt>
              <dd>{about.langs.join(" · ")}</dd>
            </>
          ) : null}
          {about.times?.length ? (
            <>
              <dt>Costuma jogar</dt>
              <dd>{about.times.map((x) => TIMES[x] ?? x).join(", ")}</dd>
            </>
          ) : null}
          {u.accent ? (
            <>
              <dt>Cor de destaque</dt>
              <dd>{u.accent}</dd>
            </>
          ) : null}
          {u.theme ? (
            <>
              <dt>Tema</dt>
              <dd>{u.theme === "dark" ? "Escuro" : "Claro"}</dd>
            </>
          ) : null}
          <dt>ID</dt>
          <dd className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>
            {u.id}
          </dd>
        </dl>
      </section>
      <section className="cd-sec">
        <h3>Jogos</h3>
        {games.length ? (
          <>
            <div className="ugames">
              {games.map(([g, n]) => (
                <div key={g} className="ug">
                  <GameThumb game={g} size="tiny" />
                  <span>
                    <b>{GAME_PT[g]}</b>
                    <small>
                      {n} {n === 1 ? "partida" : "partidas"}
                    </small>
                  </span>
                  <i
                    style={{ width: `${(n / Math.max(1, u.plays)) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="note" style={{ marginTop: 8 }}>
              {u.firstAt
                ? `Primeira partida ${new Date(u.firstAt).toLocaleDateString("pt-BR")}`
                : ""}
              {u.lastAt ? ` · última ${ago(u.lastAt)}` : ""}
            </p>
          </>
        ) : (
          <div className="empty">Nenhuma partida ainda.</div>
        )}
      </section>
      <section className="cd-sec">
        <h3>Conquistas</h3>
        {u.badges.length ? (
          <div className="badges">
            {u.badges.map((b) => (
              <span
                key={`${b.badge}-${b.game}`}
                className={`badge ${tier(b.badge)}`}
              >
                <Award className="i" />
                <span>
                  <b>{badgeName(b.badge)}</b>
                  <small>
                    {tb.has(`tiers.${tier(b.badge)}` as never)
                      ? tb(`tiers.${tier(b.badge)}` as never)
                      : tier(b.badge)}
                    {b.game && isGameKey(b.game) ? ` · ${GAME_PT[b.game]}` : ""}
                  </small>
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="empty">Nenhuma ainda.</div>
        )}
      </section>
      <section className="cd-sec">
        <h3>Contribuições</h3>
        <div className="ustats sm">
          {stat(u.contrib.pics, "fotos enviadas")}
          {stat(u.contrib.chars, "personagens criados")}
          {stat(u.contrib.muralIn + u.contrib.muralOut, "recados no mural")}
          {stat(file.made, "denúncias feitas")}
        </div>
        <dl className="kv" style={{ marginTop: 12 }}>
          <dt>Na Oficina</dt>
          <dd>
            {u.contrib.suggestions}{" "}
            {u.contrib.suggestions === 1 ? "sugestão" : "sugestões"} (
            {u.contrib.live} no ar) · {u.contrib.votes} votos
          </dd>
        </dl>
      </section>
      <section className="cd-sec">
        <h3>Privacidade</h3>
        <dl className="kv priv">
          {PRIV.map(([k, l]) => (
            <span key={k} style={{ display: "contents" }}>
              <dt>{l}</dt>
              <dd>
                {k === "playing"
                  ? privacy[k] === false
                    ? "Escondido"
                    : "Visível"
                  : AUD[String(privacy[k] ?? "all")]}
              </dd>
            </span>
          ))}
        </dl>
      </section>
    </>
  );
}

const ACTIONS = [
  ["warn", "Advertir", TriangleAlert],
  ["mute", "Silenciar", VolumeX],
  ["ban", "Banir", Ban],
  ["none", "Arquivar sem ação", Check],
] as const;
const BAN_FOR = [
  ["1d", "24 horas"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["ever", "Para sempre"],
] as const;
const MUTE_FOR = [
  ["1h", "1 hora"],
  ["1d", "24 horas"],
  ["7d", "7 dias"],
] as const;

function Moderation({
  file,
  reload,
}: {
  file: PersonFile;
  reload: () => void;
}) {
  const router = useRouter();
  const p = file.person;
  const open = file.reports.filter((r) => r.open).length;
  const [kind, setKind] = useState<(typeof ACTIONS)[number][0]>(
    open ? "warn" : "warn",
  );
  const [banFor, setBanFor] = useState<string>("7d");
  const [muteFor, setMuteFor] = useState<string>("1d");
  const [wipe, setWipe] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const names = new Map(file.names.map((x) => [x.id, x]));
  const { open: openPerson } = usePersonDrawer();
  const active = file.standing.active;
  const last = file.standing.last;
  const actions = ACTIONS.filter(([k]) => k !== "none" || open);
  const apply = async () => {
    setBusy(true);
    setMsg(null);
    const r = await sanctionAction({
      person: p.id,
      kind,
      length: kind === "ban" ? banFor : kind === "mute" ? muteFor : undefined,
      reason: text,
      wipe,
    });
    setBusy(false);
    if (!r.ok)
      return setMsg(
        r.error === "invalid_input"
          ? "Escreva o motivo."
          : "Não deu para aplicar.",
      );
    setText("");
    setWipe(false);
    reload();
    router.refresh();
  };
  const ActIcon = ACTIONS.find((a) => a[0] === kind)?.[2] ?? Check;
  return (
    <>
      {active ? (
        <div className="sanction">
          <SanctionChip s={active} />
          <span>{active.reason ?? ""}</span>
          <span className="spacer" />
          <button
            type="button"
            className="btn sm"
            onClick={async () => {
              await liftAction(active.id, p.id);
              reload();
              router.refresh();
            }}
          >
            <RotateCcw className="i" />
            {active.kind === "ban" ? "Desbanir" : "Tirar silêncio"}
          </button>
        </div>
      ) : last && last.kind === "none" ? (
        <div className="sanction">
          <SanctionChip s={last} />
          <span>{last.reason ?? ""}</span>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>
            {ago(last.at)}
          </span>
        </div>
      ) : null}
      <section className="cd-sec rep-actions">
        <h3>O que fazer</h3>
        <fieldset className="seg" aria-label="Ação">
          {actions.map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              <Icon className="i" />
              {l}
            </button>
          ))}
        </fieldset>
        {kind === "ban" ? (
          <>
            <div className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                Por
              </span>
              <fieldset className="seg sm" aria-label="Por quanto tempo">
                {BAN_FOR.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={banFor === v}
                    onClick={() => setBanFor(v)}
                  >
                    {l}
                  </button>
                ))}
              </fieldset>
            </div>
            <span
              className="row"
              style={{ gap: 8, fontSize: 13.5, fontWeight: 600 }}
            >
              <Switch
                checked={wipe}
                onCheckedChange={setWipe}
                aria-label="Apagar o que a pessoa mandou"
              />
              Apagar também recados, fotos e apelidos que a pessoa mandou
            </span>
            <p className="note">
              Não entra em salas, não escreve, não vota, não sugere.
            </p>
          </>
        ) : null}
        {kind === "mute" ? (
          <>
            <div className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                Por
              </span>
              <fieldset className="seg sm" aria-label="Por quanto tempo">
                {MUTE_FOR.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={muteFor === v}
                    onClick={() => setMuteFor(v)}
                  >
                    {l}
                  </button>
                ))}
              </fieldset>
            </div>
            <p className="note">
              Não escreve no chat das salas nem em murais; joga normalmente.
            </p>
          </>
        ) : null}
        <label className="fld">
          {kind === "none"
            ? "Nota interna"
            : kind === "warn"
              ? "Mensagem que a pessoa vê ao entrar"
              : "Motivo, que a pessoa vê"}
          <textarea
            className="ta"
            rows={2}
            maxLength={300}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {!p.account && kind !== "none" ? (
          <p className="note">
            Sem conta, vale para o navegador em que a pessoa jogou.
          </p>
        ) : null}
        {msg ? (
          <p className="note" style={{ color: "var(--no)" }}>
            {msg}
          </p>
        ) : null}
        <div className="row">
          <button
            type="button"
            className={
              kind === "ban"
                ? "btn no"
                : kind === "none"
                  ? "btn"
                  : "btn primary"
            }
            disabled={busy}
            onClick={apply}
          >
            <ActIcon className="i" />
            {
              {
                warn: "Enviar advertência",
                mute: "Silenciar",
                ban: "Banir",
                none: "Arquivar",
              }[kind]
            }
          </button>
        </div>
      </section>
      <header className="row">
        <h3>Denúncias</h3>
        {file.reports.length ? (
          <span className="chip">
            {file.reports.length}
            {open ? ` · ${open} ${open === 1 ? "aberta" : "abertas"}` : ""}
          </span>
        ) : null}
      </header>
      {file.reports.length ? (
        file.reports.map((r) => (
          <ReportItem
            key={r.id}
            r={r}
            target={p}
            by={names.get(r.reporterId)}
            onOpen={(id) => openPerson(id)}
          />
        ))
      ) : (
        <div className="empty">Nenhuma denúncia.</div>
      )}
      {file.sanctions.length ? (
        <>
          <h3>Histórico</h3>
          <ol className="clist">
            {file.sanctions.map((s) => (
              <li key={s.id} className="markrow" style={{ cursor: "default" }}>
                <span>
                  <SanctionChip s={s} />
                  <small>
                    {new Date(s.at).toLocaleString("pt-BR")}
                    {s.kind === "ban" || s.kind === "mute"
                      ? ` · ${untilText(s)}`
                      : ""}
                    {s.liftedAt ? " · desfeita" : ""}
                    {s.kind === "warn"
                      ? s.seenAt
                        ? " · lida"
                        : " · ainda não lida"
                      : ""}
                    {s.reason ? ` · “${s.reason}”` : ""}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </>
  );
}

function ReportItem({
  r,
  target,
  by,
  onOpen,
}: {
  r: AdminReport & { open: boolean };
  target: PersonRef;
  by: PersonRef | undefined;
  onOpen: (id: string) => void;
}) {
  return (
    <section className={r.open ? "rep" : "rep done"}>
      <header className="row">
        <span className="row" style={{ gap: 8 }}>
          <KindChip kind={r.kind} />
          {r.reason ? <ReasonChip reason={r.reason} /> : null}
          {r.room ? <span className="chip mono">{r.room}</span> : null}
        </span>
        <span className="spacer" />
        <span className="mono muted" style={{ fontSize: 12 }}>
          {new Date(r.at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </header>
      <div className="row" style={{ gap: 8, fontSize: 13 }}>
        <span className="muted">Denunciado por</span>
        {by ? <PersonChip p={by} size={24} onOpen={onOpen} /> : "—"}
      </div>
      {r.kind === "room" ? (
        <>
          {r.note ? <p className="rep-note">“{r.note}”</p> : null}
          <div className="chatlog">
            <div className="cl-h">
              <MessageSquare className="i" />O que {nameOf(target)} escreveu na
              sala
            </div>
            {r.lines?.length ? (
              r.lines.map((l, i) => (
                <div key={`${l.at}-${i.toString()}`} className="cl">
                  <span className="mono">
                    {l.at
                      ? new Date(l.at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                  <p>{l.text}</p>
                </div>
              ))
            ) : (
              <div className="cl">
                <p className="muted">Nada escrito no chat.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rep-obj">
          {r.img ? (
            // biome-ignore lint/performance/noImgElement: a reported picture, as sent
            <img alt="" src={r.img} />
          ) : null}
          <span>
            <b>{r.text}</b>
            <small>
              {r.where ? `${r.where} · ` : ""}
              {r.count ?? 1} {(r.count ?? 1) === 1 ? "denúncia" : "denúncias"}
              {r.hidden ? " · escondido para todos" : ""}
            </small>
          </span>
        </div>
      )}
    </section>
  );
}
