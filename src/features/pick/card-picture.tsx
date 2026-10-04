"use client";

import { Check, ImagePlus, Upload, X } from "lucide-react";
import { AnimatePresence, m, useAnimate } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Portrait } from "@/components/ui/portrait";
import { cropToWebp, useImageIntake } from "@/components/ui/use-image-intake";
import { type CardContent, thumbUrl } from "@/game/character-search";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";

/** Character pictures are 4:5, exported at 640×800 (as `ImageDrop` does). */
const SIZE = { w: 640, h: 800 };
/** Quiet time after the last drag or zoom before the crop is exported and sent. */
const CROP_SETTLE_MS = 500;

/** Whose picture the card shows: a library character, or the new name. */
const pictureKey = (value: CardContent) =>
  value.kind === "picked"
    ? `picked:${value.card.characterId}`
    : value.kind === "new"
      ? "new"
      : null;

/** A crop being adjusted on the card: the original picture and where it sits. */
interface CropSession {
  src: string;
  key: string;
  crop: { x: number; y: number };
  zoom: number;
  area: Area | null;
  /** The person moved or zoomed it (the centred crop was already sent). */
  touched: boolean;
}

/**
 * The card's picture: the silhouette, the highlighted row's ghost, the chosen
 * picture (it flips in when picked), the drop zone of a new name, the inline
 * crop of a dropped, pasted or browsed picture, the swap pill and its tray.
 */
