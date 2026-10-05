import "server-only";
import { BACKEND } from "@/config";

// Pictures players send for characters go through Sightengine before anyone
// else sees them (0017_character_images.sql). Blocked, in any style: sexual
// activity and exposed genitals. Blocked in photos only: exposed breasts or
// buttocks, so paintings and drawings of nudes (Lilith, a Greek god) stay.
// Blocked unless drawn: gore with organs, serious injuries or corpses. Blood
// alone is fine (a vampire). The free plan has 2,000 operations a month: a
// picture costs two (nudity, gore), three when it also needs the photo check.

const ENDPOINT = "https://api.sightengine.com/1.0/check.json";
const TIMEOUT_MS = 10_000;

/** Scores (0..1) at or above which a picture is blocked. */
export const LIMITS = {
  /** sexual_activity or sexual_display, in any style. */
  sexual: 0.5,
  /** erotica (exposed breasts or buttocks), only when it is a photo. */
  erotica: 0.5,
  /** The type model's "photo" score for an erotica picture. */
  photo: 0.5,
  /** body_organ, serious_injury or corpse, unless animated. */
  gore: 0.5,
  /** The gore model's "animated" score that lets gore through. */
  animated: 0.5,
} as const;

/** What the detector said, as stored with the picture to tune LIMITS later. */
export interface Scores {
  sexual: number;
  erotica: number;
  gore: number;
  animated: number;
  /** Asked only when erotica is high. */
  photo?: number;
}

export type Moderation =
  | { verdict: "ok"; scores: Scores | null }
  | {
      verdict: "rejected";
      reason: "sexual" | "nudity" | "gore";
      scores: Scores;
    }
  /** No key, no quota left, an outage, an answer we can't read: decide later. */
  | { verdict: "unknown"; error: string };

type Json = Record<string, unknown>;

const num = (o: unknown, key: string): number | null => {
  const v = o && typeof o === "object" ? (o as Json)[key] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/** The scores of a nudity-2.1 + gore-2.0 answer, or null when it lacks one. */
export function readScores(answer: unknown): Scores | null {
  if (!answer || typeof answer !== "object") return null;
  const { nudity, gore } = answer as Json;
  const classes =
    gore && typeof gore === "object" ? (gore as Json).classes : null;
  const type = gore && typeof gore === "object" ? (gore as Json).type : null;
  const activity = num(nudity, "sexual_activity");
  const display = num(nudity, "sexual_display");
  const erotica = num(nudity, "erotica");
  const organ = num(classes, "body_organ");
  const injury = num(classes, "serious_injury");
  const corpse = num(classes, "corpse");
  const animated = num(type, "animated");
  if (
    activity === null ||
    display === null ||
    erotica === null ||
    organ === null ||
    injury === null ||
    corpse === null ||
    animated === null
  )
    return null;
  return {
    sexual: Math.max(activity, display),
    erotica,
    gore: Math.max(organ, injury, corpse),
    animated,
  };
}

/** The type model's "photo" score, or null. */
export function readPhoto(answer: unknown): number | null {
  if (!answer || typeof answer !== "object") return null;
  return num((answer as Json).type, "photo");
}

/** True when the erotica score asks whether the picture is a photo. */
export const needsPhotoCheck = (s: Scores) => s.erotica >= LIMITS.erotica;

/** The verdict for a picture's scores; `photo` is needed only when needsPhotoCheck. */
export function judge(s: Scores): Moderation {
  if (s.sexual >= LIMITS.sexual)
    return { verdict: "rejected", reason: "sexual", scores: s };
  if (s.gore >= LIMITS.gore && s.animated < LIMITS.animated)
    return { verdict: "rejected", reason: "gore", scores: s };
  if (needsPhotoCheck(s)) {
    if (s.photo === undefined) return { verdict: "unknown", error: "no_type" };
    if (s.photo >= LIMITS.photo)
      return { verdict: "rejected", reason: "nudity", scores: s };
  }
  return { verdict: "ok", scores: s };
}

type Fetch = typeof fetch;

async function ask(
  bytes: Uint8Array,
  contentType: string,
  models: string,
  keys: { user: string; secret: string },
  fetcher: Fetch,
): Promise<unknown> {
  const form = new FormData();
  form.set(
    "media",
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: contentType }),
    "picture",
  );
  form.set("models", models);
  form.set("api_user", keys.user);
  form.set("api_secret", keys.secret);
  const res = await fetcher(ENDPOINT, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as Json | null;
  if (!res.ok || body?.status !== "success") {
    const error = body?.error as Json | undefined;
    throw new Error(
      `sightengine ${res.status}: ${String(error?.message ?? error?.type ?? "no answer")}`,
    );
  }
  return body;
}

function keys() {
  const user = process.env.SIGHTENGINE_API_USER;
  const secret = process.env.SIGHTENGINE_API_SECRET;
  return user && secret ? { user, secret } : null;
}

/**
 * Checks a picture a player sent. Local mode (dev, tests) lets everything
 * through; on Supabase without the keys, or when Sightengine fails, the
 * verdict is "unknown" and the picture waits for a later check.
 */
export async function moderateImage(
  bytes: Uint8Array,
  contentType: string,
  fetcher: Fetch = fetch,
): Promise<Moderation> {
  const k = keys();
  if (!k) {
    if (BACKEND === "local") return { verdict: "ok", scores: null };
    return { verdict: "unknown", error: "no_keys" };
  }
  try {
    const scores = readScores(
      await ask(bytes, contentType, "nudity-2.1,gore-2.0", k, fetcher),
    );
    if (!scores) return { verdict: "unknown", error: "unreadable" };
    if (!needsPhotoCheck(scores)) return judge(scores);
    // only the rare erotica picture costs a third operation
    const first = judge(scores);
    if (first.verdict === "rejected") return first;
    const photo = readPhoto(await ask(bytes, contentType, "type", k, fetcher));
    if (photo === null) return { verdict: "unknown", error: "unreadable" };
    return judge({ ...scores, photo });
  } catch (e) {
    console.warn("[moderation]", e);
    return {
      verdict: "unknown",
      error: e instanceof Error ? e.message : "failed",
    };
  }
}
