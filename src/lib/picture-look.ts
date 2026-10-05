"use client";

import { useEffect, useState } from "react";

// What a picture's frame needs from the picture itself, read in the browser
// once per URL: its dominant colour (for the bands around a wide picture) and
// whether it is a cut-out with see-through corners. Reading pixels needs the
// host to allow it (CORS); when it doesn't, there is no look and the bands
// stay grey.

/** A picture's dominant colour as OKLCH chroma and hue (chroma 0 for a grey picture), and whether it is a cut-out. */
export interface PictureLook {
  c: number;
  h: number;
  cutout: boolean;
}

/** The sample's side in pixels: plenty for a dominant colour. */
const SIDE = 24;
/** Below this saturation a pixel has no colour worth counting. */
const GREY = 0.2;

const looks = new Map<string, PictureLook | null>();
const pending = new Map<string, Promise<PictureLook | null>>();

function toLinear(v: number) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB (0–255) to OKLCH chroma and hue. */
export function oklchOf(r: number, g: number, b: number) {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    c: Math.hypot(A, B),
    h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360,
  };
}

/**
 * The look of RGBA pixels: the hue family with the most colour in it (each
 * pixel weighted by its saturation) gives the dominant colour; a picture
 * with almost none is grey. Mostly see-through edges make it a cut-out.
 */
export function lookOf(data: Uint8ClampedArray, side: number): PictureLook {
  const bins = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  let edge = 0;
  let clear = 0;
  for (let i = 0; i < data.length; i += 4) {
    const p = i / 4;
    const x = p % side;
    const y = Math.floor(p / side);
    const a = data[i + 3];
    if (x === 0 || y === 0 || x === side - 1 || y === side - 1) {
      edge++;
      if (a < 32) clear++;
    }
    if (a < 128) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const s = (max - min) / 255;
    if (s < GREY) continue;
    const d = max - min;
    const hue =
      max === r
        ? ((((g - b) / d) % 6) + 6) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    const bin = bins[Math.floor(hue * 2) % 12];
    bin.w += s;
    bin.r += r * s;
    bin.g += g * s;
    bin.b += b * s;
  }
  const best = bins.reduce((x, y) => (y.w > x.w ? y : x));
  const cutout = clear > edge / 2;
  // a few coloured specks don't make a grey picture colourful
  if (best.w < (data.length / 4) * 0.03) return { c: 0, h: 0, cutout };
  return {
    ...oklchOf(best.r / best.w, best.g / best.w, best.b / best.w),
    cutout,
  };
}

function read(img: HTMLImageElement): PictureLook | null {
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, SIDE, SIDE);
    return lookOf(ctx.getImageData(0, 0, SIDE, SIDE).data, SIDE);
  } catch {
    // the host didn't allow reading its pixels
    return null;
  }
}

function sample(src: string): Promise<PictureLook | null> {
  let job = pending.get(src);
  if (!job) {
    job = new Promise<PictureLook | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(read(img));
      img.onerror = () => resolve(null);
      img.src = src;
    }).then((look) => {
      looks.set(src, look);
      pending.delete(src);
      return look;
    });
    pending.set(src, job);
  }
  return job;
}

/** The look of the picture at `src` (null while it loads, without a picture, or when it can't be read). */
export function usePictureLook(src: string | null): PictureLook | null {
  const [found, setFound] = useState<{
    src: string;
    look: PictureLook | null;
  }>();
  useEffect(() => {
    if (!src || looks.has(src)) return;
    let live = true;
    void sample(src).then((look) => {
      if (live) setFound({ src, look });
    });
    return () => {
      live = false;
    };
  }, [src]);
  if (!src) return null;
  if (looks.has(src)) return looks.get(src) ?? null;
  return found?.src === src ? found.look : null;
}
