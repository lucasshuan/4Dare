// The sounds of the title scenes, as the panel edits them: each scene's list
// of clips, every clip held to a moment of the scene (the moments come from
// the scene's own timing, src/features/opening/scene-sound.ts). The code
// brings each scene's clips; the panel's list, when there is one, takes their
// place whole. It is kept as one value per scene (JSON text), so it travels
// with the other values (tune.ts): saved in versions, frozen with a match.
import { SOUND_IDS } from "./sounds";
import { tunable } from "./tune";

/** A sound of a scene. Times in seconds. */
export interface SceneClip {
  /** Stable within the scene: the code's clips by what they are ("land"), added ones "x1", "x2"… */
  id: string;
  label: string;
  /** A sound of the library (src/game/sounds.ts). */
  sound: string;
  /** The moment it is held to; moving the moment moves the clip. */
  anchor: string;
  /** From the moment (negative: before it). */
  offset: number;
  gain: number;
  /** The part of the file that plays. */
  trimIn: number;
  trimOut: number | null;
  fadeIn: number;
  fadeOut: number;
  /** On a moment that repeats (each player landing), it plays every time; else only the first. */
  each: boolean;
  /** A whole scene's mixed track: joined late, it plays from where the scene is. */
  track?: boolean;
  /** Taken out of the scene (the code's clip stays listed, silent). */
  off?: boolean;
}

export const SCENE_KINDS = ["first", "later"] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

/** The games with a title scene. */
export const SCENE_GAMES = ["who-am-i", "impostor", "lineup"] as const;
export type SceneGame = (typeof SCENE_GAMES)[number];

/** Each scene's clips as the panel saved them; "" = the code's. */
export const SCENE_CLIPS = tunable<
  Record<SceneGame, Record<SceneKind, string>>
>("scenes", {
  "who-am-i": { first: "", later: "" },
  impostor: { first: "", later: "" },
  lineup: { first: "", later: "" },
});

const MAX_CLIPS = 40;
const num = (v: unknown, min: number, max: number, d = 0) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000
    : d;
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : "";

/** A list of clips made safe, or null when it isn't one. */
export function cleanClips(raw: unknown): SceneClip[] | null {
  if (!Array.isArray(raw)) return null;
  const out: SceneClip[] = [];
  const ids = new Set<string>();
  for (const r of raw.slice(0, MAX_CLIPS)) {
    if (!r || typeof r !== "object") continue;
    const c = r as Record<string, unknown>;
    const id = text(c.id, 40);
    const sound = text(c.sound, 40);
    if (!id || ids.has(id) || !(SOUND_IDS as readonly string[]).includes(sound))
      continue;
    ids.add(id);
    const trimIn = num(c.trimIn, 0, 600);
    out.push({
      id,
      label: text(c.label, 60) || id,
      sound,
      anchor: text(c.anchor, 40) || "start",
      offset: num(c.offset, -30, 60),
      gain: num(c.gain, 0, 1.5, 1),
      trimIn,
      trimOut:
        c.trimOut === null || c.trimOut === undefined
          ? null
          : Math.max(trimIn + 0.05, num(c.trimOut, 0, 600)),
      fadeIn: num(c.fadeIn, 0, 10),
      fadeOut: num(c.fadeOut, 0, 10),
      each: c.each === true,
      ...(c.track === true ? { track: true } : {}),
      ...(c.off === true ? { off: true } : {}),
    });
  }
  return out;
}

/** A scene's saved text made safe (the same text, normalised); "" stays "", junk is null. */
export function cleanClipsText(v: string): string | null {
  if (v === "") return "";
  try {
    const list = cleanClips(JSON.parse(v));
    return list ? JSON.stringify(list) : null;
  } catch {
    return null;
  }
}

/** The clips the panel saved for a scene, or null for the code's. */
export function savedClips(
  game: SceneGame,
  kind: SceneKind,
): SceneClip[] | null {
  const v = SCENE_CLIPS[game][kind];
  if (!v) return null;
  try {
    return cleanClips(JSON.parse(v));
  } catch {
    return null;
  }
}
