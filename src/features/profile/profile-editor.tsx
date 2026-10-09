"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Eye,
  ImageIcon,
  Languages,
  MoonStar,
  Palette,
  Plus,
  Search,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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
  AUDIENCES,
  type Audience,
  type Banner,
  CAPTION_MAX,
  PLAY_TIMES,
  PRIVACY_KEYS,
  type Privacy,
  QUOTE_MAX,
  SHOWCASE_MAX,
  TINTS,
  type Tint,
} from "@/game/profile/profile";
import { LANGS, MAX_NAME } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { checkHandle, saveProfile } from "@/server/actions";
import type { ProfileView, ShowcaseView } from "@/server/contract";
import type { HandleCheck } from "@/server/profile-edit";
import { Card } from "./activity";
import { accentStyle, tintColor } from "./cover-paint";
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
import { LevelAvatar } from "./level";
import {
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
  const t = useTranslations("profile.editor");
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
  const [accent, setAccent] = useState<Tint | null>(view.accent);
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
      : cover.kind === "pattern"
        ? { kind: "pattern", pattern: cover.pattern, tint: cover.tint }
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

  // each part as text, so the save bar can count what changed
  const parts: Record<string, string> = {
    name: name.trim(),
    handle: normalizeHandle(handle),
    quote: quote.trim(),
    accent: accent ?? "",
    cover:
      cover.kind === "pattern" ? `${cover.pattern}:${cover.tint}` : cover.kind,
    avatar: JSON.stringify(avatar),
    about: JSON.stringify(about),
    showcase: JSON.stringify(showcase.map((s) => [s.characterId, s.caption])),
    privacy: JSON.stringify(privacy),
  };
  const [initial] = useState(parts);
  const changes = Object.keys(parts).filter(
    (k) => parts[k] !== initial[k],
  ).length;
  const dirty = changes > 0;
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
    } else if (cover.kind === "pattern") {
      form.set("banner", `pattern:${cover.pattern}:${cover.tint}`);
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
    } else if (avatar.kind === "creature") {
      form.set("avatar", "creature");
      form.set("dna", avatar.dna);
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

  return (
    <div
      style={accentStyle(accent, shownAvatar.color)}
      className="flex flex-col"
    >
      <ProfileCover
        banner={shownBanner}
        avatarColor={shownAvatar.color}
        accent={accent}
        mode={mode}
        slot={coverSlot}
      >
        <CoverPicker
          banner={shownBanner}
          avatarColor={shownAvatar.color}
          onPick={setCover}
        />
      </ProfileCover>
      <div className={cn("flex flex-col", FRAME[mode].root)}>
        {/* the profile's own header, its name and @handle as fields */}
        <div
          className={cn(
            "relative grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 gap-y-3 px-(--pad) sm:gap-x-5",
            FRAME[mode].overlap,
          )}
        >
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            aria-label={t("changeAvatar")}
            className="group relative justify-self-start rounded-pill"
          >
            <LevelAvatar
              avatar={shownAvatar}
              xp={view.xp}
              stroke={5}
              tag="none"
              avatarClass="size-22 text-[34px] sm:size-28 sm:text-[44px]"
            />
            <span className="absolute inset-[7px] flex items-center justify-center rounded-pill bg-[rgb(18_22_31/0.45)] text-white transition-colors duration-150 group-hover:bg-[rgb(18_22_31/0.6)]">
              <ImageIcon className="size-7" strokeWidth={1.75} />
            </span>
          </button>
          <div className="flex min-w-0 flex-wrap items-start gap-x-3.5 gap-y-2.5 pb-1 max-sm:col-span-2">
            <label className="flex w-60 max-w-full flex-col gap-1">
              <input
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
                aria-label={t("name")}
                className={cn(
                  FIELD,
                  "h-[54px] px-3 font-display font-extrabold text-[30px] tracking-[-0.02em] sm:text-[34px]",
                )}
              />
              <span
                className={cn(
                  "pl-1 text-[12.5px]",
                  name.trim()
                    ? "font-semibold text-yes"
                    : "font-semibold text-no",
                )}
              >
                {name.trim().length}/{MAX_NAME}
              </span>
            </label>
            <label className="flex w-[230px] max-w-full flex-col gap-1">
              <span
                className={cn(
                  FIELD,
                  "flex h-[54px] items-center px-3 font-medium font-mono text-[18px] focus-within:border-sky focus-within:shadow-[0_0_0_3px_var(--sky-soft)]",
                  "ok" in handleState && !handleState.ok && "border-no",
                )}
              >
                <span className="text-ink-muted">@</span>
                <input
                  value={handle}
                  maxLength={HANDLE_MAX + 1}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  aria-label={t("handle")}
                  onChange={(e) =>
                    setHandle(e.target.value.replace(/\s/g, "").toLowerCase())
                  }
                  aria-invalid={"ok" in handleState && !handleState.ok}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </span>
              <span
                aria-live="polite"
                className={cn(
                  "truncate pl-1 text-[12.5px]",
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

        {/* what the profile shows under its name, each part in place */}
        <div className="grid gap-x-8 gap-y-3.5 px-(--pad) pt-[18px] md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="flex w-full max-w-[560px] flex-col gap-1">
              <textarea
                value={quote}
                rows={2}
                maxLength={QUOTE_MAX}
                placeholder={t("quotePlaceholder")}
                onChange={(e) => setQuote(e.target.value.replace(/\n/g, " "))}
                aria-label={t("quote")}
                className="w-full resize-none rounded-[16px] border-[1.5px] border-line-strong bg-surface px-3.5 py-2.5 font-medium text-[17px] leading-snug outline-none focus-visible:border-sky focus-visible:shadow-[0_0_0_3px_var(--sky-soft)]"
              />
              <span className="self-end font-mono text-[12px] text-ink-muted">
                {quote.length} / {QUOTE_MAX}
              </span>
            </div>

            <div className="flex max-w-[640px] flex-col gap-2.5 rounded-[18px] bg-surface px-4 py-3.5">
              <AboutRow icon={<MoonStar />} label={t("time")}>
                <ChoiceGroup label={t("time")} className="flex-wrap">
                  {[null, ...PLAY_TIMES].map((time) => (
                    <button
                      key={time ?? "none"}
                      type="button"
                      aria-pressed={about.time === time}
                      onClick={() => setAbout((a) => ({ ...a, time }))}
                      className={cn(
                        "h-[30px] rounded-pill px-3 font-semibold text-[13px] transition-[background-color,color,box-shadow] duration-200 ease-soft",
                        about.time === time
                          ? "bg-surface text-ink shadow-card"
                          : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {time ? t(`timeShort.${time}`) : t("timeNone")}
                    </button>
                  ))}
                </ChoiceGroup>
              </AboutRow>
              <AboutRow icon={<Languages />} label={t("langs")}>
                <div className="flex flex-wrap gap-1.5">
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
                          "inline-flex h-[34px] items-center gap-2 rounded-pill border-[1.5px] bg-surface pr-3 pl-2 font-semibold text-[13px] transition-colors duration-150",
                          on
                            ? "border-ink text-ink"
                            : "border-line text-ink-muted hover:border-line-strong",
                        )}
                      >
                        <Flag lang={l} className="size-[18px]" />
                        {tc(`languages.${l}`)}
                      </button>
                    );
                  })}
                </div>
              </AboutRow>
              <AboutRow icon={<Palette />} label={t("accent")}>
                <div className="flex flex-wrap gap-2">
                  {TINTS.map((k) => (
                    <Swatch
                      key={k}
                      color={tintColor(k, shownAvatar.color)}
                      pressed={(accent ?? "sky") === k}
                      label={t(`tints.${k}`)}
                      onClick={() => setAccent(k === "sky" ? null : k)}
                    />
                  ))}
                </div>
              </AboutRow>
              <span className="font-medium text-[12.5px] text-ink-muted">
                {t("aboutHint")}
                {about.langs.length ? ` · ${langList(about.langs)}` : null}
              </span>
            </div>
          </div>

          {/* the showcase where it shows, upright, its line under each card */}
          <div className="relative flex min-w-0 flex-col gap-2 max-md:items-center">
            <div className="flex items-center gap-2 self-end max-md:self-center">
              <span className="text-[12.5px] text-ink-muted">
                {t("showcaseHint")}
              </span>
              <AudienceSelect
                label={t("privacyRows.showcase")}
                value={privacy.showcase}
                onChange={(v) => setPrivacy((p) => ({ ...p, showcase: v }))}
                small
              />
            </div>
            <div className="flex max-w-full justify-end gap-[18px] overflow-x-auto px-1 pt-1 pb-1.5">
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
                      className="flex h-[188px] w-[116px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-line-strong border-dashed px-2 text-center font-semibold text-[13px] text-ink-muted transition-colors duration-150 hover:border-ink hover:text-ink disabled:opacity-40"
                    >
                      <Plus className="size-5" strokeWidth={2} />
                      {t("pick")}
                    </button>
                  );
                return (
                  <div key={item.characterId} className="relative shrink-0">
                    <ShowcaseCard item={item} index={i} still>
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
                        className="mt-2.5 w-full resize-none rounded-[12px] border-[1.5px] border-line-strong bg-surface px-2 py-1.5 font-display font-semibold text-[12.5px] leading-snug outline-none focus-visible:border-sky"
                      />
                    </ShowcaseCard>
                    {/* over the picture: swap it, or take the card out */}
                    <span className="absolute top-[38%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPicking(i)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-surface px-2.5 font-semibold text-[12px] shadow-pop transition-colors duration-150 hover:bg-sunken"
                      >
                        <Search className="size-3.5" strokeWidth={2} />
                        {t("swap")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setShowcase((all) => all.filter((_, j) => j !== i))
                        }
                        className="inline-flex h-7 items-center rounded-pill bg-surface/90 px-2.5 font-semibold text-[12px] text-ink-muted shadow-card transition-colors duration-150 hover:bg-no-soft hover:text-no"
                      >
                        {t("remove")}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* who sees what, one row per part */}
        <div className="px-(--pad) pt-6 pb-4">
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
      </div>
      {/* the whole width at the bottom: of the window on the page (its content
          lines up with the page's), of what scrolls in the modal */}
      {mode === "page" ? <div aria-hidden="true" className="h-16" /> : null}
      <div
        className={cn(
          "bottom-0 z-20 border-line border-t bg-surface py-3",
          mode === "page"
            ? "fixed inset-x-0 px-4 sm:px-8"
            : "sticky mt-2 px-4 sm:px-6",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2.5",
            mode === "page" && "mx-auto w-full max-w-page",
          )}
        >
          <span
            className={cn(
              "mr-auto inline-flex items-center gap-2 font-semibold text-ink-muted text-sm",
              // on phones it gives its room back to the buttons
              !dirty && "invisible max-sm:hidden",
            )}
          >
            <span className="size-2 rounded-pill bg-apricot" />
            {t("unsaved", { n: changes })}
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