export function CardPicture({
  value,
  onChange,
  editable,
  compact,
  onNewImage,
  onLibraryImage,
}: {
  value: CardContent;
  onChange: (next: CardContent) => void;
  editable: boolean;
  /** Phones while the name field has focus: the picture shrinks above the keyboard. */
  compact: boolean;
  onNewImage: (file: Blob) => Promise<string | null>;
  onLibraryImage: (characterId: string, file: Blob) => Promise<void>;
}) {
  const t = useTranslations("pickCard");
  const tImage = useTranslations("common.image");
  const tErrors = useTranslations("common.errors");
  const tPick = useTranslations("room.pick");
  const key = pictureKey(value);
  const takes = editable && key !== null;
  const wrap = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [local, setLocal] = useState<{ key: string; url: string } | null>(null);
  const [session, setSession] = useState<CropSession | null>(null);
  const [tray, setTray] = useState(false);
  const [busy, setBusy] = useState(0);

  // Async work and effects read the latest props and crop.
  const latest = useRef({
    value,
    onChange,
    onNewImage,
    onLibraryImage,
    editable,
    session,
  });
  useEffect(() => {
    latest.current = {
      value,
      onChange,
      onNewImage,
      onLibraryImage,
      editable,
      session,
    };
  });
  const sent = useRef(0);

  const intake = useImageIntake({
    paste: takes,
    onPicked: (src) => {
      const forKey = pictureKey(latest.current.value);
      if (!forKey) return URL.revokeObjectURL(src);
      setTray(false);
      setSession((old) => {
        if (old) URL.revokeObjectURL(old.src);
        return {
          src,
          key: forKey,
          crop: { x: 0, y: 0 },
          zoom: 1,
          area: null,
          touched: false,
        };
      });
      // Centre-cropped at once, so the card holds the picture even if nobody adjusts it.
      void commit(() => cropToWebp(src, null, SIZE.w, SIZE.h), forKey);
    },
  });
  const { exportError, setError } = intake;

  /**
   * Exports a crop, shows it on the card and sends it: a new name's upload, or
   * the library picture. A frozen card (confirmed, time up) takes nothing more,
   * so it never shows a crop the saved character lacks. A new name is marked
   * `uploading` before the export starts, so Confirm waits for it.
   */
  const commit = useCallback(
    async (make: () => Promise<Blob>, forKey: string) => {
      const first = latest.current;
      if (!first.editable || pictureKey(first.value) !== forKey) return;
      const seq = ++sent.current;
      /** Clears a new name's `uploading` flag this send raised. */
      const settle = () => {
        const { value: now, onChange: emit } = latest.current;
        if (now.kind === "new" && now.uploading)
          emit({ ...now, uploading: false });
      };
      setBusy((n) => n + 1);
      if (first.value.kind === "new" && !first.value.uploading)
        first.onChange({ ...first.value, uploading: true });
      try {
        const blob = await make().catch(() => null);
        if (seq !== sent.current) return; // a newer send owns the flags
        if (!blob) {
          exportError();
          return settle();
        }
        const now = latest.current;
        if (!now.editable || pictureKey(now.value) !== forKey) return settle();
        setLocal({ key: forKey, url: URL.createObjectURL(blob) });
        if (now.value.kind === "new") {
          const uploaded = await now.onNewImage(blob).catch(() => null);
          const after = latest.current.value;
          if (seq !== sent.current || after.kind !== "new") return;
          latest.current.onChange({
            ...after,
            imageUrl: uploaded ?? after.imageUrl,
            uploading: false,
          });
          if (!uploaded) {
            setLocal(null);
            setError(tErrors("upload_failed"));
          }
        } else if (now.value.kind === "picked") {
          const ok = await now
            .onLibraryImage(now.value.card.characterId, blob)
            .then(() => true)
            .catch(() => false);
          if (!ok && seq === sent.current) {
            setLocal(null);
            setError(tErrors("upload_failed"));
          }
        }
      } finally {
        setBusy((n) => n - 1);
      }
    },
    [exportError, setError, tErrors],
  );

  // Debounced export of an adjusted crop: once per settled area, not per render.
  // The area the crop opens on is the centred one already sent.
  const area = session?.area
    ? [session.key, session.src, ...Object.values(session.area)].join()
    : null;
  const touched = session?.touched ?? false;
  const lastArea = useRef<string | null>(null);
  const pending = useRef<{ id: number; run: () => void } | null>(null);
  useEffect(() => {
    const now = latest.current.session;
    if (!area || !now?.area) return;
    if (!touched) {
      lastArea.current = area;
      return;
    }
    if (area === lastArea.current) return;
    const { src, area: rect, key: forKey } = now;
    const run = () => {
      pending.current = null;
      lastArea.current = area;
      void commit(() => cropToWebp(src, rect, SIZE.w, SIZE.h), forKey);
    };
    const id = window.setTimeout(run, CROP_SETTLE_MS);
    pending.current = { id, run };
    return () => {
      window.clearTimeout(id);
      if (pending.current?.id === id) pending.current = null;
    };
  }, [area, touched, commit]);

  /** Leaves the crop: the last adjustment goes at once, then the original is let go. */
  const endSession = useCallback(() => {
    const waiting = pending.current;
    if (waiting) {
      window.clearTimeout(waiting.id);
      waiting.run();
    }
    setSession((old) => {
      if (old) window.setTimeout(() => URL.revokeObjectURL(old.src), 2000);
      return null;
    });
  }, []);

  // Another character, or the card froze: close the crop and the tray, drop a
  // stale picture. A flushed export is refused by `commit` once the card froze.
  useEffect(() => {
    if (session && (session.key !== key || !editable)) endSession();
    if (!editable) setTray(false);
    if (local && local.key !== key) setLocal(null);
  }, [key, editable, session, local, endSession]);

  useEffect(
    () => () => void (local && URL.revokeObjectURL(local.url)),
    [local],
  );

  // A press outside, or Esc, closes the tray and ends the crop.
  useEffect(() => {
    if (!session && !tray) return;
    const outside = (e: PointerEvent) => {
      if (wrap.current?.contains(e.target as Node)) return;
      setTray(false);
      if (session) endSession();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setTray(false);
      if (session) endSession();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [session, tray, endSession]);

  const picture =
    value.kind === "picked"
      ? local?.key === key
        ? local.url
        : value.card.imageUrl
      : value.kind === "new"
        ? local?.key === key
          ? local.url
          : value.imageUrl
        : null;
  const ghost = value.kind === "typing" ? (value.preview ?? null) : null;

  // Picked: the picture unfolds (no perspective, as in the prototype). Restored cards just sit.
  const flipKey =
    value.kind === "picked" && value.via !== "restore" ? key : null;
  const lastFlip = useRef(flipKey);
  useEffect(() => {
    if (flipKey === lastFlip.current) return;
    lastFlip.current = flipKey;
    if (flipKey && scope.current)
      animate(
        scope.current,
        { rotateY: [-70, 0] },
        { duration: 0.6, ease: gs.backOut(1.5) },
      );
  }, [flipKey, animate, scope]);

  // A new name's own picture lands with a small pop.
  const popUrl = value.kind === "new" ? picture : null;
  const lastPop = useRef(popUrl);
  useEffect(() => {
    if (popUrl === lastPop.current) return;
    const wasEmpty = !lastPop.current;
    lastPop.current = popUrl;
    if (popUrl && wasEmpty && scope.current)
      animate(
        scope.current,
        { scale: [1.06, 1] },
        { duration: 0.5, ease: gs.backOut(2) },
      );
  }, [popUrl, animate, scope]);

  const dropZone =
    takes && !session && ((value.kind === "new" && !picture) || intake.over);
  const sending = busy > 0 || (value.kind === "new" && value.uploading);
  const browse = () => file.current?.click();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a drop target; the drop zone button and the tray are the controls
    <div
      ref={wrap}
      className={cn(
        "group relative mx-auto w-full transition-[width] duration-300 ease-out",
        compact && "max-sm:w-[62%]",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (takes) intake.dropHandlers.onDragOver(e);
      }}
      onDragLeave={intake.dropHandlers.onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        if (takes) intake.dropHandlers.onDrop(e);
      }}
    >
      <div
        ref={scope}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] bg-sunken"
      >
        <Portrait
          src={thumbUrl(picture, 500)}
          className="absolute inset-0 rounded-[18px] text-line"
        />
        <AnimatePresence>
          {ghost && !picture ? (
            <m.span
              key={ghost[0]}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.45,
                transition: { duration: 0.3, ease: gs.p1Out },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.15, ease: gs.p1Out },
              }}
            >
              {ghost[3] ? (
                // biome-ignore lint/performance/noImgElement: remote library pictures of any size
                <img
                  src={thumbUrl(ghost[3], 500) ?? ""}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  className="size-full object-cover object-top"
                />
              ) : null}
            </m.span>
          ) : null}
        </AnimatePresence>

        {session ? (
          <div className="absolute inset-0 bg-ink">
            <Cropper
              image={session.src}
              crop={session.crop}
              zoom={session.zoom}
              aspect={SIZE.w / SIZE.h}
              showGrid={false}
              objectFit="cover"
              onCropChange={(crop) => setSession((s) => s && { ...s, crop })}
              onZoomChange={(zoom) =>
                setSession((s) => s && { ...s, zoom, touched: true })
              }
              onCropComplete={(_, area) =>
                setSession((s) => s && { ...s, area })
              }
              onInteractionStart={() =>
                setSession((s) => s && { ...s, touched: true })
              }
            />
          </div>
        ) : null}

        <AnimatePresence>
          {dropZone ? (
            <m.button
              key="drop"
              type="button"
              onClick={browse}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                scale: intake.over ? 1.02 : 1,
                transition: {
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.2 },
                },
              }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[18px] border-[2.5px] border-dashed p-[18px] text-center font-bold text-[15px] leading-snug transition-colors",
                intake.over
                  ? "border-sky bg-sky-soft text-sky"
                  : "border-line-strong bg-sunken text-ink-muted",
              )}
            >
              <ImagePlus
                className="size-[34px]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="text-balance">{t("drop")}</span>
              <small className="font-medium text-[12.5px]">
                {t("dropOptional")}
              </small>
            </m.button>
          ) : null}
        </AnimatePresence>

        {sending ? (
          <output
            aria-live="polite"
            className="absolute top-2.5 left-2.5 z-[3] inline-flex h-7 items-center gap-1.5 rounded-pill bg-[color-mix(in_oklab,var(--ink)_82%,transparent)] px-2.5 font-bold text-[12px] text-on-ink backdrop-blur-[6px]"
          >
            <span className="size-2 animate-dot rounded-full bg-on-ink motion-reduce:animate-none" />
            {t("uploading")}
          </output>
        ) : null}

        {intake.error ? (
          <p
            role="alert"
            className="absolute inset-x-2 bottom-2 z-[4] flex items-start gap-1.5 rounded-[10px] bg-no px-2.5 py-1.5 font-semibold text-[12px] text-on-no leading-snug"
          >
            <span className="flex-1">{intake.error}</span>
            <button
              type="button"
              aria-label={tPick("rateDismiss")}
              onClick={() => intake.setError(null)}
              className="-m-1 rounded-full p-1"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </p>
        ) : null}
      </div>

      {session && editable ? (
        <div className="absolute inset-x-2.5 bottom-2.5 z-[3] flex items-center gap-2">
          <label className="flex h-9 flex-1 items-center gap-2 rounded-pill bg-[color-mix(in_oklab,var(--ink)_82%,transparent)] px-3 font-bold text-[12px] text-on-ink backdrop-blur-[6px]">
            <span className="sr-only">{tImage("zoom")}</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={session.zoom}
              onChange={(e) => {
                const zoom = Number(e.target.value);
                setSession((s) => s && { ...s, zoom, touched: true });
              }}
              className="w-full accent-sky"
            />
          </label>
          <button
            type="button"
            aria-label={tImage("use")}
            title={tImage("use")}
            onClick={endSession}
            className="flex size-9 flex-none items-center justify-center rounded-full bg-yes text-on-yes shadow-card"
          >
            <Check className="size-[18px]" aria-hidden />
          </button>
        </div>
      ) : null}

      {takes && (picture || value.kind === "picked") && !session ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={tray}
          onClick={() => setTray((open) => !open)}
          className={cn(
            "absolute right-2.5 bottom-2.5 z-[3] inline-flex h-9 items-center gap-1.5 rounded-pill bg-[color-mix(in_oklab,var(--ink)_82%,transparent)] px-3 font-bold text-[13px] text-on-ink backdrop-blur-[6px] transition-opacity duration-250",
            tray
              ? "opacity-100 max-sm:invisible"
              : "sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:pointer-coarse:opacity-100",
          )}
        >
          <ImagePlus className="size-4" aria-hidden />
          {tPick("changeImage")}
        </button>
      ) : null}

      <AnimatePresence>
        {tray && takes ? (
          <m.div
            key="tray"
            role="dialog"
            aria-label={tPick("changeImage")}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                opacity: { duration: 0.2 },
                default: { duration: 0.35, ease: gs.backOut(2) },
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            style={{ transformOrigin: "0 0" }}
            className="absolute top-[128px] left-[-6px] z-[7] flex gap-2 rounded-[20px] bg-surface p-2.5 shadow-pop sm:top-[138px] sm:left-[calc(100%-28px)]"
          >
            {picture ? (
              <button
                type="button"
                aria-pressed="true"
                aria-label={tPick("changeImage")}
                onClick={() => setTray(false)}
                className="w-16 rounded-[12px] shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--sky)]"
              >
                <Portrait
                  src={thumbUrl(picture, 160)}
                  className="rounded-[12px] text-line"
                />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setTray(false);
                browse();
              }}
              title={
                value.kind === "picked"
                  ? tPick("imageHint", { name: value.card.name })
                  : undefined
              }
              className="flex aspect-[4/5] w-16 flex-col items-center justify-center gap-0.5 rounded-[12px] border-2 border-line-strong border-dashed px-1 text-center font-bold text-[11px] text-ink-muted leading-[1.15]"
            >
              <Upload className="size-5" aria-hidden />
              <span>{t("upload")}</span>
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>

      <input
        {...intake.inputProps}
        ref={file}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </div>
  );
}
