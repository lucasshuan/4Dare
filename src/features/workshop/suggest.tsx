"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ChevronDown,
  Flame,
  Pencil,
  Plus,
  Search,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/language-switch";
import { Portrait } from "@/components/ui/portrait";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { useThemeCatalog } from "@/features/create/theme-catalog";
import { useMe } from "@/features/data/use-me";
import { useSignIn } from "@/features/home/use-sign-in";
import { tasteEmoji, useTasteName } from "@/features/library/taste";
import { useLookAlikes } from "@/features/library/use-library";
import { QUESTION_KINDS, type QuestionKind } from "@/game/impostor/types";
import { TONES, type Tone } from "@/game/lineup/bank";
import type { Taste } from "@/game/tastes";
import { THEME_SETS, type ThemeSet } from "@/game/theme-sets";
import { LANGS, type Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import type {
  DraftLabel,
  Pieces,
  StarterCard,
  Translations,
  WandResult,
  WorkshopCheck,
  WorkshopDraft,
  WorkshopKind,
} from "@/server/community-contract";
import { sendSuggestion } from "@/server/workshop-actions";
import {
  KIND_ICON,
  MissionObject,
  QuestionObject,
  setEmoji,
  ThemeObject,
} from "./objects";
import { useRefreshWorkshop } from "./use-workshop";

type Scope = "general" | "set" | "theme";
type Audience = "all" | "fiction" | "real";
type ThemeGame = "who-am-i" | "impostor";

const FICTION_SETS: readonly ThemeSet[] = [
  "screen",
  "cartoons",
  "anime",
  "games",
  "heroes",
  "powers",
  "myths",
  "scifi",
  "warriors",
  "animals",
] as ThemeSet[];
const REAL_SETS: readonly ThemeSet[] = [
  "music",
  "celebs",
  "sports",
  "history",
] as ThemeSet[];
const REAL_TASTES: readonly Taste[] = ["real", "faith"];
const TONE_EMOJI: Record<Tone, string> = {
  chores: "🧹",
  social: "🥂",
  adventure: "🧭",
  absurd: "🤪",
  contest: "🏆",
};

const baseId = (appId: string) =>
  appId.replace(/^(en|es|ja|pt)-(?=(wd-Q|al-|hand-))/, "");

const INPUT =
  "h-[46px] w-full min-w-0 rounded-[16px] border border-line-strong bg-surface px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-sky focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)] focus-visible:outline-none";

const chip = (on: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-[11px] font-semibold text-[13px] transition-[background-color,border-color,color,scale] duration-150 ease-soft active:scale-[0.96]",
    on
      ? "border-ink bg-ink text-on-ink"
      : "border-line bg-surface hover:bg-sunken",
  );

/**
 * "Suggest for the Workshop": a theme, a question or a mission, each with
 * what its bank keeps. The preview on the left shows it as the game will,
 * in any language by its flag (the rule card of Who am I?'s opening for a
 * theme); the live check warns under the field it is about; the wand fills
 * the other languages, all editable. Guests are asked to sign in.
 */
export function Suggest({
  open,
  kind,
  left,
  onClose,
  onSent,
}: {
  open: boolean;
  kind: WorkshopKind;
  left: number | null;
  onClose: () => void;
  onSent: (id: string, kind: WorkshopKind) => void;
}) {
  const t = useTranslations("workshop.compose");
  const tCommon = useTranslations("common");
  const { me } = useMe();
  const { signIn, pending } = useSignIn();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-300 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(100dvh-28px)] flex-col overflow-hidden rounded-t-[28px] bg-surface text-ink shadow-pop outline-none transition-[translate,opacity,scale] duration-[440ms] ease-soft data-ending-style:translate-y-full data-starting-style:translate-y-full sm:inset-0 sm:m-auto sm:grid sm:h-[min(720px,calc(100dvh-32px))] sm:w-[min(980px,calc(100vw-32px))] sm:grid-cols-[minmax(0,330px)_minmax(0,1fr)] sm:rounded-[28px] sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-y-0 sm:data-ending-style:scale-[0.98] sm:data-starting-style:scale-[0.98] sm:data-ending-style:opacity-0 sm:data-starting-style:opacity-0">
          {me && !me.isGuest && open ? (
            <Composer
              kind={kind}
              left={left}
              onClose={onClose}
              onSent={onSent}
            />
          ) : (
            <>
              <div className="hidden bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--line-strong)_35%,transparent)_1px,transparent_1.5px)] bg-[length:18px_18px] bg-sunken sm:block" />
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <Dialog.Title className="font-display font-extrabold text-[26px] leading-[1.1] tracking-[-0.015em]">
                    {t("signInTitle")}
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label={tCommon("close")}
                    className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken"
                  >
                    <X className="size-5" strokeWidth={1.75} />
                  </Dialog.Close>
                </div>
                <p className="max-w-[46ch] text-ink-muted">{t("signInHint")}</p>
                <div className="flex flex-col gap-2 sm:max-w-xs">
                  {(["discord", "google"] as const).map((p) => (
                    <AuthButton
                      key={p}
                      wide
                      provider={p}
                      disabled={pending}
                      onClick={() => signIn(p)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const emptyLabel = (): DraftLabel => ({ emoji: "", text: "" });

function Composer({
  kind: startKind,
  left,
  onClose,
  onSent,
}: {
  kind: WorkshopKind;
  left: number | null;
  onClose: () => void;
  onSent: (id: string, kind: WorkshopKind) => void;
}) {
  const t = useTranslations("workshop");
  const tc = useTranslations("workshop.compose");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("common.errors");
  const tSets = useTranslations("common.themeSets");
  const tasteName = useTasteName();
  const gameName = useGameName();
  const locale = useLocale() as Lang;
  const toast = useToast();
  const refresh = useRefreshWorkshop();
  const themes = useThemeCatalog();
  const langName = useMemo(
    () => new Intl.DisplayNames([locale], { type: "language" }),
    [locale],
  );

  const [kind, setKind] = useState<WorkshopKind>(startKind);
  // theme
  const [games, setGames] = useState<ThemeGame[]>(["who-am-i", "impostor"]);
  const [name, setName] = useState("");
  const [themeSet, setThemeSet] = useState<ThemeSet>("looks" as ThemeSet);
  const [starters, setStarters] = useState<StarterCard[]>([]);
  const [search, setSearch] = useState("");
  const [startersLang, setStartersLang] = useState<"all" | Lang>("all");
  // question
  const [qKind, setQKind] = useState<QuestionKind>("scale");
  const [text, setText] = useState("");
  const [low, setLow] = useState<DraftLabel>(emptyLabel);
  const [high, setHigh] = useState<DraftLabel>(emptyLabel);
  const [choices, setChoices] = useState<DraftLabel[]>([
    emptyLabel(),
    emptyLabel(),
  ]);
  const [scope, setScope] = useState<Scope>("general");
  const [qSet, setQSet] = useState<ThemeSet>("anime" as ThemeSet);
  const [themeId, setThemeId] = useState<string>("");
  const [audience, setAudience] = useState<Audience>("all");
  const [spice, setSpice] = useState<1 | 2 | 3>(1);
  // mission
  const [mission, setMission] = useState("");
  const [tone, setTone] = useState<Tone>("chores");
  const [heavy, setHeavy] = useState(false);
  // translations
  const [tr, setTr] = useState<Translations>({});
  const [sources, setSources] = useState<WandResult["sources"]>({});
  const [trFor, setTrFor] = useState<string | null>(null);
  const [trOpen, setTrOpen] = useState(false);
  const [editing, setEditing] = useState<Lang[]>([]);
  const [wanding, setWanding] = useState(false);
  // the rest
  const [plang, setPlang] = useState<Lang>(locale);
  const [checks, setChecks] = useState<WorkshopCheck[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const draft: WorkshopDraft =
    kind === "theme"
      ? {
          kind,
          theme: {
            name: name.trim(),
            set: themeSet,
            games,
            starters: starters.map((s) => s.id),
            startersLang,
          },
        }
      : kind === "question"
        ? {
            kind,
            question: {
              kind: qKind,
              text: text.trim(),
              low: qKind === "scale" ? low : null,
              high: qKind === "scale" ? high : null,
              choices: qKind === "pick" ? choices : [],
              scope,
              set: scope === "set" ? qSet : null,
              themeId: scope === "theme" ? themeId || null : null,
              audience,
              spice,
            },
          }
        : { kind, mission: { text: mission.trim(), tone, heavy } };

  const pieces: Pieces = useMemo(() => {
    if (kind === "theme") return { name: name.trim() };
    if (kind === "mission") return { text: mission.trim() };
    const out: Pieces = { text: text.trim() };
    if (qKind === "scale") {
      out.low = low.text.trim();
      out.high = high.text.trim();
    }
    if (qKind === "pick")
      for (const [i, c] of choices.entries()) out[`c${i}`] = c.text.trim();
    return out;
  }, [kind, name, mission, text, qKind, low, high, choices]);
  const signature = JSON.stringify([kind, qKind, pieces]);
  const stale = trFor !== null && trFor !== signature;
  const others = LANGS.filter((l) => l !== locale);
  const missingIn = (l: Lang) =>
    Object.keys(pieces).filter((k) => !tr[l]?.[k]?.trim()).length;
  const missing =
    trFor && !stale ? others.reduce((a, l) => a + missingIn(l), 0) : 0;

  // the live check, a moment after typing stops
  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/workshop/check?lang=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: draftKey.length < 4000 ? `{"draft":${draftKey}}` : "{}",
      }).catch(() => null);
      if (!res?.ok) return;
      setChecks(((await res.json()) as { checks: WorkshopCheck[] }).checks);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draftKey, locale]);

  /** The text in the preview's language, faded when that language has none yet. */
  const shown = (key: string, own: string) => {
    if (plang === locale || !own) return { text: own, ok: true };
    const v = !stale ? tr[plang]?.[key] : undefined;
    return v ? { text: v, ok: true } : { text: own, ok: false };
  };

  const generate = async () => {
    if (Object.values(pieces).some((v) => !v))
      return setError(tc("translations.fillFirst"));
    setError("");
    setWanding(true);
    try {
      const res = await fetch(`/api/workshop/translate?lang=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, pieces }),
      }).catch(() => null);
      if (!res?.ok) {
        const code = res
          ? (((await res.json().catch(() => ({}))) as { error?: string })
              .error ?? "unknown")
          : "unknown";
        toast(tErrors(code as "unknown"));
        return;
      }
      const got = (await res.json()) as WandResult;
      setTr(got.translations);
      setSources(got.sources);
      setTrFor(signature);
      const short = others.filter((l) =>
        Object.keys(pieces).some((k) => !got.translations[l]?.[k]),
      );
      setEditing(short);
      setTrOpen(short.length > 0);
    } finally {
      setWanding(false);
    }
  };

  const submit = async () => {
    setError("");
    if (kind === "theme") {
      if (!games.length) return setError(tc("needGame"));
      if (name.trim().length < 4) return setError(tc("needName"));
      if (starters.length < 3)
        return setError(tc("needStarters", { n: 3 - starters.length }));
    } else if (kind === "question") {
      if (text.trim().length < 8) return setError(tc("needQuestion"));
      if (qKind === "scale" && (!low.text.trim() || !high.text.trim()))
        return setError(tc("needEnds"));
      if (qKind === "pick" && choices.some((c) => !c.text.trim()))
        return setError(tc("needOptions"));
    } else if (mission.trim().length < 10) return setError(tc("needMission"));
    if (left === 0) return setError(tc("weekDone"));
    if (checks.length)
      return setError(tc(`checks.${checks[0].code}`, { ref: checks[0].ref }));
    setSending(true);
    try {
      const r = await sendSuggestion(draft, stale ? {} : tr);
      if (!r.ok) {
        setError(
          r.error === "rate_limited" ? tc("weekDone") : tErrors(r.error),
        );
        return;
      }
      if (!r.data.id) {
        setChecks(r.data.checks);
        return;
      }
      refresh();
      toast(tc("sent"));
      onSent(r.data.id, kind);
      onClose();
    } finally {
      setSending(false);
    }
  };

  const slot = (s: WorkshopCheck["slot"]) => (
    <AnimatePresence initial={false}>
      {checks
        .filter((c) => c.slot === s)
        .map((c) => (
          <m.div
            key={c.code}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: ease.soft }}
            className="overflow-hidden"
            role="status"
          >
            <div className="grid gap-1 rounded-[14px] bg-apricot-soft px-3 py-2.5 text-[13px] leading-[1.4]">
              <b className="text-[13.5px]">
                {tc(`checks.${c.code}`, { ref: c.ref })}
              </b>
              <span>{tc(`checks.${c.code}Hint`)}</span>
            </div>
          </m.div>
        ))}
    </AnimatePresence>
  );

  const tastes = [
    ...new Set(starters.map((s) => s.taste).filter((x): x is Taste => !!x)),
  ];
  const setThemes = (themes ?? []).filter((th) => th.set === themeSet);

  // -- preview ---------------------------------------------------------------
  const preview: ReactNode =
    kind === "theme" ? (
      <div className="grid w-[250px] max-w-full gap-3.5">
        <div className="-rotate-[1.5deg] shadow-card rounded-[18px]">
          <ThemeObject
            big
            name={shown("name", name.trim()).text || tc("placeholderTheme")}
            placeholder={!name.trim() || !shown("name", name.trim()).ok}
            set={themeSet}
            starters={starters}
            slots={5}
          />
        </div>
        <RuleBox set={themeSet} starters={starters} />
      </div>
    ) : kind === "question" ? (
      <div className="w-[250px] max-w-full -rotate-[1.5deg] rounded-[18px] shadow-card">
        <QuestionObject
          big
          placeholder={!text.trim() || !shown("text", text.trim()).ok}
          question={{
            kind: qKind,
            text: shown("text", text.trim()).text || tc("placeholderQuestion"),
            low: { emoji: low.emoji, text: shown("low", low.text.trim()).text },
            high: {
              emoji: high.emoji,
              text: shown("high", high.text.trim()).text,
            },
            choices: choices.map((c, i) => ({
              emoji: c.emoji,
              text: shown(`c${i}`, c.text.trim()).text,
            })),
            scope,
            set: scope === "set" ? qSet : null,
            themeName:
              scope === "theme"
                ? (themes?.find((th) => th.id === themeId)?.names[plang] ??
                  null)
                : null,
            audience,
            spice,
          }}
        />
      </div>
    ) : (
      <div className="w-[250px] max-w-full -rotate-[1.5deg] rounded-[18px] shadow-card">
        <MissionObject
          big
          placeholder={!mission.trim() || !shown("text", mission.trim()).ok}
          mission={{
            text:
              shown("text", mission.trim()).text || tc("placeholderMission"),
            tone,
            heavy,
          }}
        />
      </div>
    );

  return (
    <>
      <div className="relative flex h-[240px] shrink-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--line-strong)_35%,transparent)_1px,transparent_1.5px)] bg-[length:18px_18px] bg-sunken px-5 sm:h-auto sm:py-8">
        <span className="absolute top-4 left-[18px] font-semibold text-[12px] text-ink-muted uppercase tracking-[0.08em]">
          {tc("preview")}
        </span>
        <fieldset className="absolute top-3 right-3.5 z-[2] m-0 flex gap-1 rounded-pill border-0 bg-surface p-[3px] shadow-card">
          <legend className="sr-only">{tc("previewLang")}</legend>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={plang === l}
              aria-label={langName.of(l)}
              title={langName.of(l)}
              onClick={() => setPlang(l)}
              className={cn(
                "grid size-[30px] place-items-center rounded-pill transition-[background-color,scale] duration-150 active:scale-[0.92]",
                plang === l && "bg-sky-soft",
              )}
            >
              <Flag lang={l} />
            </button>
          ))}
        </fieldset>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={kind}
            initial={{ opacity: 0, y: 12, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.36, ease: ease.soft }}
            className="max-sm:mt-6 max-sm:scale-[0.72]"
          >
            {preview}
          </m.div>
        </AnimatePresence>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 items-start gap-3 py-5 pr-5 pl-5 sm:pl-7">
          <div>
            <Dialog.Title className="font-display font-extrabold text-[26px] leading-[1.1] tracking-[-0.015em]">
              {tc("title")}
            </Dialog.Title>
            <Dialog.Description className="mt-1 max-w-[46ch] text-[14px] text-ink-muted">
              {tc("lead")}
            </Dialog.Description>
          </div>
          <Dialog.Close
            aria-label={tCommon("close")}
            className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-pill bg-sunken transition-transform active:scale-[0.92]"
          >
            <X className="size-5" strokeWidth={1.75} />
          </Dialog.Close>
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-[18px] overflow-y-auto overscroll-contain px-5 pt-1 pb-5 sm:px-7">
          <Segmented
            label={tc("type")}
            options={["theme", "question", "mission"] as const}
            value={kind}
            onChange={(k: WorkshopKind) => {
              setKind(k);
              setError("");
              setChecks([]);
            }}
            render={(k) => tc(`types.${k}`)}
          />
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={kind}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: ease.soft }}
              className="grid gap-[18px]"
            >
              {kind === "theme" ? (
                <>
                  <Field label={tc("goesTo")}>
                    <div className="flex flex-wrap gap-2">
                      {(["who-am-i", "impostor"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={games.includes(g)}
                          onClick={() =>
                            setGames((all) =>
                              all.includes(g)
                                ? all.filter((x) => x !== g)
                                : [...all, g],
                            )
                          }
                          className={cn(
                            chip(games.includes(g)),
                            "h-9 pl-1.5 text-[14px]",
                          )}
                        >
                          <GameThumb game={g} size="tiny" />
                          {gameName(g)}
                        </button>
                      ))}
                    </div>
                    {!games.length ? <Bad>{tc("needGame")}</Bad> : null}
                    <Hint>{tc("themeGamesHint")}</Hint>
                  </Field>
                  <Field label={tc("themeName")}>
                    <input
                      value={name}
                      maxLength={40}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={tc("themeNamePh")}
                      autoComplete="off"
                      className={INPUT}
                    />
                    {slot("name")}
                  </Field>
                  <Field label={tc("set")}>
                    <div className="flex flex-wrap gap-1.5">
                      {THEME_SETS.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          aria-pressed={themeSet === s.key}
                          onClick={() => setThemeSet(s.key)}
                          className={chip(themeSet === s.key)}
                        >
                          <span aria-hidden="true">{s.emoji}</span>
                          {tSets(s.key)}
                        </button>
                      ))}
                    </div>
                    <Hint>
                      {tc("setHint")}{" "}
                      {setThemes.length
                        ? tc("setExamples", {
                            n: setThemes.length,
                            list: setThemes
                              .slice(0, 3)
                              .map((th) => `“${th.names[locale]}”`)
                              .join(", "),
                          })
                        : null}
                    </Hint>
                  </Field>
                  <Field
                    label={tc("starters")}
                    extra={
                      <span className="font-medium font-mono text-[12px] text-ink-muted">
                        {tc("startersCount", {
                          n: starters.length,
                          max: starters.length < 3 ? 3 : 5,
                        })}
                      </span>
                    }
                  >
                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence initial={false}>
                        {starters.map((s) => (
                          <m.span
                            key={s.id}
                            layout
                            initial={{ opacity: 0, scale: 0.86 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="inline-flex h-[34px] items-center gap-1.5 rounded-pill border border-butter bg-butter-soft pl-1 font-semibold text-[13px]"
                          >
                            <span className="block size-[26px] overflow-hidden rounded-pill">
                              <Portrait
                                src={s.imageUrl}
                                className="rounded-none"
                              />
                            </span>
                            {s.name}
                            <button
                              type="button"
                              aria-label={tc("removeStarter", { name: s.name })}
                              onClick={() =>
                                setStarters((all) =>
                                  all.filter((x) => x.id !== s.id),
                                )
                              }
                              className="flex size-7 items-center justify-center rounded-pill text-ink-muted hover:text-ink"
                            >
                              <X className="size-3.5" strokeWidth={2} />
                            </button>
                          </m.span>
                        ))}
                      </AnimatePresence>
                    </div>
                    {slot("starters")}
                    <StarterSearch
                      q={search}
                      onQ={setSearch}
                      taken={starters.map((s) => s.id)}
                      onPick={(s) => {
                        if (starters.length >= 5)
                          return setError(tc("fiveEnough"));
                        setError("");
                        setStarters((all) => [...all, s]);
                        setSearch("");
                      }}
                    />
                    <Hint>{tc("startersHint")}</Hint>
                  </Field>
                  <Field label={tc("tastes")}>
                    <div className="flex flex-wrap gap-1.5">
                      {tastes.length ? (
                        tastes.map((x) => (
                          <span
                            key={x}
                            className={cn(
                              chip(false),
                              "cursor-default bg-sunken",
                            )}
                          >
                            {tasteEmoji(x)} {tasteName(x)}
                          </span>
                        ))
                      ) : (
                        <Hint>{tc("tastesEmpty")}</Hint>
                      )}
                    </div>
                    <Hint>{tc("tastesHint")}</Hint>
                  </Field>
                  <Field label={tc("startersLang")}>
                    <Segmented
                      label={tc("startersLang")}
                      options={["all", locale] as const}
                      value={startersLang === "all" ? "all" : locale}
                      onChange={(v) => setStartersLang(v as "all" | Lang)}
                      render={(v) =>
                        v === "all" ? (
                          <>🌍 {tc("allLangs")}</>
                        ) : (
                          <>
                            <Flag lang={locale} className="size-4" />
                            {tc("onlyLang", {
                              lang: langName.of(locale) ?? locale,
                            })}
                          </>
                        )
                      }
                    />
                    <Hint>
                      {tc("startersLangHint", {
                        lang: langName.of(locale) ?? locale,
                      })}
                    </Hint>
                  </Field>
                </>
              ) : kind === "question" ? (
                <>
                  <Field label={tc("goesTo")}>
                    <span
                      className={cn(chip(true), "h-9 w-fit pl-1.5 text-[14px]")}
                    >
                      <GameThumb game="impostor" size="tiny" />
                      {gameName("impostor")}
                    </span>
                    <Hint>{tc("questionGamesHint")}</Hint>
                  </Field>
                  <Field label={tc("answerKind")}>
                    <Segmented
                      label={tc("answerKind")}
                      options={QUESTION_KINDS}
                      value={qKind}
                      onChange={setQKind}
                      render={(k) => {
                        const Icon = KIND_ICON[k];
                        return (
                          <>
                            <Icon className="size-4" strokeWidth={2} />
                            {t(`kinds.${k}`)}
                          </>
                        );
                      }}
                    />
                  </Field>
                  <Field label={tc("question")}>
                    <input
                      value={text}
                      maxLength={80}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={tc("questionPh")}
                      autoComplete="off"
                      className={INPUT}
                    />
                    {slot("text")}
                  </Field>
                  {qKind === "scale" ? (
                    <Field
                      label={tc("ends")}
                      extra={
                        <span className="font-medium font-mono text-[12px] text-ink-muted">
                          {tc("withEmoji")}
                        </span>
                      }
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <LabelInput
                          value={low}
                          onChange={setLow}
                          placeholder={tc("low")}
                          emojiLabel={tc("lowEmoji")}
                          emojiPh="😱"
                        />
                        <LabelInput
                          value={high}
                          onChange={setHigh}
                          placeholder={tc("high")}
                          emojiLabel={tc("highEmoji")}
                          emojiPh="🦁"
                        />
                      </div>
                    </Field>
                  ) : null}
                  {qKind === "pick" ? (
                    <Field
                      label={tc("options")}
                      extra={
                        <span className="font-medium font-mono text-[12px] text-ink-muted">
                          {tc("withEmoji")}
                        </span>
                      }
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {choices.map((c, i) => (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: options in order
                            key={i}
                            className="flex items-center gap-1"
                          >
                            <LabelInput
                              value={c}
                              onChange={(v) =>
                                setChoices((all) =>
                                  all.map((x, j) => (j === i ? v : x)),
                                )
                              }
                              placeholder={tc("option", { n: i + 1 })}
                              emojiLabel={tc("optionEmoji", { n: i + 1 })}
                              emojiPh={["🏖️", "🏔️", "🌆", "🌲"][i]}
                            />
                            {choices.length > 2 ? (
                              <button
                                type="button"
                                aria-label={tc("removeOption", { n: i + 1 })}
                                onClick={() =>
                                  setChoices((all) =>
                                    all.filter((_, j) => j !== i),
                                  )
                                }
                                className="flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-sunken"
                              >
                                <X className="size-4" strokeWidth={2} />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {choices.length < 4 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setChoices((all) => [...all, emptyLabel()])
                          }
                          className="inline-flex w-fit items-center gap-1.5 font-semibold text-[13px] text-sky"
                        >
                          <Plus className="size-4" strokeWidth={2} />
                          {tc("addOption")}
                        </button>
                      ) : null}
                    </Field>
                  ) : null}
                  <Field label={tc("scope")}>
                    <Segmented
                      label={tc("scope")}
                      options={["general", "set", "theme"] as const}
                      value={scope}
                      onChange={setScope}
                      render={(s) => t(`scopes.${s}`)}
                    />
                    {scope === "set" ? (
                      <div className="flex flex-wrap gap-1.5">
                        {THEME_SETS.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            aria-pressed={qSet === s.key}
                            onClick={() => setQSet(s.key)}
                            className={chip(qSet === s.key)}
                          >
                            {s.emoji} {tSets(s.key)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {scope === "theme" ? (
                      <select
                        value={themeId}
                        onChange={(e) => setThemeId(e.target.value)}
                        aria-label={tc("theme")}
                        className={INPUT}
                      >
                        <option value="">—</option>
                        {[...(themes ?? [])]
                          .sort((a, b) =>
                            a.names[locale].localeCompare(
                              b.names[locale],
                              locale,
                            ),
                          )
                          .map((th) => (
                            <option key={th.id} value={th.id}>
                              {setEmoji(th.set)} {th.names[locale]}
                            </option>
                          ))}
                      </select>
                    ) : null}
                  </Field>
                  <Field label={tc("audience")}>
                    <Segmented
                      label={tc("audience")}
                      options={["all", "fiction", "real"] as const}
                      value={audience}
                      onChange={setAudience}
                      render={(a) => (
                        <>
                          <span aria-hidden="true">
                            {{ all: "✨", fiction: "🎭", real: "🧑" }[a]}
                          </span>
                          {t(`audience.${a}`)}
                        </>
                      )}
                    />
                    <Hint>
                      {audience === "all"
                        ? tc("audienceAll")
                        : tc("audienceOnly", {
                            what: t(`audience.${audience}`).toLowerCase(),
                          })}
                    </Hint>
                  </Field>
                  <Field label={tc("spice")}>
                    <Segmented
                      label={tc("spice")}
                      options={["1", "2", "3"] as const}
                      value={String(spice) as "1" | "2" | "3"}
                      onChange={(v) => setSpice(Number(v) as 1 | 2 | 3)}
                      render={(v) => (
                        <>
                          <span className="inline-flex">
                            {Array.from({ length: Number(v) }, (_, i) => (
                              <Flame
                                // biome-ignore lint/suspicious/noArrayIndexKey: flames
                                key={i}
                                className="size-3.5"
                                strokeWidth={2}
                              />
                            ))}
                          </span>
                          {tc(`spices.${v}`)}
                        </>
                      )}
                    />
                    <Hint>{tc("spiceHint")}</Hint>
                  </Field>
                </>
              ) : (
                <>
                  <Field label={tc("goesTo")}>
                    <span
                      className={cn(chip(true), "h-9 w-fit pl-1.5 text-[14px]")}
                    >
                      <GameThumb game="lineup" size="tiny" />
                      {gameName("lineup")}
                    </span>
                    <Hint>{tc("missionGamesHint")}</Hint>
                  </Field>
                  <Field label={tc("mission")}>
                    <span className="flex items-end rounded-[16px] border border-line-strong bg-surface pr-3 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
                      <textarea
                        value={mission}
                        rows={3}
                        maxLength={90}
                        onChange={(e) => setMission(e.target.value)}
                        placeholder={tc("missionPh")}
                        className="min-w-0 flex-1 resize-none bg-transparent px-3.5 py-3 text-[15px] leading-[1.4] outline-none focus-visible:outline-none"
                      />
                      <span className="pb-2.5 font-medium font-mono text-[12px] text-ink-muted">
                        {mission.length}/90
                      </span>
                    </span>
                    {slot("text")}
                  </Field>
                  <Field label={tc("tone")}>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map((x) => (
                        <button
                          key={x}
                          type="button"
                          aria-pressed={tone === x}
                          onClick={() => setTone(x)}
                          className={cn(chip(tone === x), "h-9 text-[14px]")}
                        >
                          <span aria-hidden="true">{TONE_EMOJI[x]}</span>
                          {t(`tones.${x}`)}
                        </button>
                      ))}
                    </div>
                    <Hint>{t(`toneHints.${tone}`)}</Hint>
                  </Field>
                  <Field label={tc("heavy")}>
                    <span className="flex items-center gap-3">
                      <Switch
                        checked={heavy}
                        onCheckedChange={setHeavy}
                        aria-label={tc("heavy")}
                      />
                      <Hint>⚠️ {tc("heavyHint")}</Hint>
                    </span>
                  </Field>
                </>
              )}
            </m.div>
          </AnimatePresence>
          <Translate
            locale={locale}
            langName={(l) => langName.of(l) ?? l}
            pieces={pieces}
            tr={tr}
            sources={sources}
            generated={trFor !== null}
            stale={stale}
            missing={missing}
            open={trOpen}
            onOpen={setTrOpen}
            editing={editing}
            onEditing={setEditing}
            working={wanding}
            onWand={generate}
            onEdit={(l, key, v) =>
              setTr((all) => ({ ...all, [l]: { ...(all[l] ?? {}), [key]: v } }))
            }
          />
          <AnimatePresence>
            {error ? (
              <m.p
                key={error}
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-[13px] text-no"
              >
                {error}
              </m.p>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 border-line border-t px-5 py-3.5 sm:pl-7">
          <span className="mr-auto text-[13px] text-ink-muted max-sm:hidden">
            {left === null ? null : tc("left", { n: left })}
          </span>
          <Dialog.Close
            render={<Button variant="ghost">{tc("cancel")}</Button>}
          />
          <Button type="submit" variant="primary" disabled={sending}>
            {tc("send")}
          </Button>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  extra,
  children,
}: {
  label: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="flex items-center gap-2 font-semibold text-[14px]">
        {label}
        {extra}
      </span>
      {children}
    </div>
  );
}

const Hint = ({ children }: { children: ReactNode }) => (
  <span className="text-[13px] text-ink-muted leading-[1.45]">{children}</span>
);

const Bad = ({ children }: { children: ReactNode }) => (
  <span
    role="alert"
    className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-no"
  >
    <X className="size-3.5 rounded-pill bg-no-soft p-0.5" strokeWidth={2.5} />
    {children}
  </span>
);

function LabelInput({
  value,
  onChange,
  placeholder,
  emojiLabel,
  emojiPh,
}: {
  value: DraftLabel;
  onChange: (v: DraftLabel) => void;
  placeholder: string;
  emojiLabel: string;
  emojiPh: string;
}) {
  return (
    <span className="flex h-[46px] min-w-0 flex-1 items-center rounded-[16px] border border-line-strong bg-surface focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
      <input
        value={value.emoji}
        maxLength={4}
        onChange={(e) => onChange({ ...value, emoji: e.target.value })}
        placeholder={emojiPh}
        aria-label={emojiLabel}
        className="h-full w-[42px] shrink-0 border-line border-r bg-transparent text-center text-[18px] outline-none focus-visible:outline-none"
      />
      <input
        value={value.text}
        maxLength={18}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] outline-none focus-visible:outline-none"
      />
    </span>
  );
}

function StarterSearch({
  q,
  onQ,
  taken,
  onPick,
}: {
  q: string;
  onQ: (q: string) => void;
  taken: string[];
  onPick: (s: StarterCard) => void;
}) {
  const tc = useTranslations("workshop.compose");
  const { data } = useLookAlikes(q);
  const results = (data ?? [])
    .map((c) => ({ ...c, base: baseId(c.id) }))
    .filter((c) => !taken.includes(c.base));
  const first = useRef<HTMLButtonElement>(null);
  return (
    <div className="grid gap-1">
      <label className="flex h-[46px] items-center gap-2.5 rounded-[16px] border border-line-strong bg-surface px-3.5 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
        <Search className="size-5 text-ink-muted" strokeWidth={1.75} />
        <span className="sr-only">{tc("searchLibrary")}</span>
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              first.current?.click();
            }
          }}
          placeholder={tc("searchLibrary")}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
        />
      </label>
      {q.trim().length >= 2 ? (
        results.length ? (
          results.map((c, i) => (
            <button
              key={c.id}
              ref={i === 0 ? first : undefined}
              type="button"
              aria-label={tc("addStarter", { name: c.name })}
              onClick={() =>
                onPick({
                  id: c.base,
                  name: c.name,
                  imageUrl: c.imageUrl,
                  taste: c.taste,
                })
              }
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left text-[14px] transition-colors hover:bg-sunken"
            >
              <span className="block w-7 shrink-0 overflow-hidden rounded-[8px]">
                <Portrait src={c.imageUrl} className="rounded-none" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {c.name}
                {c.origin ? (
                  <small className="text-ink-muted"> · {c.origin}</small>
                ) : null}
              </span>
              <Plus className="size-4 text-ink-muted" strokeWidth={2} />
            </button>
          ))
        ) : data ? (
          <Hint>{tc("noResults", { q: q.trim() })}</Hint>
        ) : null
      ) : null}
    </div>
  );
}

/** Who am I?'s opening rule card: two examples that fit (✓) and, when the set asks for one, a kind that doesn't (✗). */
function RuleBox({
  set,
  starters,
}: {
  set: ThemeSet;
  starters: StarterCard[];
}) {
  const tc = useTranslations("workshop.compose.rule");
  const tastes = starters.map((s) => s.taste);
  const allFiction =
    tastes.length > 0 && tastes.every((x) => x && !REAL_TASTES.includes(x));
  const allReal =
    tastes.length > 0 && tastes.every((x) => x && REAL_TASTES.includes(x));
  const no =
    FICTION_SETS.includes(set) && allFiction
      ? tc("athlete")
      : REAL_SETS.includes(set) && allReal
        ? tc("cartoon")
        : null;
  const examples = starters.slice(0, 2);
  return (
    <div className="grid rotate-1 gap-2 rounded-[18px] bg-surface px-3.5 py-3 shadow-card">
      <span className="font-medium font-mono text-[11.5px] uppercase tracking-[0.06em] opacity-75">
        {tc("title")}
      </span>
      <b className="font-bold font-display text-[14px] leading-tight">
        {tc("must")}
      </b>
      <div className="flex items-start gap-2">
        {(examples.length ? examples : [null, null]).map((s, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: two places
            key={i}
            className="grid w-14 justify-items-center gap-[3px] text-center text-[10.5px] text-ink-muted leading-[1.15]"
          >
            {s ? (
              <span className="block w-11 overflow-hidden rounded-[9px]">
                <Portrait src={s.imageUrl} className="rounded-none" />
              </span>
            ) : (
              <span className="grid aspect-[4/5] w-11 place-items-center rounded-[9px] border-[1.5px] border-line-strong border-dashed text-[18px]">
                ?
              </span>
            )}
            <i className="font-extrabold text-[13px] text-yes not-italic">✓</i>
            <span className="line-clamp-2">{s ? s.name : tc("example")}</span>
          </span>
        ))}
        {no ? (
          <span className="grid w-14 justify-items-center gap-[3px] text-center text-[10.5px] text-ink-muted leading-[1.15]">
            <span className="grid aspect-[4/5] w-11 place-items-center rounded-[9px] border-[1.5px] border-line-strong border-dashed text-[18px]">
              🚫
            </span>
            <i className="font-extrabold text-[13px] text-no not-italic">✗</i>
            {no}
          </span>
        ) : null}
      </div>
      {no ? null : (
        <span className="text-[12px] text-ink-muted leading-snug">
          {FICTION_SETS.includes(set) || REAL_SETS.includes(set)
            ? tc("mixed")
            : tc("setMixed")}
        </span>
      )}
    </div>
  );
}

/** The other languages: closed, the flags and how far they are; open, a line each with a pencil. */
function Translate({
  locale,
  langName,
  pieces,
  tr,
  sources,
  generated,
  stale,
  missing,
  open,
  onOpen,
  editing,
  onEditing,
  working,
  onWand,
  onEdit,
}: {
  locale: Lang;
  langName: (l: Lang) => string;
  pieces: Pieces;
  tr: Translations;
  sources: WandResult["sources"];
  generated: boolean;
  stale: boolean;
  missing: number;
  open: boolean;
  onOpen: (v: boolean) => void;
  editing: Lang[];
  onEditing: (v: Lang[]) => void;
  working: boolean;
  onWand: () => void;
  onEdit: (l: Lang, key: string, v: string) => void;
}) {
  const tc = useTranslations("workshop.compose.translations");
  const others = LANGS.filter((l) => l !== locale);
  const keys = Object.keys(pieces);
  const sum = !generated
    ? tc("summary")
    : stale
      ? tc("stale")
      : missing
        ? tc("missing", { n: missing })
        : tc("ready");
  const summaryOf = (l: Lang) =>
    keys
      .map((k) => tr[l]?.[k])
      .filter(Boolean)
      .join(" · ");
  return (
    <div className="grid rounded-[18px] bg-sunken py-1.5 pr-2 pl-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onOpen(!open)}
          className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5 rounded-[14px] px-2 py-1.5 text-left transition-colors hover:bg-ink/5"
        >
          <span className="flex shrink-0 items-center pr-0.5">
            <Flag
              lang={locale}
              className="relative z-[1] size-6 shadow-[0_0_0_2px_var(--surface-sunken)]"
            />
            {others.map((l) => (
              <m.span
                key={l}
                animate={{ x: open ? 3 : 0 }}
                className={cn(
                  "-ml-[7px] grid rounded-pill",
                  (!generated || stale) && "opacity-45 grayscale",
                  generated &&
                    !stale &&
                    keys.some((k) => !tr[l]?.[k]) &&
                    "shadow-[0_0_0_2px_var(--surface-sunken),0_0_0_3.5px_var(--no)]",
                )}
              >
                <Flag
                  lang={l}
                  className="size-[18px] shadow-[0_0_0_2px_var(--surface-sunken)]"
                />
              </m.span>
            ))}
          </span>
          <span className="grid min-w-0 leading-tight">
            <b className="font-semibold text-[14px]">
              {langName(locale)}{" "}
              <small className="ml-1 font-medium font-mono text-[11px] text-ink-muted">
                {tc("main")}
              </small>
            </b>
            <small
              className={cn(
                "truncate text-[12.5px]",
                !generated
                  ? "text-ink-muted"
                  : stale || missing
                    ? "text-no"
                    : "text-yes",
              )}
            >
              {sum}
            </small>
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 text-ink-muted transition-transform duration-300 ease-soft",
              open && "rotate-180",
            )}
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          onClick={onWand}
          disabled={working}
          className="inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong bg-surface px-3.5 font-semibold text-[14px] transition-colors hover:bg-canvas disabled:opacity-60"
        >
          <m.span
            animate={working ? { rotate: [0, -18, 14, -8, 0] } : { rotate: 0 }}
            transition={
              working ? { duration: 0.7, repeat: Number.POSITIVE_INFINITY } : {}
            }
            className="flex"
          >
            {generated && !stale ? (
              <Sparkles className="size-4" strokeWidth={2} />
            ) : (
              <WandSparkles className="size-4" strokeWidth={2} />
            )}
          </m.span>
          {working
            ? tc("working")
            : generated && !stale
              ? tc("wandAgain")
              : tc("wand")}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: ease.soft }}
            className="overflow-hidden"
          >
            <ul className="mt-1.5 grid gap-1">
              {others.map((l, i) => {
                const edit = editing.includes(l);
                const srcs = [
                  ...new Set(keys.map((k) => sources[l]?.[k]).filter(Boolean)),
                ];
                const has = summaryOf(l);
                return (
                  <m.li
                    key={l}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: ease.soft,
                      delay: i * 0.05,
                    }}
                    className="overflow-hidden rounded-[14px] bg-surface"
                  >
                    <div className="flex min-h-10 items-center gap-2 py-1 pr-1 pl-2.5">
                      <span className="flex w-11 shrink-0 items-center gap-1.5 font-medium font-mono text-[12px] uppercase">
                        <Flag lang={l} className="size-[18px]" />
                        {l}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[14px]",
                          !generated || stale
                            ? "text-ink-muted"
                            : keys.some((k) => !tr[l]?.[k])
                              ? "text-no"
                              : "",
                        )}
                      >
                        {!generated
                          ? tc("none")
                          : stale
                            ? tc("stale")
                            : has || tc("toWrite")}
                      </span>
                      {generated && !stale && srcs.length ? (
                        <span className="shrink-0 rounded-pill bg-sunken px-[7px] py-[3px] font-medium font-mono text-[10.5px] text-ink-muted uppercase tracking-[0.04em] max-sm:hidden">
                          {srcs
                            .map((s) => tc(`from.${s as "bank"}`))
                            .join(" + ")}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-expanded={edit}
                        aria-label={tc("edit", { lang: langName(l) })}
                        onClick={() =>
                          onEditing(
                            edit
                              ? editing.filter((x) => x !== l)
                              : [...editing, l],
                          )
                        }
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-muted transition-colors hover:bg-sunken hover:text-ink",
                          edit && "bg-sunken text-ink",
                        )}
                      >
                        <Pencil className="size-4" strokeWidth={2} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {edit ? (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid gap-1.5 overflow-hidden pr-2.5 pb-2.5 pl-2.5 sm:pl-[62px]"
                        >
                          {keys.map((k) => (
                            <label
                              key={k}
                              className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2 text-[12px] text-ink-muted"
                            >
                              <span className="truncate">{pieces[k]}</span>
                              <input
                                value={tr[l]?.[k] ?? ""}
                                maxLength={90}
                                onChange={(e) => onEdit(l, k, e.target.value)}
                                placeholder={pieces[k]}
                                className={cn(
                                  "h-9 w-full min-w-0 rounded-[11px] border bg-canvas px-2.5 text-[14px] text-ink outline-none focus-visible:border-sky focus-visible:outline-none",
                                  tr[l]?.[k]
                                    ? "border-line-strong"
                                    : "border-no bg-no-soft",
                                )}
                              />
                            </label>
                          ))}
                        </m.div>
                      ) : null}
                    </AnimatePresence>
                  </m.li>
                );
              })}
            </ul>
            <p className="px-1.5 pt-2 pb-1 text-[13px] text-ink-muted">
              {tc("hint")}
            </p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
