"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Check,
  Dices,
  ImageIcon,
  Search,
  Upload,
  UserRoundPen,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { PROVIDER_NAME } from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { ImageDrop } from "@/components/ui/image-drop";
import { Portrait } from "@/components/ui/portrait";
import { thumbUrl } from "@/game/character-search";
import {
  type Banner,
  DEFAULT_COVER,
  PATTERNS,
  type Pattern,
  TINTS,
  type Tint,
} from "@/game/profile/profile";
import type { Avatar as AvatarData } from "@/game/types";
import { randomDna } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import {
  AVATAR_COLORS,
  type CharacterDTO,
  type CharacterSearchResponse,
  type Me,
} from "@/server/contract";
import { CoverPaint, tintColor } from "./cover-paint";

/** The cover the editor will save: as it is, a pattern in a colour, or a picture just picked. */
export type CoverChoice =
  | { kind: "keep" }
  | { kind: "pattern"; pattern: Pattern; tint: Tint }
  | { kind: "upload"; blob: Blob; url: string };

/**
 * "Change cover": a pattern and a colour (the avatar's or the palette's),
 * each shown at once on the cover, or a picture (cropped 10:3).
 */
export function CoverPicker({
  banner,
  avatarColor,
  onPick,
}: {
  banner: Banner | null;
  avatarColor: string;
  onPick: (choice: CoverChoice) => void;
}) {
  const t = useTranslations("profile.editor");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const image = banner?.kind === "image";
  const { pattern, tint } = banner?.kind === "pattern" ? banner : DEFAULT_COVER;
  const label = "px-0.5 font-semibold text-[13px] text-ink-muted";
  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="inline-flex h-9 items-center gap-2 rounded-pill bg-surface/85 px-4 font-semibold text-sm shadow-card backdrop-blur-md transition-colors duration-150 hover:bg-surface [&_svg]:size-4">
          <ImageIcon strokeWidth={1.75} />
          {t("changeCover")}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-[60]"
          >
            <Popover.Popup className="flex w-[min(352px,calc(100vw-1.5rem))] origin-[var(--transform-origin)] flex-col gap-3 rounded-xl bg-surface p-4 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
              <Popover.Title className="m-0 font-bold font-display text-[17px]">
                {t("cover")}
              </Popover.Title>
              <span className={label}>{t("pattern")}</span>
              <div className="grid grid-cols-4 gap-2">
                {PATTERNS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={!image && p === pattern}
                    aria-label={t(`patterns.${p}`)}
                    title={t(`patterns.${p}`)}
                    onClick={() =>
                      onPick({ kind: "pattern", pattern: p, tint })
                    }
                    className={cn(
                      "relative h-12 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--line)] transition-shadow duration-200",
                      !image &&
                        p === pattern &&
                        "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]",
                    )}
                  >
                    <CoverPaint
                      banner={{ kind: "pattern", pattern: p, tint }}
                      avatarColor={avatarColor}
                    />
                  </button>
                ))}
              </div>
              <span className={cn(label, "mt-1")}>{t("colour")}</span>
              <div className="flex flex-wrap gap-2">
                {TINTS.map((k) => (
                  <Swatch
                    key={k}
                    color={tintColor(k, avatarColor)}
                    pressed={!image && k === tint}
                    label={t(`tints.${k}`)}
                    onClick={() =>
                      onPick({ kind: "pattern", pattern, tint: k })
                    }
                  />
                ))}
              </div>
              <div className="mt-1 border-line border-t pt-3">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    setUploading(true);
                  }}
                >
                  <Upload strokeWidth={1.75} />
                  {t("uploadCover")}
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Modal
        open={uploading}
        onOpenChange={setUploading}
        title={t("coverTitle")}
        icon={<ImageIcon strokeWidth={1.75} />}
        size="compact"
      >
        <div className="overflow-y-auto p-5">
          <ImageDrop
            shape="banner"
            onDone={(blob) => {
              onPick({ kind: "upload", blob, url: URL.createObjectURL(blob) });
              setUploading(false);
            }}
          />
        </div>
      </Modal>
    </>
  );
}

/** The avatar the editor will save. */
export interface AvatarDraft {
  kind: "provider" | "upload" | "creature";
  color: string;
  dna: string;
  /** A picture just picked (an upload kept from before has none). */
  blob: Blob | null;
}

export function initialAvatar(me: Me): AvatarDraft {
  const a = me.avatar;
  return {
    kind:
      a.kind !== "image"
        ? "creature"
        : a.url === me.providerAvatarUrl
          ? "provider"
          : "upload",
    color: a.color,
    dna: a.kind === "creature" ? a.dna : randomDna(),
    blob: null,
  };
}

/** What a draft looks like, for the previews; `blobUrl` is the new picture's. */
export function avatarOf(
  draft: AvatarDraft,
  me: Me,
  blobUrl: string | null,
): AvatarData {
  const kept =
    me.avatar.kind === "image" && me.avatar.url !== me.providerAvatarUrl
      ? me.avatar.url
      : null;
  if (draft.kind === "provider" && me.providerAvatarUrl)
    return { kind: "image", url: me.providerAvatarUrl, color: draft.color };
  const upload = blobUrl ?? kept;
  if (draft.kind === "upload" && upload)
    return { kind: "image", url: upload, color: draft.color };
  return { kind: "creature", dna: draft.dna, color: draft.color };
}

