"use client";

import { ImagePlus } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import {
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cn } from "@/lib/cn";
import { riseIn } from "@/lib/motion";
import { Button } from "./button";
import { cropToWebp, useImageIntake } from "./use-image-intake";

const SHAPES = {
  portrait: { w: 640, h: 800 },
  square: { w: 256, h: 256 },
  banner: { w: 1600, h: 480 },
} as const;

/** Exports the current crop on demand: forms call it when they submit, so the latest crop always goes. */
export interface ImageDropHandle {
  /** The cropped picture, or null when none is chosen. */
  exportCrop: () => Promise<Blob | null>;
}

/**
 * Pick a picture (click, drag-and-drop or paste, also from a web page), then crop it.
 * Portrait 4:5 → 640×800 for characters; square → 256×256 for avatars;
 * banner 10:3 → 1600×480 for profile covers.
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
  shape?: keyof typeof SHAPES;
  busy?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.image");
  const id = useId();
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const size = SHAPES[shape];
  const { error, setError, over, dropHandlers, inputProps } = useImageIntake({
    onPicked: (url) => {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setSrc((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      exportCrop: () =>
        src ? cropToWebp(src, area, size.w, size.h) : Promise.resolve(null),
    }),
    [src, area, size.w, size.h],
  );

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
  }, [onChange, src, area, size.w, size.h, t, setError]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <AnimatePresence mode="wait">
        {src ? (
          <m.div key="crop" {...riseIn} className="flex flex-col gap-3">
            <div
              className={cn(
                "relative w-full max-w-[320px] overflow-hidden rounded-lg bg-ink",
                shape === "portrait"
                  ? // on short windows the crop area shrinks with the height
                    "aspect-[4/5] short:max-w-[min(320px,calc((100dvh_-_420px)_*_0.8))]"
                  : shape === "banner"
                    ? "aspect-[10/3] max-w-[560px]"
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
          </m.div>
        ) : (
          <m.div key="drop" {...riseIn}>
            <label
              htmlFor={id}
              {...dropHandlers}
              className={cn(
                "flex w-full max-w-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed p-4 text-center font-medium text-ink-muted text-sm transition-colors",
                shape === "portrait"
                  ? "aspect-[4/5]"
                  : shape === "banner"
                    ? "aspect-[10/3] max-w-[560px]"
                    : "aspect-square",
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
            <input {...inputProps} id={id} className="sr-only" />
          </m.div>
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
