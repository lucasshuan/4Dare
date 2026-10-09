"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  Link2,
  Lock,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { ImageDrop } from "@/components/ui/image-drop";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { PlayerName, useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import type { ErrorCode, Lang } from "@/game/types";
import { LANGS } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { CHARACTERS, characterPath } from "@/lib/routes";
import type { CharacterSheet, SheetAlias } from "@/server/community-contract";
import type { Result } from "@/server/contract";
import {
  editNickname,
  giveNickname,
  removeNickname,
  reportNicknameAction,
  restoreNickname,
} from "@/server/library-actions";
import type { TrayPicture } from "@/server/pictures";
import { tasteEmoji, useTasteName } from "./taste";
import {
  useAliasHistory,
  usePictures,
  useRefreshCharacter,
  useSheet,
} from "./use-library";

/** Runs a library action; a refusal shows as a toast unless `quiet` says the caller tells it. */
function useLibraryAction() {
  const t = useTranslations("common.errors");
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const run = async <T,>(
    action: () => Promise<Result<T>>,
    quiet: ErrorCode[] = [],
  ): Promise<Result<T>> => {
    setPending(true);
    try {
      const r = await action();
      if (!r.ok && !quiet.includes(r.error)) toast(t(r.error));
      return r;
    } catch {
      toast(t("unknown"));
      return { ok: false, error: "unknown" };
    } finally {
      setPending(false);
    }
  };
  return { run, pending };
}

/**
 * A character's sheet: its picture and numbers, the pictures people sent
 * (and a way to send one), its names and nicknames (players' can be fixed,
 * taken out and reported, with the history of it all), and the themes it
 * starts. Over the list as a side panel, or as a page of its own.
 */
export function CharacterSheetBody({
  id,
  mode,
  close,
}: {
  id: string;
  mode: "panel" | "page";
  /** The panel's close button. */
  close?: ReactNode;
}) {
  const t = useTranslations("library.sheet");
  const { data: sheet, isError } = useSheet(id);
  if (isError)
    return (
      <div className="grid justify-items-start gap-3 p-6">
        {close}
        <b className="font-bold font-display text-[20px]">{t("notFound")}</b>
        <Link
          href={CHARACTERS}
          className="font-semibold text-sky underline underline-offset-[3px]"
        >
          {t("back")}
        </Link>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Head id={id} mode={mode} close={close} />
      <div
        className={cn(
          "grid flex-1 content-start gap-[26px] pb-7",
          mode === "panel"
            ? "overflow-y-auto overscroll-contain px-4 pt-1 sm:px-6"
            : "pt-2",
        )}
      >
        {sheet ? <Loaded sheet={sheet} /> : <Placeholder />}
      </div>
    </div>
  );
}

function Head({
  id,
  mode,
  close,
}: {
  id: string;
  mode: "panel" | "page";
  close?: ReactNode;
}) {
  const t = useTranslations("library.sheet");
  const toast = useToast();
  const locale = useLocale();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${locale}${characterPath(id)}`,
      );
      toast(t("copied"));
    } catch {
      // the browser refused the clipboard
    }
  };
  const icon =
    "flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken text-ink transition-transform duration-150 active:scale-[0.92]";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5",
        mode === "panel" ? "px-3.5 pt-3.5 pb-2.5" : "pb-3",
      )}
    >
      {mode === "panel" ? (
        close
      ) : (
        <Link href={CHARACTERS} aria-label={t("back")} className={icon}>
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-muted">
        {characterPath(id)}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={t("share")}
        title={t("share")}
        className={icon}
      >
        <Link2 className="size-[18px]" strokeWidth={1.75} />
      </button>
      {mode === "panel" ? (
        <a
          href={`/${locale}${characterPath(id)}`}
          aria-label={t("openPage")}
          title={t("openPage")}
          className={icon}
        >
          <ExternalLink className="size-[18px]" strokeWidth={1.75} />
        </a>
      ) : null}
    </div>
  );
}

function Placeholder() {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-5">
      <span className="aspect-[4/5] animate-pulse rounded-[24px] bg-sunken" />
      <span className="grid content-start gap-2 pt-1">
        <span className="h-3 w-20 animate-pulse rounded-pill bg-sunken" />
        <span className="h-8 w-3/4 animate-pulse rounded-pill bg-sunken" />
        <span className="h-4 w-1/2 animate-pulse rounded-pill bg-sunken" />
      </span>
    </div>
  );
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: ease.soft, delay: 0.04 + i * 0.05 },
});

function Loaded({ sheet }: { sheet: CharacterSheet }) {
  const id = sheet.card.id;
  const pictures = usePictures(id);
  const [picked, setPicked] = useState<string | null>(null);
  const list = pictures.data ?? [];
  const shown = list.find((p) => p.id === picked) ?? list[0] ?? null;
  return (
    <>
      <Hero sheet={sheet} picture={shown?.url ?? sheet.card.imageUrl} />
      <m.div {...rise(1)}>
        <Pictures
          sheet={sheet}
          pictures={list}
          shown={shown}
          onPick={setPicked}
        />
      </m.div>
      <m.div {...rise(2)}>
        <Nicknames sheet={sheet} />
      </m.div>
      <m.div {...rise(3)}>
        <Themes sheet={sheet} />
      </m.div>
    </>
  );
}

function Hero({
  sheet,
  picture,
}: {
  sheet: CharacterSheet;
  picture: string | null;
}) {
  const t = useTranslations("library.sheet");
  const format = useFormatter();
  const withNames = useWithNames();
  const tasteName = useTasteName();
  const { card } = sheet;
  const by = card.by;
  return (
    <section className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-5">
      <m.span
        initial={{ opacity: 0, scale: 0.96, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: ease.soft }}
        className="block overflow-hidden rounded-[24px] shadow-card"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={picture ?? "none"}
            initial={{ opacity: 0.2, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.36, ease: ease.soft }}
            className="block"
          >
            <Portrait src={picture} className="rounded-none" />
          </m.span>
        </AnimatePresence>
      </m.span>
      <div className="grid min-w-0 gap-1.5 pt-1">
        {card.taste ? (
          <span className="font-semibold text-[12px] text-ink-muted uppercase tracking-[0.08em]">
            {tasteEmoji(card.taste)} {tasteName(card.taste)}
          </span>
        ) : null}
        <h2 className="font-display font-extrabold text-[24px] leading-[1.05] tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-[30px]">
          {card.name}
        </h2>
        {card.origin ? <p className="text-ink-muted">{card.origin}</p> : null}
        <dl className="mt-2 grid grid-cols-[repeat(3,auto)] justify-start gap-x-[18px] gap-y-1">
          {(
            [
              [t("picked"), t("times", { n: format.number(sheet.picks) })],
              [t("themes"), format.number(sheet.themes.length)],
              [
                t("names"),
                format.number(sheet.names.length + sheet.aliases.length),
              ],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold text-[12px] text-ink-muted">
                {label}
              </dt>
              <dd className="font-bold font-display text-[19px] tabular-nums leading-tight">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-muted">
          {by ? (
            <span>
              {withNames((n) => t("by", { name: n(by) }))}
              {sheet.createdAt
                ? ` · ${format.dateTime(sheet.createdAt, { dateStyle: "medium" })}`
                : ""}
            </span>
          ) : (
            <>
              <Lock className="size-3.5" strokeWidth={2} />
              {t("library")}
              {sheet.unreviewed ? `, ${t("unreviewed")}` : ""}
              <span className="font-mono text-[12px]">· {sheet.baseId}</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function SectionHead({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-bold font-display text-[17px] leading-tight">
        {title}
        {count !== undefined ? (
          <span className="rounded-pill bg-sunken px-[7px] py-[3px] font-medium font-mono text-[12px] text-ink-muted">
            {count}
          </span>
        ) : null}
      </h3>
      {children}
    </div>
  );
}

const linkButton =
  "font-semibold text-[14px] text-sky underline decoration-1 underline-offset-[3px] disabled:opacity-50";

function Pictures({
  sheet,
  pictures,
  shown,
  onPick,
}: {
  sheet: CharacterSheet;
  pictures: TrayPicture[];
  shown: TrayPicture | null;
  onPick: (id: string) => void;
}) {
  const t = useTranslations("library.sheet");
  const tErrors = useTranslations("common.errors");
  const lang = useLocale();
  const toast = useToast();
  const refresh = useRefreshCharacter();
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = sheet.card.id;
  const report = async () => {
    if (!shown) return;
    const res = await fetch(`/api/pictures/${shown.id}/report`, {
      method: "POST",
    }).catch(() => null);
    toast(res?.ok ? t("reported") : tErrors("unknown"));
    if (res?.ok) refresh(id);
  };
  const send = async (blob: Blob) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("image", blob, "picture.webp");
      const res = await fetch(
        `/api/characters/${encodeURIComponent(id)}/pictures?lang=${lang}`,
        { method: "POST", body: form },
      ).catch(() => null);
      if (!res?.ok) {
        const code = res
          ? (((await res.json().catch(() => ({}))) as { error?: ErrorCode })
              .error ?? "unknown")
          : "unknown";
        toast(tErrors(code));
        return;
      }
      const { picture } = (await res.json()) as { picture: TrayPicture };
      toast(picture.pending ? t("sent") : t("sentLive"));
      setSending(false);
      onPick(picture.id);
      refresh(id);
    } finally {
      setBusy(false);
    }
  };
  const canReport = shown && shown.author && !shown.mine;
  return (
    <section className="grid gap-3">
      <SectionHead title={t("pictures")} count={pictures.length}>
        {canReport ? (
          <button type="button" onClick={report} className={linkButton}>
            {t("reportPicture")}
          </button>
        ) : null}
      </SectionHead>
      <div className="-mx-0.5 flex gap-2.5 overflow-x-auto px-0.5 pt-1 pb-1.5">
        {pictures.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={t("picture", { n: i + 1, total: pictures.length })}
            aria-pressed={shown?.id === p.id}
            onClick={() => onPick(p.id)}
            className="group/thumb relative grid w-[76px] shrink-0 gap-[5px] text-left text-[11.5px] text-ink-muted"
          >
            <span
              className={cn(
                "block overflow-hidden rounded-[14px] outline-2 outline-offset-2 transition-[outline-color,translate] duration-150 group-hover/thumb:-translate-y-0.5",
                shown?.id === p.id ? "outline-sky" : "outline-transparent",
              )}
            >
              <Portrait src={p.url} className="rounded-none" />
            </span>
            {p.pending ? (
              <em className="absolute inset-x-1 top-1 rounded-pill bg-ink px-1 py-0.5 text-center font-bold text-[10px] text-on-ink not-italic">
                {t("checking")}
              </em>
            ) : null}
            <span className="truncate">
              {p.author ? (
                <PlayerName player={p.author} />
              ) : (
                t("libraryPicture")
              )}
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-expanded={sending}
          onClick={() => setSending((v) => !v)}
          className={cn(
            "grid aspect-[4/5] w-[76px] shrink-0 place-content-center justify-items-center gap-1 rounded-[14px] border-[1.5px] border-dashed font-semibold text-[11.5px] transition-colors duration-150",
            sending
              ? "border-sky bg-sky-soft text-ink"
              : "border-line-strong text-ink-muted hover:bg-sunken",
          )}
        >
          <Upload className="size-5" strokeWidth={1.75} />
          {t("send")}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {sending ? (
          <m.div
            key="send"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: ease.soft }}
            className="overflow-hidden"
          >
            <div className="grid gap-2 rounded-[18px] bg-sunken p-3">
              <b className="text-[14px]">{t("sendTitle")}</b>
              <ImageDrop onDone={send} busy={busy} />
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
      <p className="text-[13px] text-ink-muted">
        {pictures.length ? t("picturesHint") : t("noPictureHint")}
      </p>
    </section>
  );
}

function Nicknames({ sheet }: { sheet: CharacterSheet }) {
  const t = useTranslations("library.sheet");
  const locale = useLocale() as Lang;
  const { me } = useMe();
  const toast = useToast();
  const refresh = useRefreshCharacter();
  const { run, pending } = useLibraryAction();
  const [text, setText] = useState("");
  const [lang, setLang] = useState<Lang>(locale);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [history, setHistory] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const id = sheet.card.id;
  const account = !!me && !me.isGuest;
  const langNames = new Intl.DisplayNames([locale], { type: "language" });
  // the library's own: its names in the other languages and the reader's aliases, once each
  const seenNames = new Set([sheet.card.name.toLowerCase()]);
  const locked: { lang: Lang; name: string }[] = [];
  for (const n of [
    ...sheet.names.map((x) => ({ lang: x.lang, name: x.name })),
    ...(sheet.names.find((x) => x.lang === locale)?.aliases ?? []).map(
      (name) => ({ lang: locale, name }),
    ),
  ]) {
    const key = n.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    locked.push(n);
  }

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const name = text.replace(/\s+/g, " ").trim();
    if (name.length < 2) return setError(t("tooShort"));
    const r = await run(() => giveNickname(id, lang, name), ["conflict"]);
    if (!r.ok) {
      if (r.error === "conflict") setError(t("already", { name }));
      return;
    }
    setError("");
    setText("");
    setFlash(r.data);
    toast(t("added", { name }));
    refresh(id);
  };
  const remove = async (a: SheetAlias) => {
    const r = await run(() => removeNickname(a.id));
    if (!r.ok) return;
    refresh(id);
    toast(t("removed", { name: a.name }), {
      action: {
        label: t("undo"),
        run: () =>
          void run(() => restoreNickname(a.id)).then((u) => {
            if (u.ok) {
              setFlash(a.id);
              refresh(id);
            }
          }),
      },
    });
  };
  const report = async (a: SheetAlias) => {
    const r = await run(() => reportNicknameAction(a.id));
    if (!r.ok) return;
    toast(t("reportedAlias"));
    refresh(id);
  };

  return (
    <section className="grid gap-3">
      <SectionHead
        title={t("aliases")}
        count={locked.length + sheet.aliases.length}
      >
        <button
          type="button"
          aria-expanded={history}
          onClick={() => setHistory((v) => !v)}
          className={linkButton}
        >
          {t("history")}
        </button>
      </SectionHead>
      <LayoutMotion>
        <ul className="flex flex-wrap gap-2">
          {locked.map((n) => (
            <li
              key={`${n.lang}-${n.name}`}
              className="inline-flex min-h-[38px] max-w-full items-center gap-2 rounded-pill bg-sunken px-1.5 py-1"
            >
              <LangCode lang={n.lang} on="surface" />
              <span className="font-semibold text-[14px] [overflow-wrap:anywhere]">
                {n.name}
              </span>
              <span title={t("locked")} className="pr-1.5 text-ink-muted">
                <Lock className="size-3.5" strokeWidth={2} />
                <span className="sr-only">{t("locked")}</span>
              </span>
            </li>
          ))}
          <AnimatePresence initial={false}>
            {sheet.aliases.map((a) =>
              editing === a.id ? (
                <EditAlias
                  key={a.id}
                  alias={a}
                  onDone={async (name) => {
                    if (name === a.name) return setEditing(null);
                    const r = await run(
                      () => editNickname(a.id, name),
                      ["conflict"],
                    );
                    if (!r.ok) {
                      if (r.error === "conflict")
                        setError(t("already", { name }));
                      return;
                    }
                    setEditing(null);
                    setFlash(a.id);
                    toast(t("renamed", { old: a.name, name }));
                    refresh(id);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <AliasChip
                  key={a.id}
                  alias={a}
                  flash={flash === a.id}
                  canChange={account}
                  onEdit={() => setEditing(a.id)}
                  onRemove={() => remove(a)}
                  onReport={() => report(a)}
                />
              ),
            )}
          </AnimatePresence>
        </ul>
      </LayoutMotion>
      <AnimatePresence initial={false}>
        {history ? <History key="history" id={id} /> : null}
      </AnimatePresence>
      {account ? (
        <form
          noValidate
          onSubmit={add}
          className="flex flex-wrap items-center gap-2"
        >
          <label className="flex h-11 min-w-0 flex-[1_1_180px] items-center rounded-[16px] border border-line-strong bg-surface px-3.5 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
            <span className="sr-only">{t("newAlias")}</span>
            <input
              value={text}
              maxLength={40}
              onChange={(e) => {
                setText(e.target.value);
                setError("");
              }}
              placeholder={t("newAlias")}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
            />
          </label>
          <Segmented
            label={t("aliasLang")}
            size="sm"
            options={LANGS}
            value={lang}
            onChange={setLang}
            render={(l) => l.toUpperCase()}
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center rounded-pill bg-ink px-3.5 font-semibold text-[14px] text-on-ink shadow-[0_3px_0_color-mix(in_oklch,var(--ink),black_38%)] transition-[translate,box-shadow] duration-150 active:translate-y-[3px] active:shadow-none disabled:opacity-45"
          >
            {t("add")}
          </button>
        </form>
      ) : (
        <p className="font-semibold text-[13px] text-ink-muted">
          {t("signIn")}
        </p>
      )}
      <AnimatePresence>
        {error ? (
          <m.p
            key={error}
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-semibold text-[13px] text-no"
          >
            {error}
          </m.p>
        ) : null}
      </AnimatePresence>
      {sheet.missing.length ? (
        <p className="rounded-[14px] bg-apricot-soft px-3 py-2.5 text-[13px] leading-[1.4]">
          {t("missingName", {
            langs: sheet.missing.map((l) => langNames.of(l) ?? l).join(", "),
          })}
        </p>
      ) : null}
      <p className="flex gap-1.5 text-[13px] text-ink-muted leading-[1.45]">
        <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
        {t("aliasesHint")}
      </p>
    </section>
  );
}

function LangCode({ lang, on }: { lang: Lang; on: "surface" | "sunken" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-pill px-1.5 py-[3px] font-medium font-mono text-[10.5px] text-ink-muted uppercase",
        on === "surface" ? "bg-surface" : "bg-sunken",
      )}
    >
      {lang}
    </span>
  );
}

const miniButton =
  "flex size-7 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink";

function AliasChip({
  alias,
  flash,
  canChange,
  onEdit,
  onRemove,
  onReport,
}: {
  alias: SheetAlias;
  flash: boolean;
  canChange: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onReport: () => void;
}) {
  const t = useTranslations("library.sheet");
  const withNames = useWithNames();
  const who = alias.editedBy ?? alias.by;
  return (
    <m.li
      layout
      initial={{ opacity: 0, scale: 0.86, y: 6 }}
      animate={
        flash
          ? {
              opacity: 1,
              scale: 1,
              y: 0,
              boxShadow: [
                "0 0 0 0 color-mix(in oklch, var(--sky) 55%, transparent)",
                "0 0 0 10px transparent",
              ],
            }
          : { opacity: 1, scale: 1, y: 0 }
      }
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.16 } }}
      transition={{ duration: 0.42, ease: ease.soft }}
      className={cn(
        "inline-flex min-h-[38px] max-w-full items-center gap-2 rounded-pill border border-line bg-surface py-1 pl-1.5",
        alias.hidden && "opacity-60",
      )}
    >
      <LangCode lang={alias.lang} on="sunken" />
      <span className="font-semibold text-[14px] [overflow-wrap:anywhere]">
        {alias.name}
      </span>
      <span
        className={cn(
          "inline-flex items-center pr-1 text-[12px]",
          alias.mine && !alias.editedBy
            ? "font-semibold text-sky"
            : "text-ink-muted",
        )}
      >
        {alias.hidden ? (
          t("hidden")
        ) : who ? (
          alias.editedBy ? (
            withNames((n) => t("editedBy", { name: n(who) }))
          ) : (
            <PlayerName player={who} />
          )
        ) : null}
      </span>
      {canChange ? (
        <span className="-ml-1 flex pr-1">
          <button
            type="button"
            aria-label={t("edit", { name: alias.name })}
            title={t("edit", { name: alias.name })}
            onClick={onEdit}
            className={miniButton}
          >
            <Pencil className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={t("remove", { name: alias.name })}
            title={t("remove", { name: alias.name })}
            onClick={onRemove}
            className={miniButton}
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
          {alias.mine ? null : (
            <button
              type="button"
              aria-label={t("report", { name: alias.name })}
              title={t("report", { name: alias.name })}
              onClick={onReport}
              className={cn(miniButton, "text-[13px] leading-none")}
            >
              <span aria-hidden="true">⚑</span>
            </button>
          )}
        </span>
      ) : (
        <span className="pr-1.5" />
      )}
    </m.li>
  );
}

function EditAlias({
  alias,
  onDone,
  onCancel,
}: {
  alias: SheetAlias;
  onDone: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("library.sheet");
  const [value, setValue] = useState(alias.name);
  return (
    <m.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-flex min-h-[38px] items-center gap-1 rounded-pill border border-sky bg-surface py-1 pl-1.5"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.replace(/\s+/g, " ").trim();
          if (v.length >= 2) onDone(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        className="flex items-center gap-1"
      >
        <LangCode lang={alias.lang} on="sunken" />
        <input
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t("edit", { name: alias.name })}
          // biome-ignore lint/a11y/noAutofocus: the pencil asked to type here
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          className="h-[30px] w-[15ch] border-sky border-b-2 bg-transparent px-0.5 font-semibold text-[14px] outline-none focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label={t("save")}
          className="flex size-7 items-center justify-center rounded-pill bg-ink text-on-ink"
        >
          <Check className="size-3.5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label={t("cancel")}
          onClick={onCancel}
          className={miniButton}
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </form>
    </m.li>
  );
}

function History({ id }: { id: string }) {
  const t = useTranslations("library.sheet");
  const format = useFormatter();
  const withNames = useWithNames();
  const { data } = useAliasHistory(id, true);
  const now = useNow({ updateInterval: 60_000 });
  return (
    <m.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.32, ease: ease.soft }}
      className="overflow-hidden"
    >
      <div className="grid gap-2 rounded-[18px] bg-sunken p-3.5">
        <b className="text-[13px]">{t("historyTitle")}</b>
        {!data ? (
          <span className="h-4 w-1/2 animate-pulse rounded-pill bg-line" />
        ) : data.length === 0 ? (
          <span className="text-[13px] text-ink-muted">
            {t("historyEmpty")}
          </span>
        ) : (
          <ol className="grid gap-1.5">
            {data.map((e, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list, newest first
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]"
              >
                <span>
                  {withNames((n) =>
                    t(`historyAction.${e.action}`, {
                      name: e.by ? n(e.by) : t("someone"),
                      before: e.before ?? "",
                      after: e.after ?? "",
                    }),
                  )}
                </span>
                <time className="font-mono text-[11.5px] text-ink-muted">
                  {format.relativeTime(e.at, now)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </m.div>
  );
}

function Themes({ sheet }: { sheet: CharacterSheet }) {
  const t = useTranslations("library.sheet");
  return (
    <section className="grid gap-3">
      <SectionHead title={t("appears")} count={sheet.themes.length} />
      <div className="flex flex-wrap gap-2">
        {sheet.themes.length ? (
          sheet.themes.map((name, i) => (
            <m.span
              key={name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: ease.soft, delay: i * 0.03 }}
              className="inline-flex h-8 items-center rounded-pill bg-butter px-3 font-bold text-[13px] text-on-butter"
            >
              {name}
            </m.span>
          ))
        ) : (
          <span className="text-[13px] text-ink-muted">{t("noThemes")}</span>
        )}
      </div>
    </section>
  );
}
