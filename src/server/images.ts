import "server-only";
// Pictures players send: checked by their first bytes, stored by the files
// store, and later recognised as ours by their URL.
import { BACKEND, SUPABASE_URL } from "@/config";
import { GameError } from "@/game/types";

const MAX_IMAGE = 4 * 1024 * 1024;

/** Accepts only real WebP, JPEG or PNG files (checked by their first bytes). */
export async function readImage(
  file: FormDataEntryValue | null,
): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_IMAGE) throw new GameError("upload_failed");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const has = (sig: number[], at = 0) =>
    sig.every((b, i) => bytes[at + i] === b);
  if (has([0x52, 0x49, 0x46, 0x46]) && has([0x57, 0x45, 0x42, 0x50], 8))
    return { bytes, type: "image/webp" };
  if (has([0xff, 0xd8, 0xff])) return { bytes, type: "image/jpeg" };
  if (has([0x89, 0x50, 0x4e, 0x47])) return { bytes, type: "image/png" };
  throw new GameError("upload_failed");
}

const UPLOADED = /^characters\/[0-9a-f-]{36}\.(webp|jpg|png)$/;
const literal = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Where a character picture the files store made sits ("characters/<uuid>.png"):
 * /api/files/characters/… locally, the public "characters" bucket on Supabase.
 * Null for anything else (another site, an avatar, a library picture).
 */
export function uploadedPath(url: string): string | null {
  const path =
    BACKEND === "local"
      ? /^\/api\/files\/(.+)$/.exec(url)?.[1]
      : new RegExp(
          `^${literal(SUPABASE_URL.replace(/\/+$/, ""))}/storage/v1/object/public/(.+)$`,
        ).exec(url)?.[1];
  return path && UPLOADED.test(path) ? path : null;
}
