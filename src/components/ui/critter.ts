// The creatures are drawn on the server (src/server/critter-art.ts) and cached
// by browsers and the CDN, so no page ships the drawing code.

/** Where the creature for `seed` on `background` ("#RRGGBB") is drawn. */
export function critterUri(seed: string, background: string): string {
  const bg = /^#[0-9a-f]{6}$/i.test(background)
    ? background.slice(1).toLowerCase()
    : "ffffff";
  return `/api/critter/${encodeURIComponent(seed)}/${bg}`;
}

/** A fresh seed for "another critter" (works on plain http too, unlike crypto.randomUUID). */
export const randomCritterSeed = () => Math.random().toString(36).slice(2, 10);
