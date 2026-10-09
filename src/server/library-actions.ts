"use server";
// The characters page's mutations: new characters and nicknames.
import { getLocale } from "next-intl/server";
import { isTaste } from "@/game/tastes";
import { GameError, LANGS, type Lang } from "@/game/types";
import { getBackend } from "./backend";
import { fail, ok, type Result } from "./contract";
import {
  addNickname,
  changeNickname,
  createCharacter,
  reportNickname,
} from "./library-sheet";
import { allow } from "./rate-limit";

async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await work());
  } catch (e) {
    if (e instanceof GameError) return fail(e.code);
    console.error("[library]", e);
    return fail("unknown");
  }
}

const langOf = (raw: unknown, fallback: Lang): Lang =>
  (LANGS as readonly unknown[]).includes(raw) ? (raw as Lang) : fallback;

const pageLang = async () => langOf(await getLocale(), "en");

/** A budget per caller, on top of the database's hourly one. */
async function paced(key: string, max: number) {
  const me = await getBackend().auth.identity("en");
  if (!allow(`${key}:${me.id}`, max, 60_000))
    throw new GameError("rate_limited");
}

/** A new character from the characters page; its app id. */
export async function newCharacter(input: {
  name: string;
  origin: string;
  taste: string;
  aliases: string[];
}): Promise<Result<string>> {
  return run(async () => {
    await paced("new-character", 4);
    if (!isTaste(input.taste)) throw new GameError("invalid_input");
    return createCharacter({
      lang: await pageLang(),
      name: input.name,
      origin: input.origin,
      taste: input.taste,
      aliases: input.aliases,
    });
  });
}

/** A nickname for a character in `lang`; the new nickname's id. */
export async function giveNickname(
  characterId: string,
  lang: string,
  name: string,
): Promise<Result<number>> {
  return run(async () => {
    await paced("nickname", 20);
    return addNickname(characterId, langOf(lang, await pageLang()), name);
  });
}

export async function editNickname(id: number, name: string): Promise<Result> {
  return run(async () => {
    await paced("nickname", 20);
    await changeNickname(id, "edit", name);
  });
}

export async function removeNickname(id: number): Promise<Result> {
  return run(async () => {
    await paced("nickname", 20);
    await changeNickname(id, "remove", null);
  });
}

export async function restoreNickname(id: number): Promise<Result> {
  return run(async () => {
    await paced("nickname", 20);
    await changeNickname(id, "restore", null);
  });
}

/** Whether the nickname is hidden after this report. */
export async function reportNicknameAction(
  id: number,
): Promise<Result<boolean>> {
  return run(async () => {
    await paced("report", 10);
    return reportNickname(id);
  });
}
