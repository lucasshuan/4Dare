"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Eye,
  Languages,
  MoonStar,
  Palette,
  Pencil,
  Plus,
  Quote,
  Sparkles,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Flag } from "@/components/ui/language-switch";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import {
  HANDLE_MAX,
  handleProblem,
  normalizeHandle,
} from "@/game/profile/handle";
import {
  ACCENTS,
  AUDIENCES,
  type Audience,
  type Banner,
  CAPTION_MAX,
  PLAY_TIMES,
  PRIVACY_KEYS,
  type Privacy,
  QUOTE_MAX,
  SHOWCASE_MAX,
} from "@/game/profile/profile";
import { LANGS, MAX_NAME } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { checkHandle, saveProfile } from "@/server/actions";
import type { ProfileView, ShowcaseView } from "@/server/contract";
import type { HandleCheck } from "@/server/profile-edit";
import { Card } from "./activity";
import {
  AvatarDialog,
  type AvatarDraft,
  avatarOf,
  CharacterSearch,
  type CoverChoice,
  CoverPicker,
  initialAvatar,
  Swatch,
} from "./editor-parts";
import {
  accentStyle,
  FRAME,
  ProfileCover,
  type ProfileMode,
  useLangList,
} from "./profile-body";
import { profilePath } from "./profile-link";
import { ShowcaseCard } from "./showcase";
import { profileKey } from "./use-profile";

/** How the @handle field reads while it is typed: same, checking, or the server's answer. */
type HandleState = { kind: "same" } | { kind: "checking" } | HandleCheck;

/** Asks the server about a new handle a moment after typing stops. */
function useHandleState(handle: string, current: string): HandleState {
  const [answer, setAnswer] = useState<{ for: string; check: HandleCheck }>();
  const wanted = normalizeHandle(handle);
  const local = handleProblem(wanted);
  useEffect(() => {
    if (wanted === current || local) return;
    const wait = window.setTimeout(async () => {
      const r = await checkHandle(wanted);
      if (r.ok) setAnswer({ for: wanted, check: r.data });
    }, 350);
    return () => window.clearTimeout(wait);
  }, [wanted, current, local]);
  if (wanted === current) return { kind: "same" };
  if (local) return { ok: false, problem: local };
  return answer?.for === wanted ? answer.check : { kind: "checking" };
}

/**
 * The owner's profile, editable where it stands: cover, avatar, name and
 * @handle (checked while typed), quote, showcase, "about you", accent and
 * who sees what. One save bar at the bottom saves it all.
 */