/** The avatar's box: the provider's picture, an upload or a creature, and a colour for the creature. */
export function AvatarDialog({
  open,
  onOpenChange,
  me,
  draft,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: Me;
  draft: AvatarDraft;
  onChange: (draft: AvatarDraft) => void;
}) {
  const t = useTranslations("profile");
  const te = useTranslations("profile.editor");
  const blobUrl = useMemo(
    () => (draft.blob ? URL.createObjectURL(draft.blob) : null),
    [draft.blob],
  );
  useEffect(
    () => () => void (blobUrl && URL.revokeObjectURL(blobUrl)),
    [blobUrl],
  );
  const set = (change: Partial<AvatarDraft>) =>
    onChange({ ...draft, ...change });
  const { color, dna } = draft;
  const uploadUrl =
    blobUrl ??
    (me.avatar.kind === "image" && me.avatar.url !== me.providerAvatarUrl
      ? me.avatar.url
      : null);
  // the random pastel a guest started with stays available next to the palette
  const swatches: readonly string[] = (
    AVATAR_COLORS as readonly string[]
  ).includes(me.avatar.color)
    ? AVATAR_COLORS
    : [me.avatar.color, ...AVATAR_COLORS];
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={te("avatarTitle")}
      icon={<UserRoundPen strokeWidth={1.75} />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3">
          {me.provider && me.providerAvatarUrl ? (
            <Tile
              pressed={draft.kind === "provider"}
              onClick={() => set({ kind: "provider" })}
              label={t("providerPhoto", {
                provider: PROVIDER_NAME[me.provider],
              })}
            >
              <Avatar
                avatar={{ kind: "image", url: me.providerAvatarUrl, color }}
                size={64}
              />
            </Tile>
          ) : null}
          <Tile
            pressed={draft.kind === "upload"}
            onClick={() => set({ kind: "upload" })}
            label={t("upload")}
          >
            {uploadUrl ? (
              <Avatar
                avatar={{ kind: "image", url: uploadUrl, color }}
                size={64}
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-pill border-[1.5px] border-line-strong border-dashed text-ink-muted">
                <Upload className="size-6" strokeWidth={1.75} />
              </span>
            )}
          </Tile>
          <Tile
            pressed={draft.kind === "creature"}
            onClick={() => set({ kind: "creature" })}
            label={t("creature")}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={dna}
                initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 12 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                className="flex"
              >
                <Avatar avatar={{ kind: "creature", dna, color }} size={64} />
              </m.span>
            </AnimatePresence>
          </Tile>
        </div>
        <Button
          size="sm"
          className="self-start"
          onClick={() => set({ kind: "creature", dna: randomDna() })}
        >
          <Dices strokeWidth={1.75} />
          {t("shuffle")}
        </Button>
        {draft.kind === "upload" ? (
          <ImageDrop shape="square" onChange={(blob) => set({ blob })} />
        ) : null}
        {draft.kind === "creature" ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 font-semibold text-sm">{t("color")}</legend>
            <div className="flex flex-wrap gap-2.5">
              {swatches.map((c, i) => (
                <Swatch
                  key={c}
                  color={c}
                  pressed={c === color}
                  label={t("colorN", { n: i + 1 })}
                  onClick={() => set({ color: c })}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          className="mt-auto self-end"
          onClick={() => onOpenChange(false)}
        >
          {te("done")}
        </Button>
      </div>
    </Modal>
  );
}

/** A colour to pick: a round swatch, ringed when it is the one. */
export function Swatch({
  color,
  pressed,
  label,
  onClick,
}: {
  color: string;
  pressed: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={cn(
        "flex size-[34px] items-center justify-center rounded-pill text-on-avatar shadow-[0_0_0_1px_var(--line)] transition-shadow duration-200",
        pressed && "shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ink)]",
      )}
    >
      {pressed ? (
        <Check
          className="size-4 text-white mix-blend-difference"
          strokeWidth={2.5}
        />
      ) : null}
    </button>
  );
}

function Tile({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 bg-canvas px-3 py-4 font-semibold text-sm transition-[border-color,transform] duration-200 ease-soft hover:-translate-y-px",
        pressed ? "border-sky" : "border-transparent",
      )}
    >
      {children}
      <span className="text-center">{label}</span>
    </button>
  );
}

/** A character for the showcase: type a name, pick one of the library's (or the players'). */
export function CharacterSearch({
  open,
  onOpenChange,
  taken,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already on the showcase: left out. */
  taken: string[];
  onPick: (character: CharacterDTO) => void;
}) {
  const t = useTranslations("profile.editor");
  const lang = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CharacterDTO[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const stop = new AbortController();
    const wait = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/characters?q=${encodeURIComponent(q)}&lang=${lang}`,
          { signal: stop.signal },
        );
        if (!res.ok) return;
        const body = (await res.json()) as CharacterSearchResponse;
        setResults(body.results);
      } catch {
        // aborted by the next keystroke, or offline: the list stays
      }
    }, 200);
    return () => {
      stop.abort();
      window.clearTimeout(wait);
    };
  }, [query, lang]);
  const shown = (results ?? []).filter((c) => !taken.includes(c.id));
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("search")}
      icon={<Search strokeWidth={1.75} />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5 sm:p-6">
        <input
          // biome-ignore lint/a11y/noAutofocus: the box opens to type a name
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="h-12 w-full shrink-0 rounded-lg border-[1.5px] border-line-strong bg-surface px-4 font-medium outline-none focus-visible:border-sky"
        />
        <ul className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {results && shown.length === 0 ? (
            <li className="px-2 py-4 text-ink-muted text-sm">
              {t("noResults")}
            </li>
          ) : null}
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(c);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-sunken"
              >
                <span className="w-10 shrink-0">
                  <Portrait
                    src={thumbUrl(c.imageUrl, 80)}
                    className="rounded-sm"
                  />
                </span>
                <span className="flex min-w-0 flex-col">
                  <b className="truncate font-semibold">{c.name}</b>
                  {c.origin ? (
                    <span className="truncate text-[13px] text-ink-muted">
                      {c.origin}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
