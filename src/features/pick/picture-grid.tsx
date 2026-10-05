"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag, Hourglass, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Portrait } from "@/components/ui/portrait";
import { thumbUrl } from "@/game/character-search";
import { cn } from "@/lib/cn";
import { useDisplayName } from "@/lib/names";
import {
  fetchPictures,
  picturesKey,
  reportPicture,
  type TrayPicture,
} from "./draft-api";

const chip =
  "absolute flex size-6 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ink)_82%,transparent)] text-on-ink backdrop-blur-[6px]";

/** A character's pictures for the tray, asked for when the tray opens. */
export function useCharacterPictures(characterId: string | null) {
  const lang = useLocale();
  return useQuery({
    queryKey: picturesKey(characterId ?? ""),
    queryFn: () => fetchPictures(characterId as string, lang),
    enabled: characterId !== null,
    staleTime: 30_000,
  });
}

/**
 * The tray of a library character: send your own first, then its pictures,
 * best first (the main one leads), each with who sent it. A tap puts one on
 * the card for this match. Another player's picture can be reported: it
 * leaves this tray at once, and everyone's once enough people did.
 */
export function PictureGrid({
  characterId,
  cover,
  current,
  onPick,
  onUpload,
  uploadHint,
}: {
  characterId: string;
  /** The character's main picture, for a card whose picture was just reported. */
  cover: string | null;
  /** The picture the card shows now. */
  current: string | null;
  onPick: (url: string | null) => void;
  onUpload: () => void;
  uploadHint: string;
}) {
  const t = useTranslations("pickCard");
  const name = useDisplayName();
  const pictures = useCharacterPictures(characterId);
  const [reported, setReported] = useState<ReadonlySet<string>>(new Set());
  const list = (pictures.data ?? []).filter((p) => !reported.has(p.id));

  const report = (p: TrayPicture) => {
    setReported((old) => new Set(old).add(p.id));
    void reportPicture(p.id);
    if (p.url === current) onPick(cover);
  };

  return (
    <div className="grid max-h-[272px] grid-cols-[repeat(3,4rem)] gap-2 overflow-y-auto overscroll-contain p-[6px]">
      <button
        type="button"
        onClick={onUpload}
        title={uploadHint}
        className="flex aspect-[4/5] w-16 flex-col items-center justify-center gap-0.5 rounded-[12px] border-2 border-line-strong border-dashed px-1 text-center font-bold text-[11px] text-ink-muted leading-[1.15]"
      >
        <Upload className="size-5" aria-hidden />
        <span>{t("upload")}</span>
      </button>
      {list.map((p) => {
        const by = p.author
          ? t("sentBy", { name: name(p.author, p.mine) })
          : t("libraryPicture");
        const label = p.pending ? `${by} · ${t("pendingPicture")}` : by;
        const on = p.url === current;
        return (
          <div key={p.id} className="group/pic relative w-16">
            <button
              type="button"
              aria-pressed={on}
              aria-label={label}
              title={label}
              onClick={() => onPick(p.url === cover ? null : p.url)}
              className={cn(
                "block w-16 rounded-[12px]",
                on && "shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--sky)]",
                p.pending && "opacity-70",
              )}
            >
              <Portrait
                src={thumbUrl(p.url, 160)}
                className="rounded-[12px] text-line"
              />
            </button>
            {p.author ? (
              <Avatar
                avatar={p.author.avatar}
                size={18}
                className="pointer-events-none absolute bottom-1 left-1 shadow-[0_0_0_2px_var(--surface)]"
              />
            ) : null}
            {p.pending ? (
              <span aria-hidden className={cn(chip, "top-1 left-1")}>
                <Hourglass className="size-3.5" />
              </span>
            ) : null}
            {p.author && !p.mine ? (
              <button
                type="button"
                aria-label={t("reportPicture")}
                title={t("reportPicture")}
                onClick={() => report(p)}
                className={cn(
                  chip,
                  "top-1 right-1 transition-opacity duration-200 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/pic:opacity-100 sm:pointer-coarse:opacity-100",
                )}
              >
                <Flag className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        );
      })}
      {pictures.isPending
        ? [0, 1].map((i) => (
            <span
              key={i}
              aria-hidden
              className="aspect-[4/5] w-16 animate-pulse rounded-[12px] bg-sunken motion-reduce:animate-none"
            />
          ))
        : null}
      {pictures.isError ? (
        <p className="col-span-3 px-1 font-semibold text-[12px] text-ink-muted leading-snug">
          {t("picturesFailed")}
        </p>
      ) : null}
    </div>
  );
}