/**
 * Who sees a part: everyone, people who played with you, friends (soon), only
 * you. `small`: the chip beside a part (an eye before it).
 */
function AudienceSelect({
  label,
  value,
  onChange,
  small = false,
}: {
  label: string;
  value: Audience;
  onChange: (v: Audience) => void;
  small?: boolean;
}) {
  const t = useTranslations("profile.editor.audiences");
  return (
    <span className="relative inline-flex">
      {small ? (
        <Eye
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-muted"
          strokeWidth={2}
        />
      ) : null}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as Audience)}
        className={cn(
          "appearance-none rounded-pill border-[1.5px] border-line-strong font-semibold outline-none focus-visible:border-sky",
          small
            ? cn(
                "h-7 pr-7 pl-7 text-[12.5px]",
                value === "me" ? "bg-sunken" : "bg-surface",
              )
            : "h-10 bg-surface pr-9 pl-4 text-sm",
        )}
      >
        {AUDIENCES.map((a) => (
          <option key={a} value={a} disabled={a === "friends"}>
            {t(a)}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted",
          small ? "right-2 size-3.5" : "right-3 size-4",
        )}
        strokeWidth={2}
      />
    </span>
  );
}

/** A text field's frame, the same on the name and the @handle. */
const FIELD =
  "w-full rounded-[14px] border-[1.5px] border-line-strong bg-surface outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-sky focus-visible:shadow-[0_0_0_3px_var(--sky-soft)]";

/** One line of "about you": its label on the left, its choices beside it. */
function AboutRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex min-w-[190px] items-center gap-2 font-semibold text-sm [&_svg]:size-4 [&_svg]:stroke-[1.75]">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}
