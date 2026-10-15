"use server";
import type { LabScene } from "@/features/lab/scene";
import type { LabKit, LabSettings } from "@/features/lab/sim";
import type { RoomState } from "@/game/types";
// The control panel's changes. Every one checks the admin first (adminOnly),
// whatever page it came from.
import { GameError } from "@/game/types";
import type { BankKind, CharacterPatch } from "../backend/admin-types";
import type { LibraryPage, LibrarySort } from "../community-contract";
import { fail, ok, type Result, type Role } from "../contract";
import { approve, markReview, refuse, reopen } from "../workshop";
import { restoreVersion, saveTunes } from "./config";
import { setBankLive } from "./games";
import { deleteLabScene, labKit, labRoom, saveLabScene } from "./lab";
import {
  type CharacterFile,
  characterFile,
  editCharacter,
  hiddenCharacters,
  libraryPage,
  nicknameHidden,
  originList,
  pictureStatus,
} from "./library";
import {
  lift,
  type PersonFile,
  personFile,
  type SanctionInput,
  sanction,
  setRole,
} from "./people";
import { closeIdleRooms } from "./rooms";
import { type SuggestionFile, suggestionFile } from "./workshop";

async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await work());
  } catch (e) {
    if (e instanceof GameError) return fail(e.code);
    console.error("[admin]", e);
    return fail("unknown");
  }
}

/** Saves the tunable values as a new config version. */
export async function saveConfigAction(
  tunes: Record<string, unknown>,
  note: string,
): Promise<Result<number>> {
  return run(() => saveTunes(tunes, note));
}

/** Publishes an old config version again. */
export async function restoreConfigAction(v: number): Promise<Result<number>> {
  return run(() => restoreVersion(v));
}

/** Puts a theme, question, mission or extra on or off (never deletes it). */
export async function setBankLiveAction(
  kind: BankKind,
  id: string,
  live: boolean,
): Promise<Result<void>> {
  return run(() => setBankLive(kind, id, live));
}

/** What a real start would deal for a lab match. */
export async function labKitAction(s: LabSettings): Promise<Result<LabKit>> {
  return run(() => labKit(s));
}

/** A real room's state, to play on from in the lab. */
export async function labRoomAction(code: string): Promise<Result<RoomState>> {
  return run(() => labRoom(code));
}

/** Saves the lab's moment as a scene; its id. */
export async function saveLabSceneAction(
  scene: LabScene,
  name: string,
  note: string,
): Promise<Result<string>> {
  return run(() => saveLabScene(scene, name, note));
}

export async function deleteLabSceneAction(id: string): Promise<Result<void>> {
  return run(() => deleteLabScene(id));
}

/** Everything the person drawer shows. */
export async function personAction(id: string): Promise<Result<PersonFile>> {
  return run(() => personFile(id));
}

/** Warns, mutes, bans or archives a person's reports; the sanction's id. */
export async function sanctionAction(
  input: SanctionInput,
): Promise<Result<number>> {
  return run(() => sanction(input));
}

/** Lifts a ban or a mute. */
export async function liftAction(
  id: number,
  person: string,
): Promise<Result<void>> {
  return run(() => lift(id, person));
}

/** Makes an account a player or a curator. */
export async function setRoleAction(
  id: string,
  role: Role,
): Promise<Result<void>> {
  return run(() => setRole(id, role));
}

/** One Workshop suggestion, for its drawer. */
export async function suggestionAction(
  id: string,
): Promise<Result<SuggestionFile | null>> {
  return run(() => suggestionFile(id));
}

/** Decides a suggestion: live (its four languages), in review, left out (why), or back to the vote. */
export async function decideAction(
  id: string,
  to: "live" | "review" | "refused" | "voting",
  extra: { translations?: unknown; reason?: string },
): Promise<Result<void>> {
  return run(async () => {
    if (to === "live") await approve(id, extra.translations ?? {});
    else if (to === "review") await markReview(id);
    else if (to === "refused") await refuse(id, extra.reason ?? "");
    else await reopen(id);
  });
}

/** A page of the library's characters. */
export async function libraryPageAction(input: {
  q: string;
  taste: string | null;
  sort: LibrarySort;
  offset: number;
}): Promise<Result<LibraryPage>> {
  return run(() => libraryPage(input));
}

/** A character and all its pictures. */
export async function characterAction(
  id: string,
): Promise<Result<CharacterFile>> {
  return run(() => characterFile(id));
}

/** Lets a picture through, hides it or brings it back. */
export async function pictureAction(
  id: string,
  to: "active" | "hidden",
): Promise<Result<void>> {
  return run(() => pictureStatus(id, to));
}

/** Closes the rooms with nothing happening for 30 minutes; how many. */
export async function closeIdleAction(): Promise<Result<number>> {
  return run(() => closeIdleRooms());
}

/** Changes a character: hide it, its kind, category, tastes, work, names. */
export async function editCharacterAction(
  id: string,
  patch: CharacterPatch,
): Promise<Result<void>> {
  return run(() => editCharacter(id, patch));
}

/** The characters taken out of the library. */
export async function hiddenCharactersAction(): Promise<
  Result<{ id: string; name: string }[]>
> {
  return run(() => hiddenCharacters());
}

/** The library's works. */
export async function originsAction(): Promise<
  Result<{ id: string; label: string }[]>
> {
  return run(() => originList());
}

/** Hides or brings back a player's nickname. */
export async function nicknameAction(
  id: number,
  hidden: boolean,
): Promise<Result<void>> {
  return run(() => nicknameHidden(id, hidden));
}