export function ProfileEditor({
  view,
  mode,
  coverSlot,
  onClose,
}: {
  view: ProfileView;
  mode: ProfileMode;
  coverSlot: HTMLElement | null;
  onClose: () => void;
}) {
  const t = useTranslations("player.editor");
  const tc = useTranslations("common");
  const format = useFormatter();
  const langList = useLangList();
  const toast = useToast();
  const router = useRouter();
  const client = useQueryClient();
  const { me, setMe } = useMe();
  const { run, pending } = useAction();

  const [name, setName] = useState(me?.name ?? view.name);
  const [handle, setHandle] = useState(view.handle);
  const [quote, setQuote] = useState(view.quote ?? "");
  const [accent, setAccent] = useState<string | null>(view.accent);
  const [cover, setCover] = useState<CoverChoice>({ kind: "keep" });
  const [avatar, setAvatar] = useState<AvatarDraft | null>(() =>
    me ? initialAvatar(me) : null,
  );
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [about, setAbout] = useState(view.about);
  const [showcase, setShowcase] = useState<ShowcaseView[]>(view.showcase);
  const [picking, setPicking] = useState<number | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>(
    view.own?.privacy ?? {
      profile: "all",
      mural: "all",
      muralWrite: "all",
      muralReply: "all",
      activity: "all",
      showcase: "all",
      contributions: "all",
      playing: true,
    },
  );
  const handleState = useHandleState(handle, view.handle);

  // the cover and the avatar as they will look
  const shownBanner: Banner | null =
    cover.kind === "keep"
      ? view.banner
      : cover.kind === "none"
        ? null
        : cover.kind === "preset"
          ? { kind: "preset", id: cover.id }
          : { kind: "image", url: cover.url };
  useEffect(
    () => () => {
      if (cover.kind === "upload") URL.revokeObjectURL(cover.url);
    },
    [cover],
  );
  const avatarBlobUrl = useMemo(
    () => (avatar?.blob ? URL.createObjectURL(avatar.blob) : null),
    [avatar?.blob],
  );
  useEffect(
    () => () => void (avatarBlobUrl && URL.revokeObjectURL(avatarBlobUrl)),
    [avatarBlobUrl],
  );
  const shownAvatar =
    me && avatar ? avatarOf(avatar, me, avatarBlobUrl) : view.avatar;

  const snapshot = JSON.stringify({
    name: name.trim(),
    handle: normalizeHandle(handle),
    quote: quote.trim(),
    accent,
    cover: cover.kind,
    avatar,
    about,
    showcase: showcase.map((s) => [s.characterId, s.caption]),
    privacy,
  });
  const [initial] = useState(snapshot);
  const dirty = snapshot !== initial;
  const handleOk =
    ("kind" in handleState && handleState.kind === "same") ||
    ("ok" in handleState && handleState.ok);
  const uploadMissing =
    avatar?.kind === "upload" && !avatar.blob && shownAvatar.kind !== "image";
  const canSave =
    dirty && !pending && !!name.trim() && handleOk && !uploadMissing;

  const save = async () => {
    if (!me || !avatar) return;
    const form = new FormData();
    form.set("name", name.trim());
    form.set("handle", normalizeHandle(handle));
    form.set("quote", quote);
    form.set("accent", accent ?? "");
    if (cover.kind === "upload") {
      form.set("banner", "upload");
      form.set("bannerImage", cover.blob, "banner.webp");
    } else if (cover.kind === "preset") {
      form.set("banner", `preset:${cover.id}`);
    } else {
      form.set("banner", cover.kind);
    }
    form.set("about", JSON.stringify(about));
    form.set(
      "showcase",
      JSON.stringify(
        showcase.map(({ characterId, caption }) => ({ characterId, caption })),
      ),
    );
    form.set("privacy", JSON.stringify(privacy));
    form.set("color", avatar.color);
    if (avatar.kind === "upload" && avatar.blob) {
      form.set("avatar", "upload");
      form.set("image", avatar.blob, "avatar.webp");
    } else if (avatar.kind === "critter") {
      form.set("avatar", "critter");
      form.set("seed", avatar.seed);
    } else {
      form.set("avatar", avatar.kind === "upload" ? "keep" : avatar.kind);
    }
    const r = await run(() => saveProfile(form));
    if (!r.ok) return;
    setMe(r.data);
    toast(t("saved"));
    const next = r.data.handle ?? view.handle;
    await client.invalidateQueries({ queryKey: profileKey(view.handle) });
    void client.invalidateQueries({ queryKey: ["player-card", view.id] });
    if (next !== view.handle) router.replace(profilePath(next));
    else onClose();
  };

  const handleNote = (() => {
    if ("kind" in handleState)
      return handleState.kind === "checking"
        ? { tone: "muted", text: t("handleStatus.checking") }
        : { tone: "muted", text: `/u/${view.handle}` };
    if (handleState.ok) return { tone: "yes", text: t("handleStatus.ok") };
    if (handleState.problem === "wait")
      return {
        tone: "no",
        text: t("handleStatus.wait", {
          date: format.dateTime(handleState.until ?? 0, {
            day: "numeric",
            month: "short",
          }),
        }),
      };
    return { tone: "no", text: t(`handleStatus.${handleState.problem}`) };
  })();

  const field =
    "h-11 w-full rounded-lg border-[1.5px] border-line-strong bg-surface px-3.5 font-semibold outline-none transition-colors focus-visible:border-sky";

  return (
    <div style={accentStyle(accent)} className="flex flex-col">
      <ProfileCover
        banner={shownBanner}
        avatarColor={shownAvatar.color}
        accent={accent}
        mode={mode}
        slot={coverSlot}
      >
        <CoverPicker avatarColor={shownAvatar.color} onPick={setCover} />
      </ProfileCover>
      <div className={cn("flex flex-col", FRAME[mode].root)}>
        <div
          className={cn(
            "relative grid items-start gap-x-4 gap-y-3 px-(--pad) sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-5",
            FRAME[mode].overlap,
          )}
        >
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            aria-label={t("changeAvatar")}
            className="group relative justify-self-start rounded-pill bg-canvas p-[5px] shadow-[0_0_0_2px_var(--canvas)]"
          >
            <Avatar
              avatar={shownAvatar}
              className="size-20 text-[32px] sm:size-28 sm:text-[44px]"
            />
            <span className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-pill bg-ink text-on-ink shadow-card transition-transform duration-150 group-hover:scale-110">
              <Pencil className="size-4" strokeWidth={2} />
            </span>
          </button>
          {/* under the cover: its picture would hide the labels */}
          <div
            className={cn(
              "grid min-w-0 gap-3 sm:grid-cols-2",
              FRAME[mode].belowCover,
            )}
          >
            <label className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-[13px] text-ink-muted">
                {t("name")}
              </span>
              <input
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
                className={cn(field, "font-display text-lg")}
              />
              <span className="text-[12px] text-ink-muted">
                {name.trim().length}/{MAX_NAME}
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold text-[13px] text-ink-muted">
                {t("handle")}
              </span>
              <span className="relative flex">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-ink-muted">
                  @
                </span>
                <input
                  value={handle}
                  maxLength={HANDLE_MAX + 1}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  onChange={(e) =>
                    setHandle(e.target.value.replace(/\s/g, "").toLowerCase())
                  }
                  aria-invalid={"ok" in handleState && !handleState.ok}
                  className={cn(
                    field,
                    "pl-8 font-medium font-mono aria-invalid:border-no",
                  )}
                />
              </span>
              <span
                aria-live="polite"
                className={cn(
                  "truncate text-[12px]",
                  handleNote.tone === "yes"
                    ? "font-semibold text-yes"
                    : handleNote.tone === "no"
                      ? "font-semibold text-no"
                      : "font-mono text-ink-muted",
                )}
              >
                {handleNote.text}
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-(--pad) pt-6 pb-4">
          <Card title={t("quote")} icon={<Quote strokeWidth={1.75} />}>
            <div className="flex flex-col gap-1">
              <textarea
                value={quote}
                rows={2}
                maxLength={QUOTE_MAX}
                placeholder={t("quotePlaceholder")}
                onChange={(e) => setQuote(e.target.value.replace(/\n/g, " "))}
                aria-label={t("quote")}
                className="w-full resize-none rounded-lg border-[1.5px] border-line-strong bg-surface px-3.5 py-2.5 font-medium text-[17px] outline-none focus-visible:border-sky"
              />
              <span className="self-end font-mono text-[12px] text-ink-muted">
                {quote.length} / {QUOTE_MAX}
              </span>
            </div>
          </Card>

          <Card
            title={t("showcase")}
            icon={<Sparkles strokeWidth={1.75} />}
            end={<Hint>{t("showcaseHint")}</Hint>}
          >
            <div className="flex flex-wrap justify-center gap-6 pt-1 pb-2 sm:justify-start">
              {Array.from({ length: SHOWCASE_MAX }, (_, i) => {
                const item = showcase[i];
                if (!item)
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: the slots are fixed
                      key={i}
                      type="button"
                      disabled={i > showcase.length}
                      onClick={() => setPicking(i)}
                      className="flex h-[188px] w-[116px] flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-line-strong border-dashed px-2 text-center font-semibold text-[13px] text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink disabled:opacity-40"
                    >
                      <Plus className="size-5" strokeWidth={2} />
                      {t("pick")}
                    </button>
                  );
                return (
                  <ShowcaseCard
                    key={item.characterId}
                    item={item}
                    index={i}
                    className="w-[132px]"
                  >
                    <textarea
                      value={item.caption}
                      rows={3}
                      maxLength={CAPTION_MAX}
                      placeholder={t("captionPlaceholder")}
                      aria-label={t("caption", {
                        name: item.character?.name ?? "?",
                      })}
                      onChange={(e) =>
                        setShowcase((all) =>
                          all.map((s, j) =>
                            j === i
                              ? {
                                  ...s,
                                  caption: e.target.value.replace(/\n/g, " "),
                                }
                              : s,
                          ),
                        )
                      }
                      className="mt-3 w-full resize-none rounded-xl border-[1.5px] border-line-strong bg-surface px-2 py-1.5 font-semibold text-[12.5px] outline-none focus-visible:border-sky"
                      style={{ rotate: "0deg" }}
                    />
                    <span className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPicking(i)}
                        className="rounded-pill px-2 py-1 font-semibold text-[12px] text-ink-muted hover:bg-sunken hover:text-ink"
                      >
                        {t("swap")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setShowcase((all) => all.filter((_, j) => j !== i))
                        }
                        className="rounded-pill px-2 py-1 font-semibold text-[12px] text-ink-muted hover:bg-no-soft hover:text-no"
                      >
                        {t("remove")}
                      </button>
                    </span>
                  </ShowcaseCard>
                );
              })}
            </div>
          </Card>

          <Card
            title={t("about")}
            icon={<MoonStar strokeWidth={1.75} />}
            end={<Hint>{t("aboutHint")}</Hint>}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-sm">{t("time")}</span>
                <ChoiceGroup label={t("time")} className="flex-wrap self-start">
                  {[null, ...PLAY_TIMES].map((time) => (
                    <button
                      key={time ?? "none"}
                      type="button"
                      aria-pressed={about.time === time}
                      onClick={() => setAbout((a) => ({ ...a, time }))}
                      className={cn(
                        "h-9 rounded-pill px-4 font-semibold text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft",
                        about.time === time
                          ? "bg-surface text-ink shadow-card"
                          : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {time ? t(`timeShort.${time}`) : t("timeNone")}
                    </button>
                  ))}
                </ChoiceGroup>
              </div>
              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <Languages className="size-4" strokeWidth={1.75} />
                  {t("langs")}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {LANGS.map((l) => {
                    const on = about.langs.includes(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setAbout((a) => ({
                            ...a,
                            langs: LANGS.filter((x) =>
                              x === l ? !on : a.langs.includes(x),
                            ),
                          }))
                        }
                        className={cn(
                          "inline-flex h-10 items-center gap-2 rounded-pill border-[1.5px] px-3.5 font-semibold text-sm transition-colors duration-150",
                          on
                            ? "border-ink bg-surface"
                            : "border-line text-ink-muted hover:border-line-strong",
                        )}
                      >
                        <Flag lang={l} />
                        {tc(`languages.${l}`)}
                      </button>
                    );
                  })}
                </div>
                {about.langs.length ? (
                  <span className="text-[13px] text-ink-muted">
                    {langList(about.langs)}
                  </span>
                ) : null}
              </fieldset>
            </div>
          </Card>

          <Card
            title={t("accent")}
            icon={<Palette strokeWidth={1.75} />}
            end={<Hint>{t("accentHint")}</Hint>}
          >
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((c, i) => (
                <Swatch
                  key={c}
                  color={c}
                  pressed={(accent ?? ACCENTS[0]) === c}
                  label={t("accentN", { n: i + 1 })}
                  onClick={() => setAccent(i === 0 ? null : c)}
                />
              ))}
            </div>
          </Card>

          <Card
            title={t("privacy")}
            icon={<Eye strokeWidth={1.75} />}
            end={<Hint>{t("privacyHint")}</Hint>}
          >
            <div className="flex flex-col">
              {PRIVACY_KEYS.map((key) => (
                <PrivacyRow
                  key={key}
                  label={t(`privacyRows.${key}`)}
                  hint={
                    key === "profile" || key === "activity"
                      ? t(`privacyHints.${key}`)
                      : undefined
                  }
                >
                  <AudienceSelect
                    label={t(`privacyRows.${key}`)}
                    value={privacy[key]}
                    onChange={(v) => setPrivacy((p) => ({ ...p, [key]: v }))}
                  />
                </PrivacyRow>
              ))}
              <PrivacyRow
                label={t("privacyRows.playing")}
                hint={t("privacyHints.playing")}
              >
                <Switch
                  aria-label={t("privacyRows.playing")}
                  checked={privacy.playing}
                  onCheckedChange={(playing) =>
                    setPrivacy((p) => ({ ...p, playing }))
                  }
                />
              </PrivacyRow>
            </div>
          </Card>
        </div>

        {/* stays at the bottom of what scrolls: the page, or the modal */}
        <div className="sticky bottom-0 z-20 mt-2 flex flex-wrap items-center justify-end gap-2.5 border-line border-t bg-surface px-4 py-3 sm:px-6">
          <span
            className={cn(
              "mr-auto inline-flex items-center gap-2 font-semibold text-ink-muted text-sm",
              // on phones it gives its room back to the buttons
              !dirty && "invisible max-sm:hidden",
            )}
          >
            <span className="size-2 rounded-pill bg-apricot" />
            {t("unsaved")}
          </span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!canSave}
            onClick={save}
          >
            {t("save")}
          </Button>
        </div>
      </div>

      {me && avatar ? (
        <AvatarDialog
          open={avatarOpen}
          onOpenChange={setAvatarOpen}
          me={me}
          draft={avatar}
          onChange={setAvatar}
        />
      ) : null}
      <CharacterSearch
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        taken={showcase.map((s) => s.character?.id ?? s.characterId)}
        onPick={(character) =>
          setShowcase((all) => {
            const at = picking ?? all.length;
            const item = {
              characterId: character.id,
              caption: all[at]?.caption ?? "",
              character,
            };
            const next = [...all];
            next[at] = item;
            return next.filter(Boolean).slice(0, SHOWCASE_MAX);
          })
        }
      />
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="text-[13px] text-ink-muted">{children}</span>;
}

function PrivacyRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-line border-t py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex min-w-44 flex-1 flex-col">
        <span className="font-semibold text-[15px]">{label}</span>
        {hint ? (
          <span className="text-[13px] text-ink-muted">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Who sees a part: everyone, people who played with you, friends (soon), only you. */
function AudienceSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Audience;
  onChange: (v: Audience) => void;
}) {
  const t = useTranslations("player.editor.audiences");
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as Audience)}
        className="h-10 appearance-none rounded-pill border-[1.5px] border-line-strong bg-surface pr-9 pl-4 font-semibold text-sm outline-none focus-visible:border-sky"
      >
        {AUDIENCES.map((a) => (
          <option key={a} value={a} disabled={a === "friends"}>
            {t(a)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        strokeWidth={2}
      />
    </span>
  );
}
