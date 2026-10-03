"use client";

import { ImagePlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  type Ref,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cn } from "@/lib/cn";
import { riseIn } from "@/lib/motion";
import { Button } from "./button";

/** Any picture the browser can open (JFIF, AVIF, BMP...): it is re-encoded as WebP anyway. */
const ACCEPT = "image/*,.jfif,.pjpeg,.pjp";
const MAX_BYTES = 8 * 1024 * 1024;

/** The part of the picture shown when nobody has moved the crop yet: centered, covering the frame. */
function coverArea(img: HTMLImageElement, aspect: number): Area {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w / h > aspect) {
    const width = h * aspect;
    return { x: (w - width) / 2, y: 0, width, height: h };
  }
  const height = w / aspect;
  return { x: 0, y: (h - height) / 2, width: w, height };
}

/** Crops `src` to `area` (centered when null) and returns a WebP of `width`×`height`. */
async function cropToWebp(
  src: string,
  area: Area | null,
  width: number,
  height: number,
): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  area ??= coverArea(img, width / height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    width,
    height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("export failed"))),
      "image/webp",
      0.86,
    ),
  );
}

const isImage = (f: File) =>
  f.type.startsWith("image/") ||
  (!f.type && /\.(jfif|pjpeg|pjp)$/i.test(f.name));

/** A picture's address in what was pasted or dropped from a web page: an <img> in the HTML, or a link. */
function imageAddress(data: DataTransfer): string | null {
  const html = data.getData("text/html");
  if (html) {
    const img = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector("img[src]");
    if (img) return (img as HTMLImageElement).src;
  }
  const link = (data.getData("text/uri-list") || data.getData("text/plain"))
    .split(/\s+/)
    .find((u) => /^(https?:|data:image\/)/.test(u));
  return link ?? null;
}

/** What was pasted or dropped: a file, or else the address of a picture on a web page. */
function fromTransfer(data: DataTransfer): File | string | null {
  const file =
    [...data.files].find(isImage) ??
    [...data.items]
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .find((f): f is File => !!f && isImage(f));
  return file ?? imageAddress(data);
}

/** Downloads a picture from a web page, when its site allows it. */
async function download(url: string): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.type.startsWith("image/")
      ? new File([blob], "picture", { type: blob.type })
      : null;
  } catch {
    return null;
  }
}

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || el.matches("input, textarea, select"));

/** Exports the current crop on demand: forms call it when they submit, so the latest crop always goes. */
export interface ImageDropHandle {
  /** The cropped picture, or null when none is chosen. */
  exportCrop: () => Promise<Blob | null>;
}

/**
 * Pick a picture (click, drag-and-drop or paste, also from a web page), then crop it.
 * Portrait 4:5 → 640×800 for characters; square → 256×256 for avatars.
 * With `onDone` the person confirms the crop with a button; with `onChange` every crop is
 * sent shortly after it settles (null when the picture is removed), as a preview for forms with
 * their own save button; those forms take the picture itself from `ref` when they submit.
 */
export function ImageDrop({
  ref,
  onDone,
  onChange,
  shape = "portrait",
  busy,
  className,
}: {
  ref?: Ref<ImageDropHandle>;
  onDone?: (blob: Blob) => void | Promise<void>;
  onChange?: (blob: Blob | null) => void;
  shape?: "portrait" | "square";
  busy?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.image");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const size = shape === "portrait" ? { w: 640, h: 800 } : { w: 256, h: 256 };

  useImperativeHandle(
    ref,
    () => ({
      exportCrop: () =>
        src ? cropToWebp(src, area, size.w, size.h) : Promise.resolve(null),
    }),
    [src, area, size.w, size.h],
  );

  const accept = useCallback(
    async (picked: File | string | null | undefined) => {
      if (!picked) return;
      const file = typeof picked === "string" ? await download(picked) : picked;
      if (!file) return setError(t("notDownloadable"));
      if (!isImage(file)) return setError(t("wrongType"));
      if (file.size > MAX_BYTES) return setError(t("tooBig"));
      const url = URL.createObjectURL(file);
      // A file can say "image" and still not be one (or be broken): try it first.
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
      } catch {
        URL.revokeObjectURL(url);
        return setError(t("wrongType"));
      }
      setError(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setSrc((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    },
    [t],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const picked = fromTransfer(e.clipboardData);
      // Text pasted into a field stays text, even a link.
      if (!picked || (typeof picked === "string" && editable(e.target))) return;
      e.preventDefault();
      void accept(picked);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  // Live mode: export the crop shortly after the person stops dragging.
  useEffect(() => {
    if (!onChange || !src || !area) return;
    const id = window.setTimeout(() => {
      cropToWebp(src, area, size.w, size.h)
        .then(onChange)
        .catch(() => setError(t("wrongType")));
    }, 250);
    return () => window.clearTimeout(id);
  }, [onChange, src, area, size.w, size.h, t]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <AnimatePresence mode="wait">
        {src ? (
          <motion.div key="crop" {...riseIn} className="flex flex-col gap-3">
            <div
              className={cn(
                "relative w-full max-w-[320px] overflow-hidden rounded-lg bg-ink",
                shape === "portrait"
                  ? // on short windows the crop area shrinks with the height
                    "aspect-[4/5] short:max-w-[min(320px,calc((100dvh_-_420px)_*_0.8))]"
                  : "aspect-square",
              )}
            >
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={size.w / size.h}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                showGrid={false}
                objectFit="cover"
              />
            </div>
            <label
              htmlFor={`${id}-zoom`}
              className="flex max-w-[320px] items-center gap-3 font-semibold text-sm"
            >
              {t("zoom")}
              <input
                id={`${id}-zoom`}
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-sky"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {onDone ? (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={async () => {
                    if (!src) return;
                    await onDone(await cropToWebp(src, area, size.w, size.h));
                  }}
                >
                  {t("use")}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSrc(null);
                  setArea(null);
                  onChange?.(null);
                }}
              >
                {t("other")}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="drop" {...riseIn}>
            <label
              htmlFor={id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                void accept(fromTransfer(e.dataTransfer));
              }}
              className={cn(
                "flex w-full max-w-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed p-4 text-center font-medium text-ink-muted text-sm transition-colors",
                shape === "portrait" ? "aspect-[4/5]" : "aspect-square",
                // short windows: a wide strip instead of a tall drop area
                "short:aspect-auto short:max-w-[360px] short:flex-row short:flex-wrap short:gap-x-3 short:gap-y-0 short:py-4",
                over
                  ? "border-sky border-solid bg-sky-soft text-ink"
                  : "border-line-strong bg-surface",
              )}
            >
              <ImagePlus className="size-7 text-ink" strokeWidth={1.75} />
              <span className="font-semibold text-ink">{t("choose")}</span>
              <span>{t("dropOrPaste")}</span>
            </label>
            <input
              ref={input}
              id={id}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => void accept(e.target.files?.[0])}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {error ? (
        <p role="alert" className="font-medium text-no text-sm">
          {error}
        </p>
      ) : (
        <p className="max-w-[320px] font-medium text-[13px] text-ink-muted">
          {t("hint")}
        </p>
      )}
    </div>
  );
}
