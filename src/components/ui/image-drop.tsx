"use client";

import { ImagePlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cn } from "@/lib/cn";
import { riseIn } from "@/lib/motion";
import { Button } from "./button";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

/** Crops `src` to `area` and returns a WebP of `width`×`height`. */
async function cropToWebp(
  src: string,
  area: Area,
  width: number,
  height: number,
): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
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

/**
 * Pick a picture (click, drag-and-drop or paste), then crop it.
 * Portrait 4:5 → 640×800 for characters; square → 256×256 for avatars.
 * With `onDone` the person confirms the crop with a button; with `onChange` every crop is
 * sent right away (null when the picture is removed), for forms with their own save button.
 */
export function ImageDrop({
  onDone,
  onChange,
  shape = "portrait",
  busy,
  className,
}: {
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

  const accept = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!TYPES.includes(file.type)) return setError(t("wrongType"));
      if (file.size > MAX_BYTES) return setError(t("tooBig"));
      setError(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setSrc((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
    },
    [t],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) accept(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  // Live mode: export the crop shortly after the person stops dragging.
  useEffect(() => {
    if (!onChange || !src || !area) return;
    const id = window.setTimeout(() => {
      void cropToWebp(src, area, size.w, size.h).then(onChange);
    }, 250);
    return () => window.clearTimeout(id);
  }, [onChange, src, area, size.w, size.h]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <AnimatePresence mode="wait">
        {src ? (
          <motion.div key="crop" {...riseIn} className="flex flex-col gap-3">
            <div
              className={cn(
                "relative w-full max-w-[320px] overflow-hidden rounded-lg bg-ink",
                shape === "portrait" ? "aspect-[4/5]" : "aspect-square",
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
                  disabled={!area || busy}
                  onClick={async () => {
                    if (!area || !src) return;
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
                accept(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex w-full max-w-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed p-4 text-center font-medium text-ink-muted text-sm transition-colors",
                shape === "portrait" ? "aspect-[4/5]" : "aspect-square",
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
              accept={TYPES.join(",")}
              className="sr-only"
              onChange={(e) => accept(e.target.files?.[0])}
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
