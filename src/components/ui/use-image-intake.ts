"use client";

import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Area } from "react-easy-crop";
import { insideChat } from "@/lib/focus";

/** Any picture the browser can open (JFIF, AVIF, BMP...): it is re-encoded as WebP anyway. */
export const IMAGE_ACCEPT = "image/*,.jfif,.pjpeg,.pjp";
const MAX_BYTES = 8 * 1024 * 1024;

/** The part of the picture shown when nobody has moved the crop yet: centered, covering the frame. */
export function coverArea(img: HTMLImageElement, aspect: number): Area {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w / h > aspect) {
    const width = h * aspect;
    return { x: (w - width) / 2, y: 0, width, height: h };
  }
  const height = w / aspect;
  return { x: 0, y: (h - height) / 2, width: w, height };
}

/** Crops `src` to `area` (centered when null) and returns a WebP of `width`×`height`. */
export async function cropToWebp(
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

/**
 * Takes a picture in, from a file input, a drop or a paste (also the address
 * of a picture on a web page, downloaded when its site allows it), checks it
 * (a picture, at most 8 MB, decodable) and hands its object URL to `onPicked`.
 * The receiver owns the URL and revokes it. Errors come back as `error`,
 * already translated (`common.image.*`).
 */
export function useImageIntake({
  onPicked,
  paste = true,
}: {
  onPicked: (url: string) => void;
  /** Listen to pastes anywhere on the page (not inside the chat). */
  paste?: boolean;
}) {
  const t = useTranslations("common.image");
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  /** Stable, so it can sit in effect dependencies. */
  const exportError = useCallback(() => setError(t("wrongType")), [t]);
  const picked = useRef(onPicked);
  useEffect(() => {
    picked.current = onPicked;
  });

  const accept = useCallback(
    async (input: File | string | null | undefined) => {
      if (!input) return;
      const file = typeof input === "string" ? await download(input) : input;
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
      picked.current(url);
    },
    [t],
  );

  useEffect(() => {
    if (!paste) return;
    const onPaste = (e: ClipboardEvent) => {
      // the chat has its own field: a paste there is never a picture for the page
      if (!e.clipboardData || insideChat(e.target)) return;
      const found = fromTransfer(e.clipboardData);
      // Text pasted into a field stays text, even a link.
      if (!found || (typeof found === "string" && editable(e.target))) return;
      e.preventDefault();
      void accept(found);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept, paste]);

  /** Spread on the element that takes drops. */
  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      void accept(fromTransfer(e.dataTransfer));
    },
  };

  /** Spread on an `<input>`. */
  const inputProps = {
    type: "file" as const,
    accept: IMAGE_ACCEPT,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // the same file again is a new choice
      void accept(file);
    },
  };

  return {
    accept,
    error,
    setError,
    /** A file is being dragged over the drop target. */
    over,
    dropHandlers,
    inputProps,
    /** The translated error for a crop that couldn't be exported. */
    exportError,
  };
}
