"use client";

import {
  ClipboardCheck,
  Radio,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Flag } from "@/components/ui/language-switch";
import { GameThumb } from "@/features/create/game-info";
import {
  MissionObject,
  QuestionObject,
  ThemeObject,
} from "@/features/workshop/objects";
import type { GameKey } from "@/game/games";
import { LANGS, type Lang } from "@/game/types";
import { decideAction, suggestionAction } from "@/server/admin/actions";
import type { SuggestionFile } from "@/server/admin/workshop";
import type { Translations } from "@/server/community-contract";
import { PersonChip } from "../people/bits";
import { usePersonDrawer } from "../people/person-drawer";
import { KindChip, StateChip } from "./chips";

/** One suggestion: its preview, votes with their weights, four languages and the decision. */
export function SuggestionDrawer({
  id,
  names,
  onClose,
}: {
  id: string;
  names: Record<GameKey, string>;
  onClose: () => void;
}) {
  const router = useRouter();
  const tTones = useTranslations("workshop.tones");
  const { open: openPerson } = usePersonDrawer();
  const [file, setFile] = useState<SuggestionFile | null>(null);
  const [tr, setTr] = useState<Translations>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await suggestionAction(id);
    if (r.ok && r.data) {
      setFile(r.data);
      setTr(r.data.suggestion.translations);
    } else setMsg("Não deu para abrir.");
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [onClose]);
  const s = file?.suggestion;
  const keys = file ? Object.keys(file.pieces) : [];
  const textIn = (l: Lang, k: string) =>
    s && l === s.lang ? (file?.pieces[k] ?? "") : (tr[l]?.[k] ?? "");
  const done = LANGS.filter((l) =>
    keys.every((k) => textIn(l, k).trim()),
  ).length;
  const decide = async (to: "live" | "review" | "refused" | "voting") => {
    setBusy(true);
    setMsg(null);
    const r = await decideAction(id, to, { translations: tr, reason });
    setBusy(false);
    if (!r.ok)
      return setMsg(
        r.error === "invalid_input"
          ? to === "refused"
            ? "Escreva o motivo."
            : "Faltam idiomas."
          : "Não deu.",
      );
    await load();
    router.refresh();
  };
  const wand = async () => {
    if (!s || !file) return;
    setBusy(true);
    const res = await fetch(`/api/workshop/translate?lang=${s.lang}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: s.kind, pieces: file.pieces }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg("A varinha não respondeu.");
    const out = (await res.json()) as { translations: Translations };
    setTr((all) => {
      const next = { ...all };
      for (const l of LANGS) {
        if (l === s.lang) continue;
        const got = out.translations[l] ?? {};
        next[l] = {
          ...got,
          ...Object.fromEntries(
            Object.entries(all[l] ?? {}).filter(([, v]) => v.trim()),
          ),
        };
      }
      return next;
    });
  };
  const people = new Map(file?.people.map((p) => [p.id, p]) ?? []);
  const yesW =
    file?.votes.filter((v) => v.yes).reduce((n, v) => n + v.weight, 0) ?? 0;
  const noW =
    file?.votes.filter((v) => !v.yes).reduce((n, v) => n + v.weight, 0) ?? 0;
  const author = s?.createdBy ? people.get(s.createdBy) : null;
  const d = s?.draft;
  return (
    <>
      <button
        type="button"
        className="scrim"
        aria-label="Fechar"
        style={{ border: 0 }}
        onClick={onClose}
      />
      <aside className="drawer wide" aria-label="Sugestão">
        {!s || !file || !d ? (
          <div className="empty">{msg ?? "Carregando…"}</div>
        ) : (
          <>
            <div className="dh">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <KindChip kind={s.kind} />
                  <StateChip status={s.status} />
                  <Flag lang={s.lang} className="size-[18px]" />
                </div>
                <h2 style={{ fontSize: 24 }}>
                  {file.pieces.name ?? file.pieces.text}
                </h2>
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
            <div style={{ maxWidth: 360 }}>
              {d.kind === "theme" ? (
                <ThemeObject
                  name={d.theme.name}
                  set={d.theme.set}
                  starters={file.starters}
                />
              ) : d.kind === "question" ? (
                <QuestionObject question={{ ...d.question, themeName: null }} />
              ) : (
                <MissionObject mission={d.mission} />
              )}
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              {author ? (
                <PersonChip
                  p={author}
                  size={32}
                  onOpen={(pid) => openPerson(pid)}
                />
              ) : (
                <span />
              )}
              <span className="muted" style={{ fontSize: 13 }}>
                {file.authorLive} no ar · enviada{" "}
                {new Date(s.createdAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <dl className="kv">
              <dt>Jogos</dt>
              <dd>
                <span className="row" style={{ gap: 6 }}>
                  {(d.kind === "theme"
                    ? (d.theme.games as GameKey[])
                    : d.kind === "question"
                      ? (["impostor"] as const)
                      : (["lineup"] as const)
                  ).map((g) => (
                    <span key={g} className="gchip">
                      <GameThumb game={g} size="tiny" />
                      {names[g]}
                    </span>
                  ))}
                </span>
              </dd>
              {d.kind === "theme" ? (
                <>
                  <dt>Conjunto</dt>
                  <dd>{d.theme.set}</dd>
                </>
              ) : d.kind === "question" ? (
                <>
                  <dt>Resposta</dt>
                  <dd>
                    {d.question.kind} · picância {d.question.spice} de 3
                  </dd>
                </>
              ) : (
                <>
                  <dt>Clima</dt>
                  <dd>
                    {tTones(d.mission.tone)}
                    {d.mission.heavy ? " · pesada" : ""}
                  </dd>
                </>
              )}
              {s.decidedAt ? (
                <>
                  <dt>Decisão</dt>
                  <dd>
                    {new Date(s.decidedAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {s.reason ? ` · “${s.reason}”` : ""}
                  </dd>
                </>
              ) : null}
            </dl>
            <section className="cd-sec">
              <header className="row">
                <h3>Votos</h3>
                <span className="chip">
                  {s.yes} querem · {s.no} não cabe
                </span>
                <span className="spacer" />
                <span className="mono" style={{ fontSize: 13 }}>
                  prioridade <b>{String(file.priority).replace(".", ",")}</b>
                </span>
              </header>
              <div className="wbar">
                <i style={{ flex: yesW || 0.001, background: "var(--yes)" }} />
                <i style={{ flex: noW || 0.001, background: "var(--no)" }} />
              </div>
              <p className="note" style={{ margin: "6px 0 10px" }}>
                Com peso: {String(Math.round(yesW * 10) / 10).replace(".", ",")}{" "}
                a favor, {String(Math.round(noW * 10) / 10).replace(".", ",")}{" "}
                contra.
              </p>
              {file.votes.length ? (
                <ol className="voters">
                  {file.votes.map((v) => {
                    const p = people.get(v.user);
                    return (
                      <li key={v.user}>
                        {p ? (
                          <PersonChip
                            p={p}
                            size={26}
                            onOpen={(pid) => openPerson(pid)}
                          />
                        ) : (
                          v.user
                        )}
                        <span className="mono muted">nv {v.level}</span>
                        <span className="mono">
                          ×{v.weight.toFixed(2).replace(".", ",")}
                        </span>
                        <span className={v.yes ? "vote yes" : "vote no"}>
                          {v.yes ? (
                            <ThumbsUp className="i" />
                          ) : (
                            <ThumbsDown className="i" />
                          )}
                          {v.yes ? "Quero jogar" : "Não cabe"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="empty">Nenhum voto ainda.</div>
              )}
            </section>
            <section className="cd-sec">
              <header className="row">
                <h3>Idiomas</h3>
                <span className={done === 4 ? "chip yes" : "chip"}>
                  {done} de 4
                </span>
                <span className="spacer" />
                <button
                  type="button"
                  className="btn sm"
                  disabled={busy}
                  onClick={wand}
                >
                  <Wand2 className="i" />
                  Traduzir com a varinha
                </button>
              </header>
              <div className="tr-grid">
                {LANGS.map((l) => (
                  <div key={l} className="tr-row">
                    <span className="lg">
                      <Flag lang={l} className="size-[18px]" />
                      {l}
                    </span>
                    <span className="stack" style={{ gap: 4 }}>
                      {keys.map((k) => {
                        const v = textIn(l, k);
                        return (
                          <input
                            key={k}
                            value={v}
                            readOnly={l === s.lang}
                            className={v.trim() ? "" : "empty"}
                            placeholder={
                              l === s.lang ? "" : "Falta este idioma"
                            }
                            aria-label={`${l}: ${file.pieces[k]}`}
                            onChange={(e) =>
                              setTr((all) => ({
                                ...all,
                                [l]: { ...(all[l] ?? {}), [k]: e.target.value },
                              }))
                            }
                          />
                        );
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            {msg ? (
              <p className="note" style={{ color: "var(--no)" }}>
                {msg}
              </p>
            ) : null}
            {s.status === "voting" || s.status === "review" ? (
              <section className="cd-sec wk-decide">
                <h3>Decisão</h3>
                <label className="fld">
                  Por quê{" "}
                  <span className="muted">
                    (aparece para o autor se ficar de fora)
                  </span>
                  <textarea
                    className="ta"
                    rows={2}
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <div className="row">
                  <button
                    type="button"
                    className="btn yes"
                    disabled={busy || done < 4}
                    onClick={() => decide("live")}
                  >
                    <Radio className="i" />
                    Pôr no ar
                  </button>
                  {s.status === "voting" ? (
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => decide("review")}
                    >
                      <ClipboardCheck className="i" />
                      Marcar em verificação
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn no"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => decide("refused")}
                  >
                    <X className="i" />
                    Deixar de fora
                  </button>
                </div>
              </section>
            ) : (
              <div className="row">
                <button
                  type="button"
                  className="btn sm ghost"
                  disabled={busy}
                  onClick={() => decide("voting")}
                >
                  <RotateCcw className="i" />
                  {s.status === "live"
                    ? "Tirar do ar e voltar à votação"
                    : "Reabrir votação"}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
