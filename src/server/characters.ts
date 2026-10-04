import "server-only";
// Characters players name on their own: a new name joins the library (insert
// only), and a name the library already has is reused instead of duplicated.
import { normalizeName } from "@/game/match";
import type { Character, Lang } from "@/game/types";
import { getBackend } from "./backend";
import type { NewCharacter } from "./backend/types";

/** A character of `lang` with this name (and this origin, when one is given): the one to reuse. */
export async function findSameName(
  name: string,
  lang: Lang,
  origin: string | null,
): Promise<Character | null> {
  const found = await getBackend().characters.search(name, lang, 10);
  return (
    found.find(
      (c) =>
        normalizeName(c.name) === normalizeName(name) &&
        (!origin || normalizeName(c.origin ?? "") === normalizeName(origin)),
    ) ?? null
  );
}

/**
 * The library's character with this name, or a new one. With an `id` (a pick
 * draft's newId) it is safe to race: confirms and clock timeouts that run at
 * once all get the same single row. Nothing already in the library changes.
 */
export async function getOrCreateCharacter(
  input: NewCharacter,
): Promise<Character> {
  return (
    (await findSameName(input.name, input.lang, input.origin)) ??
    getBackend().characters.create(input)
  );
}
