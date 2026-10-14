// A figure's SVG drawn once into a bitmap. The browser replays an SVG image's
// every path whenever its area repaints; a bitmap is a plain copy. Scenes that
// repaint a figure every frame (a peeling or clipped card) use this instead.

const cache = new Map<string, Promise<string>>();

/** A PNG object URL of `svgUri` drawn at `width`×`height` px; the same promise for the same picture. */
export function figureBitmap(
  svgUri: string,
  width = 480,
  height = 600,
): Promise<string> {
  const key = `${width}x${height}:${svgUri}`;
  let done = cache.get(key);
  if (!done) {
    done = new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no 2d context"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) =>
          blob
            ? resolve(URL.createObjectURL(blob))
            : reject(new Error("no blob")),
        );
      };
      img.onerror = () => reject(new Error("figure did not load"));
      img.src = svgUri;
    });
    cache.set(key, done);
  }
  return done;
}
